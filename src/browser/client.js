//imports

import EventEmitter from 'wolfy87-eventemitter';
import CONST from './const.js';
import Func from './func.js';
import notWSRouter from './router.js';
import notWSMessenger from './messenger.js';
import notWSConnection from './connection.js';



//class definition with minor env dependence
/**
*
* Client - main function is to connect and handle requests from/to server.
*
* Options
* @params {string}          name              - client name, optional. default: WSCLient
* @params {object}          connection        - object describing server and behaviour of this client
*         {string}            host            - server address
*         {string}            port            - server port
*         {string}            path            - path on server
*         {string}            protocol        - connection protocol, preffered over 'ssl' option
*         {boolean}           ssl             - user ssl encryption for connection
*         {boolean}           secure          - auth needed
*         {boolean}           reconnect       - reconnect if disconnected
*         {boolean}           ping            - ping server to indentify connection problems ASAP
* @params {function}        getToken          - should return token for auth on server
* @params {notWSMessenger}  messenger         - message handler
* @params {notWSRouter}     router            - request handler
* @params {object}          logger            - log interface {function:log, function:debug, function:error}
*
**/

const TIME_OFFSET_REQUEST_INTERVAL = 5 * 60 * 1000;

class notWSClient extends EventEmitter{
	constructor({
		name,
		connection,
		getToken,
		messenger,
		router,
		logger
	}){
		if(!router || !(router instanceof notWSRouter)){
			throw new Error('Router is not set or is not instance of notWSRouter');
		}
		if(!messenger || !(messenger instanceof notWSMessenger)){
			throw new Error('Messenger is not set or is not instance of notWSMessenger');
		}
		super();
		//Основные параметры
		this.__name = name || 'WSClient';
		//jwt
		this.jwtToken = null; //Токен авторизации.
		this.jwtExpire = null; //Время до истечения токена.
		this.jwtDate = null; //Дата создания токена.
		//Подключение к WS
		this.initConnection(connection);
		this.tokenGetter = getToken;
		this.messenger = messenger;
		this.router =   router;
		this.router.on('updateToken', this.renewToken.bind(this));
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

		this.connect();
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

	async connect(){
		try{
			//если нужна аутентификация
			if(this.connection.isSecure()){
				//получаем и сохраняем токен токен
				this.saveToken(await this.getToken());
			}
			//подключаемся
			this.connection.connect();
		}catch(e){
			this.logError(e);
		}
	}

	//Получение токена.
	//Возможно реализовать разными способами, поэтому выделено в отдельный метод.
	getToken(renew = false){
    
		let token = localStorage.getItem('token');
		if((typeof token !== 'undefined') && (token !== 'undefined') && token && !renew){
			return Promise.resolve(token);
		}else{
    
			if(Func.isFunc(this.tokenGetter)){
				return this.tokenGetter();
			}else{
				return Promise.reject();
			}
    
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
    
		localStorage.setItem('token', token);
    
		this.jwtToken = token;
		this.messenger.setCredentials(token);
		this.connection.setToken(token);
		this.emit('tokenUpdated', token);
	}

	//Обработчик сообщений пришедших от сервера.
	//data - JSON
	processMessage(data){
		try{
			this.messenger.validate(data);
			let msg = this.messenger.unpack(data);
			//general event
			this.emit('message', msg, this);
			//specific event
			this.emit(msg.service.type + ':' + msg.service.name, msg.service, msg.payload, this.connection.getSocket());
			//routing
			this.selectRoute(msg);
		}catch(e){
			this.logError(e, e.details);
      
		}
	}

	selectRoute(msg){
		switch(msg.service.type){
		//couple of special types
		case CONST.MSG_TYPE.RESPONSE: this.routeResponse(msg);  break;
		case CONST.MSG_TYPE.EVENT:    this.routeEvent(msg);     break;
			//all other
		default:                      this.routeCommon(msg);
		}
	}

	routeResponse(msg){
		let request = this.fullfillRequest(msg.service.id);
		if(request !== null){
			request.cb(msg);
		}
	}

	routeEvent(msg){
		this.router.route(msg.service, msg.payload, this.connection.getSocket())
			.catch((e)=>{
				this.logError(e);
			});
	}

	routeCommon(msg){
		this.router.route(msg.service, msg.payload, this.connection.getSocket())
			.then((responseData)=>{
				this.respond(responseData, {id: msg.service.id, type: CONST.MSG_TYPE.RESPONSE, name: msg.service.name});
			})
			.catch((e)=>{
				this.logError(e);
				this.respond({}, {id: msg.service.id, type: CONST.MSG_TYPE.RESPONSE, name: msg.service.name}, e);
			});
	}

	respond(resp, service = {}, error){
		if(resp && typeof resp === 'object' && resp !== null){
			let msg = this.messenger.pack(resp, service, error);
			return this.connection.send(msg);
		}else{
			return true;
		}
	}

	/**
  *  Отправка данных определенного типа и названия
  *  @param {string}  type  тип данных
  *  @param {string}  name  название
  *  @param {object}  payload  данные
  *  @returns  {Promise}
  */
	send(type, name, payload){
		if(type === CONST.MSG_TYPE.REQUEST){
			return this.request(name, payload);
		}else{
			return this.message(type, name, payload);
		}
	}

	message(type, name, payload){
		if((payload!== 'pong') && ( payload!== 'ping')){
			this.logMsg('outgoing message', type, name);
		}
		let message = this.messenger.pack(payload, {
			type,
			timeOffset: this.timeOffset,
			name,
		});
		return this.connection.send(message).catch(this.logError.bind(this));
	}

	//Отправка запроса на сервер.
	request(name, payload){
		this.logMsg('outgoing request', name);
		return new Promise((res, rej)=>{
			try{
				//Формирование данных запроса.
				let req = this.messenger.pack(payload, {
					type:       'request',
					timeOffset: this.timeOffset,
					name,
				});
				//Добавление запроса в список отправленных запросов.
				this.addRequest(this.messenger.getServiceData(req).id, res);
				//Отправка запроса на сервер.
				this.connection.send(req);
			}catch(e){
				this.logError(e);
				rej(e);
			}
		});
	}

	isSecure() {
		return this.connection.isSecure();
	}

	isConnected(){
		return this.connection.isConnected();
	}

	isDead() {
		return this.connection.isDead();
	}

	isAutoReconnect(){
		return this.connection.isAutoReconnect();
	}

	/**
  * Server time
  */
	requestServerTime() {
		if (this.connection.isConnected()) {
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

	getTimeOnAuthorized(){
		if (this.getTimeOffsetInt) {
			clearInterval(this.getTimeOffsetInt);
			this.getTimeOffsetInt = null;
		}
		this.requestServerTime();
		this.getTimeOffsetInt = setInterval(this.requestServerTime.bind(this), TIME_OFFSET_REQUEST_INTERVAL);
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

}


//env dep export

export default notWSClient;

