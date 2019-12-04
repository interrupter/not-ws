//imports


const WebSocket    = require('ws');
const EventEmitter = require('events');
const CONST = require('./const.js');
const LOG = require('./log.js');
const notWSRouter = require('./router.js');
const notWSMessenger = require('./messenger.js');





//options:
// - host       - Адрес сервиса
// - port       - Порт сервиса
// - doLogout   - Метод выхода из системы.
// - fcCallback - коллбэк вызываемый при первом подключении

class notWSClient extends EventEmitter{
	constructor({
		options,
		messenger,
		router
	}){
		super();
		let logger = options.logger;
		//Основные параметры
		this.options = options; //Параметры клиентского подключения
		this.__name = options.name?options.name:'WSClient';
		//Подключение к WS service TMA
		this.ws         	= null; //Подключение к websocket серверу.
		this.connCount    = 0;    //Количество неудачных попыток подключения к websocket серверу.
		this.connCountMax = 10;   //Количество попыток по превышении которого считаем что соединение с серверов разорвано.
		this.errConnMsg   = null; //Идентификатор сообщения об ошибке подключения к вебсокет серверу.
		this.firstConn    = true;
		this.messenger		= messenger?messenger: new notWSMessenger(options.messenger?options.messenger:{});
		this.router				= router?router: new notWSRouter(options.router?options.router:{});
		this.router.on('updateToken', this.renewToken.bind(this));
		this.jwtToken     = null; //Токен авторизации.
		this.jwtExpire    = null; //Время до истечения токена.
		this.jwtDate      = null; //Дата создания токена.

		//logging
		this.logMsg = logger?logger.log:LOG.genLogMsg(this.__name);
		this.logDebug = logger?logger.debug:LOG.genLogDebug(this.__name);
		this.logError = logger?logger.error:LOG.genLogError(this.__name);
		//requests processing
		this.requests = []; //Список текущих запросов к API.
		this.reqTimeout = 15000; //Таймаут для выполнения запросов.
		this.reqChkTimer = null; //Таймер для проверки таймаутов выполнения запросов.
		this.reqChkStep = 2000; //Таймер для проверки таймаутов выполнения запросов.


		this.connect();
	}

	//Отключение от ws сервиса.
	disconnect(){
		this.logMsg(`Отключение от сервера...`);
		if(this.ws){
			//заменяем метод для onclose на пустую функцию.
			this.ws.on('close', CONST.noop);
			//закрываем подключение.
			this.ws.close();
			this.ws.removeAllListeners();
			this.stopReqChckTimer();
		}else{
			//eslint-disable-next-line no-console
			console.trace();
		}
	}


	//Получение токена.
	//Возможно реализовать разными способами, поэтому выделено в отдельный метод.
	getToken(){
		if(LOG.isFunc(this.options.getToken)){
			return this.options.getToken();
		}else{
			return Promise.reject();
		}
	}

	async renewToken(){
		try{
			let token = await this.getToken(true);
			if(token){
				this.saveToken(token);
			}else{
				throw new Error('Token isn\'t renewed');
			}
		}catch(e){
			this.logError(e);
		}
	}

	saveToken(token){
		this.jwtToken = token;
		this.messenger.setCredentials(token);
		this.emit('tokenUpdated', token);
	}

	//набор методов для работы с запросами и выявления безответных
	
	//Запуск таймера проверки запросов.
	startReqChckTimer() {
		clearTimeout(this.reqChkTimer);
		this.reqChkTimer = setTimeout(this.checkRequests.bind(this), this.reqChkStep);
	}

	stopReqChckTimer() {
		clearTimeout(this.reqChkTimer);
	}

	//Поиск запроса по uuid
	findRequest(id) {
		for (let i = 0; i < this.requests.length; i++) {
			if (this.requests[i].id === id) {
				return i;
			}
		}
		return false;
	}

	extortRequest(id){
		let reqIndex = this.findRequest(id);
		if(reqIndex === false) {
			this.logMsg(`failed to find request for response ${id}`);
			return null;
		}
		let request = this.requests[reqIndex];
		//Удаление элемента из списка запросов.
		this.requests.splice(reqIndex, 1);
		//Выполнение callback'а запроса.
		if(LOG.isFunc(request.cb)) {
			return request;
		} else {
			return null;
		}
	}

	addRequest(id, callback) {
		this.requests.push({
			id, //Идентификатор запроса.
			time: Date.now(), //Время отправки запроса.
			cb: callback //callback для обработки результатов запроса.
		});
	}

	//Проверка списка запросов.
	checkRequests() {
		//Формирование списка запросов для удаления по таймауту.
		let list = [];
		let now = Date.now();
		this.requests.forEach((req) => {
			let reqAge = now - req.time;
			if (reqAge > this.reqTimeout) {
				list.push(req.id);
			}
		});
		//Удаление запросов по таймауту.
		list.forEach((reqId) => {
			let reqIndex = this.findRequest(reqId);
			if (reqIndex === false) {
				this.logMsg(`timeout check:failed to find request for response ${reqId}`);
				return;
			}
			let request = this.requests[reqIndex];
			if (LOG.isFunc(request.cb)) {
				request.cb(CONST.ERR_MSG.REQUEST_TIMEOUT);
			} else {
				this.logMsg(`timeout check:Не задан callback для запроса с id: ${reqId}`);
			}
			this.requests.splice(reqIndex, 1);
		});
	}


	//Обработчик сообщений пришедших от сервера.
	//msg - это messageEvent пришедший по WS, соответственно данные лежат в msg.data.
	onMessage(rawMsg){
		try{
			this.logDebug(rawMsg);
			//проверяем не "понг" ли это, если так - выходим
			if(this.checkPingMsg(rawMsg)){
				return;
			}
			let data = LOG.tryParseJSON(rawMsg);
			//Не удалось распарсить ответ от сервера как JSON
			if(!data){
				this.logMsg(`получено сообщение от сервера:${rawMsg}`);
				return;
			}
			this.messenger.validate(data);
			let msg = this.messenger.unpack(data);
			if(msg.service.type === CONST.MSG_TYPE.RESPONSE){
				let request = this.extortRequest(msg.service.id);
				if(request !== null){
					request.cb(msg);
				}
			}else if(msg.service.type === CONST.MSG_TYPE.EVENT){
				this.emit('remote.' + msg.service.name, msg.service, msg.payload, this.ws);
			}else{
				this.router.route(msg.service, msg.payload, this.ws)
					.then((responseData)=>{
						this.respond(responseData, {id: msg.service.id, type: CONST.MSG_TYPE.RESPONSE, name: msg.service.name});
					})
					.catch((e)=>{
						this.logError(e);
						this.respond({}, {id: msg.service.id, type: CONST.MSG_TYPE.RESPONSE, name: msg.service.name}, e);
					});
			}
		}catch(e){
			this.logError(e);
		}
	}

	//Подключение к websocket сервису.
	async connect(){
		try{
			if(this.ws && (this.ws.readyState !== WebSocket.CLOSED)){
				this.disconnect();
			}
			this.isAlive = true;
			this.logMsg(`Подключение к WebSocket серверу...`);
			//Счётчик колиества попыток подключения:
			this.connCount++;
			//Загружаем информацию о токене и пытаемся подключиться к вебсокет сервису.
			if(this.isSecure()){
				this.saveToken(await this.getToken());
			}
			let connURI = this.getConnectURI();
			this.logMsg('Connecting to: ', connURI);
			this.ws = new WebSocket(connURI);
			this.ws.on('open', this.onOpen.bind(this));
			this.ws.on('error', this.onError.bind(this));
		}catch(e){
			//eslint-disable-next-line no-console
			this.logError(e);
			this.scheduleReconnect();
		}
	}

	onOpen(){
		this.logMsg('Установлено подключение к WebSocket серверу.');
		//Сбрасываем счётчик количества попыток подключения и данные об ошибках.
		this.connCount = 0;
		this.isAlive = true;
		clearInterval(this.connectTimeout);
		this.connectTimeout = false;
		this.errConnMsg = null;
		this.ws.on('message', this.onMessage.bind(this));
		this.ws.on('close', this.onClose.bind(this));
		//Запускаем таймер проверки списка запросов.
		this.startReqChckTimer();
		this.initPing();
		this.emit('ready');
	}

	onError(err){
		if(this.connectTimeout){
			clearInterval(this.connectTimeout);
			this.connectTimeout = false;
		}
		this.logError(err);
		this.scheduleReconnect();
	}

	//Обработчик закрытия подключения.
	onClose(event){
		let reason = `${event.code}::` + CONST.mapWsCloseCodes(event);
		this.logMsg(`подключение разорвано: ${reason}`);
		if(this.isAutoReconnect()){
			this.scheduleReconnect();
		}
		this.stopReqChckTimer();
	}

	getConnectURI(){
		let base = `ws://${this.options.host}:${this.options.port}/${this.options.path}`;
		if(this.isSecure()){
			return `${base}?token=${this.jwtToken}`;
		}else{
			return base;
		}
	}

	getReconnectTimeout(){
		if(this.connCount >= this.connCountMax){
			return CONST.CLIENT_RECONNECT_TIMEOUT_LONG;
		} else {
			return CONST.CLIENT_RECONNECT_TIMEOUT;
		}
	}

	scheduleReconnect(){
		let timeout = this.getReconnectTimeout();
		this.logMsg(`Планируем переподключение каждые ${timeout}мс`);
		this.connectTimeout = setInterval(
			()=>{
				if(this.isAlive === false){
					if(this.ws.readyState === this.ws.CLOSED){
						this.connect();
					}
				}
			},
			timeout
		);
	}

	/**
	 *  Требуется аутентификация или нет
	 */
	isSecure() {
		return this.options.secure;
	}

	isAutoReconnect(){
		if (typeof this.options.autoReconnect !== 'undefined'){
			return this.options.autoReconnect;
		}else{
			return CONST.CLIENT_AUTO_RECONNECT;
		}
	}

	initPing(){
		if(this.options.ping){
			if(this.intPing){
				clearInterval(this.intPing);
				this.intPing = false;
			}
			this.intPing = setInterval(this.sendPing.bind(this), this.options.pingTimeout || CONST.PING_TIMEOUT);
		}
	}

	sendPing(){
		this.logDebug('out ping', this.isAlive);
		if(this.isAlive === false){
			this.logMsg('Connection is not alive (no pong). Terminating');
			this.disconnect();
			this.scheduleReconnect();
			return;
		}
		this.isAlive = false;
		this.ws.send('ping');
	}

	checkPingMsg(msg){
		if (msg === 'pong'){
			this.logDebug('in pong');
			this.isAlive = true;
			return true;
		}
		return false;
	}

	respond(resp, service = {}, error){
		if(resp && typeof resp === 'object' && resp !== null){
			let msg = this.options.messenger.pack(resp, service, error);
			return this.sendMsg(msg);
		}else{
			return true;
		}
	}

	isConnected(){
		return this.ws && this.isAlive;
	}

	/**
	 * Отправка сообщения TMS
	 * @param  {object|string} данные в виде
	 *                         - строки, будут обернуты в соотвествии со спецификацией
	 *                         - объекта, будут переданы без изменений
	 * @return {Promise} resolve - удачно, reject - сбой
	 */
	sendMsg(data) {
		//Проверяем что клиент подключен
		return new Promise((resolve, reject) => {
			try {
				if (this.isConnected()) {
					//Пытаемся отправить сообщение клиенту.
					//eslint-disable-next-line no-console
					console.log('send message',data);
					this.ws.send(JSON.stringify(data), (err) => {
						if (err) {
							this.state = CONST.STATE.ERRORED;
							reject(err);
						} else {
							resolve();
						}
					});
				} else {
					this.logDebug('Failed to send message to ws client, connection is in state: ' + CONST.STATE_NAME[this.state] + '!');
					//this.addToHistory(data);
					resolve();
				}
			} catch (e) {
				this.state = CONST.STATE.ERRORED;
				reject(e);
			}
		});
	}

	/**
	*	Отправка данных определенного типа и названия
	*	@param {string}	type	тип данных
	*	@param {string}	name	название
	*	@param {object}	payload	данные
	*	@returns	{Promise}
	*/
	send(type, name, payload){
		if(type === CONST.MSG_TYPE.REQUEST){
			return this.sendRequest(name, payload);
		}else{
			return this.sendMessage(type, name, payload);
		}
	}

	sendMessage(type, name, payload){
		this.logDebug('message',type, name, payload);
		let message = this.messenger.pack(payload, {
			type,
			timeOffset: this.timeOffset,
			name,
		});
		return this.sendMsg(message).catch(this.logError.bind(this));
	}

	//Отправка запроса на сервер.
	sendRequest(name, payload){
		this.logDebug('request', name, payload);
		return new Promise((res, rej)=>{
			try{
				//Формирование данных запроса.
				let req = this.messenger.pack(payload, {
					type: 'request',
					timeOffset: this.timeOffset,
					name,
				});
				//Добавление запроса в список отправленных запросов.
				this.addRequest(this.messenger.getServiceData(req).id, res);
				//Отправка запроса на сервер.
				this.ws.send(JSON.stringify(req));
			}catch(e){
				this.logError(e);
				rej(e);
			}
		});
	}
}

module.exports = notWSClient;


