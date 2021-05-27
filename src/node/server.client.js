const EventEmitter = require('events');
const JWT = require('jsonwebtoken');
const CONST = require('./const.js');
const Func = require('./func.js');

const notWSConnection = require('./connection.js');

const TIME_OFFSET_REQUEST_INTERVAL = 5 * 60 * 1000;
/**
 *  Инкапсулирует обработку соединения пользователя
 *
 **/

class notWSServerClient extends EventEmitter {
	constructor({
		name,
		identity,					//user information
		credentials,			//client creds for access
		connection,				//{ws, ip, secure, state}
		messenger, 				//экземпляр notWSMessage подобного класса, с упаковщиками нужного типа,
		router,
		logger
	}) {
		super();
		//basic params
		this.__name = name ? name : CONST.DEFAULT_CLIENT_NAME;
		this.identity = identity;
		this.credentials = credentials;
		this.initConnection(connection);
		this.messenger = messenger;
		this.router = router;
		//common constructor part for client browser client, node client, node server client
		//logging
		this.logMsg = logger?logger.log:()=>{};
		this.logDebug = logger?logger.debug:()=>{};
		this.logError = logger?logger.error:()=>{};
		//requests processing
		this.requests = []; //Список текущих запросов к API.
		this.reqTimeout = 15000; //Таймаут для выполнения запросов.
		this.reqChkTimer = null; //Таймер для проверки таймаутов выполнения запросов.
		this.reqChkStep = 2000; //Таймер для проверки таймаутов выполнения запросов.
		//time off set from server time
		this._timeOffset = 0;
		this.getTimeOffsetInt = null;
		//message history if in online
		this.history = [];

		return this;
	}

	initConnection(connection){
		this.connection = new notWSConnection(connection);
		this.connection.on('disconnected', ()=>{
			this.logMsg('dicconnected');
			this.stopReqChckTimer();
			this.emit('close', this);
		});
		this.connection.on('connected', ()=>{
			this.logMsg('connected');
			//Запускаем таймер проверки списка запросов.
			this.startReqChckTimer();
			this.emit('open', this);
		});
		this.connection.on('connectURI', (e)=>{this.logMsg('connectURI', e);});
		this.connection.on('close', (e)=>{this.logMsg('close', e);});
		this.connection.on('error', (e)=>{
			this.logError(e);
		});
		this.connection.on('message', this.processMessage.bind(this));
	}

	processMessage(data) {
		try{
			this.messenger.validate(data);
			let msg = this.messenger.unpack(data);
			this.emit('message', msg, this);
			this.emit(msg.service.type + ':' + msg.service.name, msg.service, msg.payload, this.connection.getSocket());
			//routing
			this.selectRoute(msg);
		}catch(e){
			this.logError(e, e.details);
      
			if(e.message === CONST.ERR_MSG.MSG_CREDENTIALS_IS_NOT_VALID){
				this.informClientAboutExperiedToken();
			}
      
		}
	}

	suicide() {
		this.emit('errored', this);
	}

	disconnect() {
		this.connection.disconnect();
	}

	isDead() {
		return this.connection.isDead();
	}

	reconnect() {
		this.connection.reconnect();
	}

	isConnected(secure = true) {
		return this.connection(secure);
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
		if(Func.isFunc(request.cb)) {
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
			if (Func.isFunc(request.cb)) {
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

	respond(resp, service = {}, error){
		if(typeof resp === 'object' && resp !== null){
			let msg = this.messenger.pack(resp, service, error);
			return this.connection.send(msg);
		}else{
			return true;
		}
	}

	__request(name, payload, cb, secure = true) {
		let message = this.messenger.pack(payload, {
			type: CONST.MSG_TYPE.REQUEST,
			timeOffset: this.timeOffset,
			name,
		});
		this.addRequest(this.messenger.getServiceData(message).id, cb);
		this.connection.send(message, secure).catch(this.logError.bind(this));
	}

	request(name, payload, secure = true) {
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
			return this.request(name, payload,secure);
		}else{
			return this.message(type, name, payload,secure);
		}
	}

	message(type, name, payload, secure = true){
		let message = this.messenger.pack(payload, {
			type,
			timeOffset: this.timeOffset,
			name,
		});
		return this.connection.send(message, secure).catch(this.logError.bind(this));
	}

	informClientAboutExperiedToken(){
		this.logMsg('force to update token');
		this.send('__service', 'updateToken', {}, false).catch(this.logError.bind(this));
	}

	/**
  * Server time
  */
	requestServerTime() {
		if (this.connection.isConnected()) {
			const sendTime = Date.now();
			this.request('getTime', {}, true)
				.then((result)=>{
					const receiveTime = Date.now();
					const correction = Math.round((receiveTime - sendTime) / 2);
					const serverTime = parseInt(result, 10);
					const correctedTime = serverTime + correction;
					const offset = correctedTime - receiveTime;
					this.timeOffset = offset;
				})
				.catch((err)=>{
					this.logError(err);
				});
		}
	}

	set timeOffset(val) {
		this._timeOffset = val;
	}

	get timeOffset() {
		return this._timeOffset;
	}

	getTimeOnAuthorized(){
		if (this.getTimeOffsetInt) {
			clearInterval(this.getTimeOffsetInt);
			this.getTimeOffsetInt = null;
		}
		this.requestServerTime();
		this.getTimeOffsetInt = setInterval(this.requestServerTime.bind(this), TIME_OFFSET_REQUEST_INTERVAL);
	}
}

module.exports = notWSServerClient;
