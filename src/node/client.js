
const EventEmitter = require('events');

const JWT = require('jsonwebtoken');

const CONST = require('./const.js');
const Func = require('./func.js');

const notWSRouter = require('./router.js');
const notWSMessenger = require('./messenger.js');
const notWSConnection = require('./connection.js');



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
* @params {notWSMessenger}  messenger         - message handler or its config
* @params {notWSRouter}     router            - request handler or its config
* @params {object}          logger            - log interface {function:log, function:debug, function:error}
* @params {boolean}         slave             - true - this is server child connection for remote client, false - it is connection to another server
* @params {Array<string>}   debug             - list of features to debug and show more information
*
**/

class notWSClient extends EventEmitter{
  constructor({
    name,
    connection,
    getToken,
    messenger,
    router,
    logger,
    identity,          //user information
    credentials,        //client creds for access
    slave = false,
    debug = []
  }){
    if(!router){
      throw new Error('Router is not set or is not instance of notWSRouter');
    }
    if(!(router instanceof notWSRouter)){
      router = new notWSRouter(router);
    }
    if(!messenger){
      throw new Error('Messenger is not set or is not instance of notWSMessenger');
    }
    if (!(messenger instanceof notWSMessenger)){
      messenger = new notWSMessenger(messenger);
    }
    super();
    //Основные параметры
    this.__name = name ? name : CONST.DEFAULT_CLIENT_NAME;
    //jwt
    this.jwtToken = null; //Токен авторизации.
    this.jwtExpire = null; //Время до истечения токена.
    this.jwtDate = null; //Дата создания токена.
    //setting envs
    this.tokenGetter = getToken;
    this.identity = identity;
    this.credentials = credentials;
    this.messenger = messenger;
    this.router =   router;
    this.slave = slave;
    this.debug = debug;
    //Подключение к WS
    this.initConnection(connection, this.slave);
    if(!this.slave){
      this.router.on('updateToken', this.renewToken.bind(this));
    }
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
    if(!this.slave){
      this.connect();
    }
    return this;
  }

  getIP(){
    return this.connection?this.connection.getIP():false;
  }

  initConnection(connection){
    this.connection = new notWSConnection(connection);
    this.connection.on('disconnected', ()=>{
      this.logMsg('disconnected');
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

    this.connection.on('ready', ()=>{
      this.logMsg('ready');
      this.emit('ready', this);
    });

    if(this.connect.debug && this.connect.debug.includes('ping')){
      this.connection.on('ping', ()=>{
        this.logDebug('ping');
      });
      this.connection.on('pong', ()=>{
        this.logDebug('pong');
      });

      this.connection.on('pinged', ()=>{
        this.logDebug('pinged');
      });
      this.connection.on('ponged', ()=>{
        this.logDebug('ponged');
      });
    }
  }

  async connect(){
    if(!this.slave){
      try{
        if(!this.isConnected()){
          //если нужна аутентификация
          if(this.connection.isSecure()){
            //получаем и сохраняем токен токен
            this.saveToken(await this.getToken());
          }
          //подключаемся
          this.connection.connect();
        }
      }catch(e){
        this.logError(e);
      }
    }
  }

  suicide() {
    this.emit('errored', this);
  }

  disconnect(){
    this.connection.disconnect();
  }

  terminate(){
    this.connection.terminate();
    this.connection.destroy();
  }

  destroy(){
    clearInterval(this.getTimeOffsetInt);
    this.emit('destroyed');
    this.removeAllListeners();
  }

  isDead() {
    return !this.connection.isAlive();
  }

  isAlive() {
    return this.connection.isAlive();
  }

  reconnect() {
    this.connection.reconnect();
  }

  isConnected(secure = true) {
    return this.connection.isConnected(secure);
  }

  isSecure() {
    return this.connection.isSecure();
  }

  isAutoReconnect(){
    return this.connection.isAutoReconnect();
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
    if (JWT){
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
    }else{
      return Promise.reject(new Error('JWT not defined'));
    }
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
  

  //Получение токена.
  //Возможно реализовать разными способами, поэтому выделено в отдельный метод.
  getToken(){
    
      if(Func.isFunc(this.tokenGetter)){
        return this.tokenGetter();
      }else{
        return Promise.reject();
      }
    
  }

  async renewToken(){
    if (!this.slave){
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
  }

  saveToken(token){
    if (!this.slave){
      
      this.jwtToken = token;
      this.messenger.setCredentials(token);
      this.connection.setToken(token);
      this.emit('tokenUpdated', token);
    }
  }

  ping(){
    this.connection.sendPing();
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

  selectRoute(msg){
    switch(msg.service.type){
    //couple of special types
    case CONST.MSG_TYPE.RESPONSE: this.routeResponse(msg);  break;
    case CONST.MSG_TYPE.REQUEST:   this.routeRequest(msg);  break;
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
    this.router.route(msg.service, msg.payload, this)
      .catch((e)=>{
        this.logError(e);
      });
  }

  routeCommon(msg){
    this.router.route(msg.service, msg.payload, this)
      .catch((e)=>{
        this.logError(e);
        this.respond({}, {id: msg.service.id, type: CONST.MSG_TYPE.RESPONSE, name: msg.service.name}, e);
      });
  }

  routeRequest(msg){
    this.router.route(msg.service, msg.payload, this)
      .then((responseData)=>{
        this.respond(responseData, {id: msg.service.id, type: CONST.MSG_TYPE.RESPONSE, name: msg.service.name});
      })
      .catch((e)=>{
        this.logError(e);
        this.respond({}, {id: msg.service.id, type: CONST.MSG_TYPE.RESPONSE, name: msg.service.name}, e);
      });
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
          if (this.messenger.isErrored(response)) {
            return reject(response);
          }
          resolve(response);
        }, secure);
      } catch (e) {
        reject(e);
      }
    });
  }

  message(type, name, payload){
    if((payload!== 'pong') && ( payload!== 'ping')){
      this.logDebug('outgoing message', type, name);
    }
    let message = this.messenger.pack(payload, {
      type,
      timeOffset: this.timeOffset,
      name,
    });
    return this.connection.send(message).catch(this.logError.bind(this));
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
      this.request('getTime', {}, )
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
    this.getTimeOffsetInt = setInterval(this.requestServerTime.bind(this), CONST.TIME_OFFSET_REQUEST_INTERVAL);
  }

}



//env dep export

module.exports = notWSClient;

