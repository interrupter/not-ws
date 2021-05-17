const EventEmitter = require('events');
const JWT = require('jsonwebtoken');
const CONST = require('./const.js');
const LOG = require('./log.js');

const SYMBOL_ACTIVITY = Symbol('activity');
const SYMBOL_STATE = Symbol('state');
const TIME_OFFSET_REQUEST_INTERVAL = 5 * 60 * 1000;
const MAX_HISTORY_DEPTH = 40;
const DEFAULT_OPTIONS = {
	//нужно ли проходить аутентификацию для зачета соединения как активного
	secure: false
};

/**
 *  Инкапсулирует обработку соединения пользователя
 *
 */

class notWSServerClient extends EventEmitter {
	constructor({
		socket,
		ip,
		credentials,
		options,
		messenger, //экземпляр notWSMessage подобного класса, с упаковщиками нужного типа,
		router,
		logger,
		state
	}) {
		super();
		//basic params
		this.ws = socket;
		this.ws.ip = ip;
		this.ip = ip;
		this.credentials = credentials;
		this.messenger = messenger;
		this.router = router;
		this.options = Object.assign({}, DEFAULT_OPTIONS, options);
		this.__name = (this.options && Object.prototype.hasOwnProperty.call(this.options, 'name')) ? this.options.name : CONST.DEFAULT_CLIENT_NAME;
		//common constructor part for client browser client, node client, node server client
		//logging
		this.logMsg = logger?logger.log:LOG.genLogMsg(this.__name);
		this.logDebug = logger?logger.debug:LOG.genLogDebug(this.__name);
		this.logError = logger?logger.error:LOG.genLogError(this.__name);
		//requests processing
		this.requests = []; //Список текущих запросов к API.
		this.reqTimeout = 15000; //Таймаут для выполнения запросов.
		this.reqChkTimer = null; //Таймер для проверки таймаутов выполнения запросов.
		this.reqChkStep = 2000; //Таймер для проверки таймаутов выполнения запросов.

		//if was terminated
		this.isTerminated = false;
		this.connectTimeout = null;
		this.pingInt = null; //дескриптор интервала пинг запросов к TMS
		this.isAlive = true; //результат пинг запросов
		this.isReconnecting = false;
		this.closing = false;
		//
		this.heartbeatTimeout = null;
		//connection state and current activity
		if(state === 'online'){
			this[SYMBOL_STATE] = CONST.STATE.CONNECTED;
		}else{
			this[SYMBOL_STATE] = CONST.STATE.NOT_CONNECTED;
		}

		this[SYMBOL_ACTIVITY] = CONST.ACTIVITY.IDLE;
		//time off set from server time
		this._timeOffset = 0;
		this.getTimeOffsetInt = null;
		//events binding to client socket
		this.listeners = {
			open: this.onWSOpen.bind(this),
			message: this.onWSMessage.bind(this),
			close: this.onWSClose.bind(this),
			error: this.onWSError.bind(this)
		};
		this.ws.on('open', this.onWSOpen.bind(this));
		this.ws.on('message', this.onWSMessage.bind(this));
		this.ws.on('close', this.onWSClose.bind(this));
		this.ws.on('pong', this.onWSPong.bind(this));
		this.ws.on('error', this.onWSError.bind(this));
		//message history
		this.history = {};
		return this;
	}

	onWSOpen() {
		this.emit('open', this);
	}

	onWSMessage(message) {
		try{
			//проверяем не "понг" ли это, если так - выходим
			if(message === 'ping'){
				//this.logDebug('in ping');
				this.ws.send('pong');
				return;
			}
			let data = LOG.tryParseJSON(message);
			//Не удалось распарсить ответ от сервера как JSON
			if(!data){
				this.logMsg(`получено сообщение от сервера: ${message}`);
				throw new Error('Message is not JSON!');
			}
			this.messenger.validate(data);
			let msg = this.messenger.unpack(data);
			this.emit('message', msg, this);
			if(msg.service.type === CONST.MSG_TYPE.RESPONSE){
				let request = this.fullfillRequest(msg.service.id);
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
						this.respond({}, {id: msg.service.id}, e);
					});
			}
		}catch(e){
			this.logError(e, e.details);
			if(e.message === CONST.ERR_MSG.MSG_CREDENTIALS_IS_NOT_VALID){
				this.informClientAboutExperiedToken();
			}
		}
	}

	/**
	*	Proxy for WebSocket event
	*/
	onWSPong(){
		//this.logDebug('in pong');
		this.emit('pong');
	}

	onWSError(err) {
		let msg = (!err.message) ? 'unknown error' : err.message;
		this.logMsg(`ошибка: ${msg}`);
		if (this.activity === CONST.ACTIVITY.TERMINATING) {
			this.state = CONST.STATE.NOT_CONNECTED;
		} else {
			this.state = CONST.STATE.ERRORED;
		}
	}

	onWSClose(event) {
		if (typeof event.code !== 'undefined') {
			let reason = `${event.code}::` + CONST.mapWsCloseCodes(event);
			this.logMsg(event);
			this.logMsg(`подключение разорвано: ${reason}`);
		} else {
			if (!isNaN(event)) {
				this.logError(`подключение разорвано: ` + CONST.mapWsCloseCodes(event));
			} else {
				this.logMsg('подключение закрыто. причина:', event);
			}
			this.logMsg(CONST.STATE_NAME[this.state] + '/' + CONST.ACTIVITY_NAME[this.activity]);
		}
		if (this.activity === CONST.ACTIVITY.CLOSING) {
			this.state = CONST.STATE.NOT_CONNECTED;
		} else {
			this.state = CONST.STATE.ERRORED;
		}
	}

	suicide() {
		this.emit('errored', this);
	}

	disconnect() {
		this.logMsg(`Отключение от клиента...`);
		this.stopReqChckTimer();
		this.terminate();
	}

	terminate() {
		if (this.ws) {
			this.activity = CONST.ACTIVITY.TERMINATING;
			for (let name in this.listeners) {
				this.ws.removeListener(name, this.listeners[name]);
			}
			this.ws.terminate && this.ws.terminate();
		}
		this.isTerminated = true;
		this.ws = null;
		if(this.state!==CONST.STATE.NOT_CONNECTED){
			this.state = CONST.STATE.NOT_CONNECTED;
		}

	}

	isDead() {
		return this.isTerminated;
	}

	/*
	 * will initiate connection in timeout ms
	 */
	scheduleConnect(timeout = 1000) {
		this.logMsg('Schedule attempt to connect in ' + timeout + 'ms');
		if (this.connectTimeout) {
			//this.logDebug('Clearing existing scheduled connection attempt');
			clearTimeout(this.connectTimeout);
			this.connectTimeout = null;
		}
		this.connectTimeout = setTimeout(this.sche, timeout);
	}

	reconnect(ms = 0) {
		if ([CONST.ACTIVITY.CONNECTING].indexOf(this.activity) > -1) {
			this.logDebug('Reconnect prevented - already in concurent activity: ' + CONST.ACTIVITY[this.activity]);
			return;
		} else {
			let rct = ms || ((this.connCount >= this.connCountMax) ? 30000 : 5000);
			this.scheduleConnect(rct);
		}
	}

	__reconnectToSchedule(){
		if(this.isSecure()){
			if(this.credentialsIsValid()){
				this.connect().catch(this.logError.bind(this));
			}else{
				if(LOG.isFunc(this.options.getCredentials)){
					this.options.getCredentials()
						.then((credentials) => {
							this.setCredential(credentials);
							return this.connect();
						})
						.catch(this.logError.bind(this));
				}else{
					this.logError('No valid credentials and no way to get them.');
				}
			}
		}else{
			this.connect().catch(this.logError.bind(this));
		}
	}

	/**
	 *  Требуется аутентификация или нет
	 */
	isSecure() {
		return !!this.options.secure;
	}

	/**
	 *  Подключены ли, если требуется аутентификация, это учитывается
	 */
	isConnected(secure = true) {
		let state = CONST.STATE.CONNECTED;
		if (this.isSecure() && secure) {
			state = CONST.STATE.AUTHORIZED;
		}
		return (this.state === state) && (this.ws.readyState === 1); // 1- OPEN
	}

	get state() {
		return this[SYMBOL_STATE];
	}

	set state(state = CONST.STATE.NOT_CONNECTED) {
		if (Object.values(CONST.STATE).indexOf(state) > -1) {
			this.logDebug('Changing state to ' + CONST.STATE_NAME[state]);
			//для каждого варианта, есть только ограниченное кол-во вариантов перехода
			//из "нет соединения" в "авторизован" не прыгнуть
			switch (this[SYMBOL_STATE]) {
			//можем только подключиться или вылететь с ошибкой подключения
			case CONST.STATE.NOT_CONNECTED:
				if ([CONST.STATE.CONNECTED, CONST.STATE.ERRORED].indexOf(state) > -1) {
					this[SYMBOL_STATE] = state;
					this.activity = CONST.ACTIVITY.IDLE;
				} else {
					throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
				}
				break;
				//можем повиснуть, авторизоваться вылететь с ошибкой
			case CONST.STATE.CONNECTED:
				if (
					[
						CONST.STATE.AUTHORIZED,
						CONST.STATE.NO_PING,
						CONST.STATE.ERRORED,
						CONST.STATE.NOT_CONNECTED
					].indexOf(state) > -1) {
					this[SYMBOL_STATE] = state;
					this.activity = CONST.ACTIVITY.IDLE;
				} else {
					throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
				}
				if (state === CONST.STATE.AUTHORIZED) {
					if (this.getTimeOffsetInt) {
						clearInterval(this.getTimeOffsetInt);
						this.getTimeOffsetInt = null;
					}
					this.requestServerTime();
					this.getTimeOffsetInt = setInterval(this.requestServerTime.bind(this), TIME_OFFSET_REQUEST_INTERVAL);
				}
				break;
				//можем потерять авторизацию, но продолжить висеть на линии
				//повиснуть
				//вылететь с ошибкой связи
			case CONST.STATE.AUTHORIZED:
				if (
					[
						CONST.STATE.CONNECTED,
						CONST.STATE.NO_PING,
						CONST.STATE.ERRORED,
						CONST.STATE.NOT_CONNECTED
					].indexOf(state) > -1) {
					this[SYMBOL_STATE] = state;
					this.activity = CONST.ACTIVITY.IDLE;
				} else {
					throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
				}
				break;
				////из остояний разрыва связи, можно уйти только в "не подключен"
				//можем только отключиться
			case CONST.STATE.NO_PING:
				if ([CONST.STATE.NOT_CONNECTED].indexOf(state) > -1) {
					this[SYMBOL_STATE] = state;
					this.activity = CONST.ACTIVITY.IDLE;
				} else {
					throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
				}
				break;
				//можем только отключиться
			case CONST.STATE.ERRORED:
				if ([
					CONST.STATE.NOT_CONNECTED,
					CONST.STATE.ERRORED
				].indexOf(state) > -1) {
					this[SYMBOL_STATE] = state;
					this.activity = CONST.ACTIVITY.IDLE;
				} else {
					throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
				}
				break;
			}
			if ([CONST.STATE.ERRORED, CONST.STATE.NO_PING].indexOf(state) > -1) {
				this.logDebug('State: ' + CONST.STATE_NAME[state] + ', disconnecting in 100ms');
				setTimeout(this.disconnect.bind(this), 100);
			}
			//если идём на обрыв, то переподключение не запускаем
			if ((CONST.STATE.NOT_CONNECTED === state) && (!this.isDead())) {
				this.logDebug('State: ' + CONST.STATE_NAME[state] + '; Activity: ' + CONST.ACTIVITY_NAME[this.activity] + ', reconnecting');
				this.reconnect();
			}
			return true;
		} else {
			throw new Error('set: Unknown notWSServerClient state: ' + state);
		}
	}

	get activity() {
		return this[SYMBOL_ACTIVITY];
	}

	//
	/*
IDLE: 0,
//идёт подключение
CONNECTING: 1,
//закрытие соединения
CLOSING: 2,
//разрыв соединения
TERMINATING: 3,
//авторизация по токену
AUTHORIZING: 4
*/
	set activity(activity = CONST.ACTIVITY.IDLE) {
		if (Object.values(CONST.ACTIVITY).indexOf(activity) > -1) {
			this.logDebug('Changing activity to ' + CONST.ACTIVITY_NAME[activity]);
			//для каждого варианта, есть только ограниченное кол-во вариантов перехода
			//из "нет соединения" в "авторизован" не прыгнуть
			switch (this[SYMBOL_ACTIVITY]) {
			//можем только подключиться
			case CONST.ACTIVITY.IDLE:
				if ([
					CONST.ACTIVITY.CONNECTING,
					CONST.ACTIVITY.CLOSING,
					CONST.ACTIVITY.TERMINATING,
					CONST.ACTIVITY.AUTHORIZING
				].indexOf(activity) > -1) {
					this[SYMBOL_ACTIVITY] = activity;
				}
				break;
			case CONST.ACTIVITY.CONNECTING:
			case CONST.ACTIVITY.CLOSING:
			case CONST.ACTIVITY.TERMINATING:
			case CONST.ACTIVITY.AUTHORIZING:
				if ([CONST.ACTIVITY.IDLE].indexOf(activity) > -1) {
					this[SYMBOL_ACTIVITY] = activity;
				}
				break;
			}
			return true;
		} else {
			throw new Error('set: Unknown notWSServerClient activity: ' + activity);
		}
	}

	requestServerTime() {
		if (this.isConnected()) {
			let req = {
				cmd: 'getTime',
				data: {}
			};
			const sendTime = Date.now();
			this.request(req, (err, result) => {
				if (err) {
					this.logError(err);
				} else {
					const receiveTime = Date.now();
					const correction = Math.round((receiveTime - sendTime) / 2);
					const serverTime = parseInt(result, 10);
					const correctedTime = serverTime + correction;
					const offset = correctedTime - receiveTime;
					this.timeOffset = offset;
				}
			});
		}
	}

	set timeOffset(val) {
		this._timeOffset = val;
	}

	get timeOffset() {
		return this._timeOffset;
	}


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

	fullfillRequest(id){
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


	getCredentials() {
		return this.options.credentials;
	}

	setCredentials(val = null) {
		this.options.credentials = val;
		this.emit('credentialsUpdate', val);
		return this;
	}

	credentialsIsValid(){
		return new Promise((resolve, reject)=>{
			let cred = this.getCredentials();
			JWT.verify(cred, this.options.credentials.key, (err, decoded)=>{
				if(err){
					reject(err);
				}else{
					if(typeof decoded !== 'undefined'){
						resolve(true);
					}else{
						reject(new Error('Decoded token is undefined'));
					}
				}
			});
		});
	}

	onAfterValidation(err, decoded){
		if(err){
			return false;
		}else if(typeof decoded !== 'undefined' && decoded !== null){
			return true;
		}else{
			return false;
		}
	}

	/**
	 * Отправка сообщения TMS
	 * @param  {object|string} данные в виде
	 *                         - строки, будут обернуты в соотвествии со спецификацией
	 *                         - объекта, будут переданы без изменений
	 * @return {Promise} resolve - удачно, reject - сбой
	 */
	sendMsg(data, secure) {
		//Проверяем что клиент подключен
		return new Promise((resolve, reject) => {
			try {
				if (this.isConnected(secure)) {
					//Пытаемся отправить сообщение клиенту.
					//eslint-disable-next-line no-console
					//console.log(data);
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
					this.addToHistory(data);
					resolve();
				}
			} catch (e) {
				this.state = CONST.STATE.ERRORED;
				reject(e);
			}
		});
	}

	respond(resp, service = {}, error){
		if(typeof resp === 'object' && resp !== null){
			let msg = this.messenger.pack(resp, service, error);
			return this.sendMsg(msg);
		}else{
			return true;
		}
	}

	addToHistory(data) {
		let type = this.messenger.getServiceData(data).type;
		this.logDebug('Adding message to history...', type);
		if (!Array.isArray(this.history[type])) {
			this.history[type] = [];
		}
		this.history[type].push(data);
		if (this.history[type].length > MAX_HISTORY_DEPTH) {
			this.history[type].shift();
		}
	}

	sendAllFromHistory() {
		for (let type in this.history) {
			while (this.history[type].length) {
				let msg = this.history[type].shift();
				this.sendMsg(msg).catch(this.logError.bind(this));
			}
		}
	}

	__request(name, payload, cb, secure = true) {
		let message = this.messenger.pack(payload, {
			type: CONST.MSG_TYPE.REQUEST,
			timeOffset: this.timeOffset,
			name,
		});
		this.addRequest(this.messenger.getServiceData(message).id, cb);
		this.sendMsg(message, secure).catch(this.logError.bind(this));
	}

	sendRequest(name, payload, secure = true) {
		return new Promise((resolve, reject) => {
			try {
				this.__request(name, payload, (response) => {
					if (response === CONST.ERR_MSG.REQUEST_TIMEOUT_MESSAGE) {
						return reject(response);
					}
					if (this.messenger.validate(response)) {
						if (this.messenger.isErrored(response)) {
							return reject(response);
						}
					}
					resolve(response);
				}, secure);
			} catch (e) {
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
	send(type, name, payload, secure = true){
		if(type === CONST.MSG_TYPE.REQUEST){
			return this.sendRequest(name, payload,secure);
		}else{
			return this.sendMessage(type, name, payload,secure);
		}
	}

	sendMessage(type, name, payload, secure = true){
		let message = this.messenger.pack(payload, {
			type,
			timeOffset: this.timeOffset,
			name,
		});
		return this.sendMsg(message, secure).catch(this.logError.bind(this));
	}

	ping(){
		if(this.ws){
			//this.logDebug('out ping');
			this.ws.ping(CONST.noop);
		}
	}

	informClientAboutExperiedToken(){
		this.logMsg('force to update token');
		this.send('__service', 'updateToken', {}, false).catch(this.logError.bind(this));
	}
}

module.exports = notWSServerClient;
