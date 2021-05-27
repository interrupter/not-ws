//imports

const WebSocket    = require('ws');
const EventEmitter = require('events');
const CONST = require('./const.js');
const Func = require('./func.js');



const SYMBOL_ACTIVITY = Symbol('activity');
const SYMBOL_STATE = Symbol('state');

const MAX_HISTORY_DEPTH = 40;

const DEFAULT_OPTIONS = {
	secure:     true,
	reconnect:  true,
	ping:       true
};

class notWSConnection extends EventEmitter{
	constructor(options){
		super();
		this.options = Object.assign({}, DEFAULT_OPTIONS, options);
		if(this.options.ws){
			this.ws = options.ws;
			this.isAlive = true; //результат пинг запросов
			delete options.ws;
		}else{
			this.isAlive = false; //результат пинг запросов
			this.ws = null; //Подключение к websocket серверу.
		}
		//if was terminated
		this.isTerminated = false;
		this.isReconnecting = false;
		this.closing = false;
		this.heartbeatTimeout = null;
		this.connectInterval = null;
		this.connCount = 0; //Количество неудачных попыток подключения к websocket серверу.
		this.connCountMax = 10; //Количество попыток по превышении которого считаем что соединение с серверов разорвано.
		this.errConnMsg = null; //Идентификатор сообщения об ошибке подключения к вебсокет серверу.
		this.firstConn = true;


		//connection state and current activity
		if(this.options.state === 'online'){
			this[SYMBOL_STATE] = CONST.STATE.CONNECTED;
		}else{
			this[SYMBOL_STATE] = CONST.STATE.NOT_CONNECTED;
		}
		this[SYMBOL_ACTIVITY] = CONST.ACTIVITY.IDLE;

		this.bindEnvEvents();
		this.bindSocketEvents();
		//message history
		this.history = [];
		return this;
	}

	getSocket(){
		return this.ws;
	}

	bindSocketEvents(){
    
		//events binding to client socket
		this.listeners = {
			open: this.onOpen.bind(this),
			message: this.onMessage.bind(this),
			close: this.onClose.bind(this),
			error: this.onError.bind(this)
		};
		this.ws.on('open', this.listeners.open);
		this.ws.on('message', this.listeners.message);
		this.ws.on('close', this.listeners.close);
		this.ws.on('error', this.listeners.error);
		this.ws.on('pong', this.onPong.bind(this));
    
	}



	bindEnvEvents(){
    
		//no bindings yet
    
	}

	//Отключение от ws сервиса.
	disconnect(){
		this.emit('diconnecting');
		if(this.ws){
			//заменяем метод для onclose на пустую функцию.
      
			this.ws.on('close', Func.noop);
      
			//закрываем подключение.
			this.ws.close && this.ws.close();
			this.terminate();
			this.emit('disconnected');
		}
	}

	terminate() {
		if(this.connectInterval){
			clearInterval(this.connectInterval);
		}
		if (this.ws) {
			this.activity = CONST.ACTIVITY.TERMINATING;
      
			this.ws.removeAllListeners();
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

	//Подключение к websocket сервису.
	async connect(){
		try{
			if(this.ws && (this.ws.readyState !== WebSocket.CLOSED)){
				this.disconnect();
			}
			this.isAlive = true;
			this.emit('connecting');
			//Счётчик колиества попыток подключения:
			this.connCount++;
			//пытаемся подключиться к вебсокет сервису.
			let connURI = this.getConnectURI();
			this.emit('connectURI', connURI);
			this.ws = new WebSocket(connURI);
      
			this.ws.on('open', this.onOpen.bind(this));
			this.ws.on('error', this.onError.bind(this));
      
		}catch(e){
			this.emit('error',e);
			this.scheduleReconnect();
		}
	}

	getConnectURI(){
		let protocol = 'ws';
		if(this.options.protocol){
			protocol = this.options.protocol;
		}else{
			if(this.options.ssl){
				protocol = 'wss';
			}
		}
		let base = `${protocol}://${this.options.host}`;
		if(this.options.port && parseInt(this.options.port) !== 80){
			base = `${base}:${this.options.port}/${this.options.path}`;
		}else{
			base = `${base}/${this.options.path}`;
		}
		if(this.isSecure()){
			return `${base}?token=${this.jwtToken}`;
		}else{
			return base;
		}
	}

	setToken(token){
		this.jwtToken = token;
	}

	onOpen(){
		this.emit('connected');
		//Сбрасываем счётчик количества попыток подключения и данные об ошибках.
		this.connCount = 0;
		this.isAlive = true;
		clearInterval(this.connectInterval);
		this.connectInterval = false;
		this.errConnMsg = null;
    
		this.ws.on('message', this.onMessage.bind(this));
		this.ws.on('close', this.onClose.bind(this));
    
		this.initPing();
		this.emit('ready');
	}

	//Обработчик сообщений пришедших от сервера.
	//msg - это messageEvent пришедший по WS, соответственно данные лежат в msg.data.
	onMessage(input){
		try{
			//проверяем не "понг" ли это, если так - выходим
      
			let rawMsg = input;
      
			if(this.checkPingMsg(rawMsg)){
				return;
			}
			let data = Func.tryParseJSON(rawMsg);
			//Не удалось распарсить ответ от сервера как JSON
			if(!data){
				this.emit('messageInWronFormat', rawMsg);
				return;
			}
			this.emit('message', data);
		}catch(e){
			this.emit('error', e);
		}
	}

	onError(err){
		this.emit('disconnected');
		if(this.connectInterval){
			clearInterval(this.connectInterval);
			this.connectInterval = false;
		}
		if (this.activity === CONST.ACTIVITY.TERMINATING) {
			this.state = CONST.STATE.NOT_CONNECTED;
		} else {
			this.state = CONST.STATE.ERRORED;
		}
		this.emit('error', err);
	}

	//Обработчик закрытия подключения.
	onClose(event){
		this.emit('disconnected');
		if (typeof event.code !== 'undefined') {
			let reason = `${event.code}::` + CONST.mapWsCloseCodes(event);
			this.emit('close', reason);
		}else{
			if (isNaN(event)) {
				this.emit('close', event);
			} else {
				this.emit('terminated', CONST.mapWsCloseCodes(event));
			}
		}

		if (this.activity === CONST.ACTIVITY.CLOSING) {
			this.state = CONST.STATE.NOT_CONNECTED;
		} else {
			this.state = CONST.STATE.ERRORED;
		}

		if(this.isAutoReconnect()){
			this.scheduleReconnect();
		}
	}

	suicide() {
		this.emit('errored', this);
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
		this.emit('reconnectioningEvery', timeout);
		if (this.connectInterval){
			clearInterval(this.connectInterval);
		}
		this.connectInterval = setInterval(
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

	reconnect() {
		if ([CONST.ACTIVITY.CONNECTING].indexOf(this.activity) > -1) {
			this.emit('concurentActivity', CONST.ACTIVITY[this.activity]);
			return;
		} else {
			this.scheduleReconnect();
		}
	}

	/**
  *  Требуется аутентификация или нет
  */
	isSecure() {
		return this.options.secure;
	}

	isAutoReconnect(){
		if (typeof this.options.reconnect !== 'undefined'){
			return this.options.reconnect;
		}else{
			return CONST.CLIENT_AUTO_RECONNECT;
		}
	}

	/**
   *  Returns true if user connected, if secure===true,
   *  then client should be authentificated too
   *  @params {boolean} secure      if user should be connected and authenticated
   */
	isConnected(secure = true){
		if(this.ws && this.isAlive){
			if(secure){
				return this.isConnectionSecure();
			}else{
				return true;
			}
		}else{
			return false;
		}
	}

	isConnectionSecure(){
		let state = CONST.STATE.CONNECTED;
		if (this.isSecure()) {
			state = CONST.STATE.AUTHORIZED;
		}
		return (this.state === state) && (this.ws.readyState === 1); // 1- OPEN
	}

	isDead() {
		return this.isTerminated;
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

	/**
  * If not connected, reconnects, else sets connection isNotAlive and sends ping
  */
	sendPing(){
		if(this.isAlive === false){
			this.emit('noPong');
			this.disconnect();
			this.scheduleReconnect();
			return;
		}
		this.isAlive = false;
		this.ping();
	}

	/**
  * Ping connection
  */
	ping(){
		if(this.ws){
			
			this.ws.ping(Func.noop);
      
		}
	}

	/**
  * If message is plain text 'pong', then it sets connections as isAlive
  * @params {string}  msg   incoming message
  * @returns {boolean}  if it 'pong' message
  **/
	checkPingMsg(msg){
		if (msg === 'pong'){
			this.isAlive = true;
			return true;
		}
		return false;
	}

  
	/**
	*	Proxy for WebSocket event
	*/
	onPong(){
		this.emit('pong');
	}
  

	/**
  * Отправка сообщения
  * @param  {object|string} данные в виде
  *                         - строки, будут обернуты в соотвествии со спецификацией
  *                         - объекта, будут переданы без изменений
  * @return {Promise} resolve - удачно, reject - сбой
  */
	send(data, secure) {
		//Проверяем что клиент подключен
		return new Promise((resolve, reject) => {
			try {
				if (this.isConnected(secure)) {
					//Пытаемся отправить сообщение клиенту.
					this.ws.send(JSON.stringify(data), (err) => {
						if (err) {
							this.state = CONST.STATE.ERRORED;
							reject(err);
						} else {
							resolve();
						}
					});
				} else {
					this.emit('messageNotSent', CONST.STATE_NAME[this.state]);
					this.addToHistory(data);
					resolve();
				}
			} catch (e) {
				this.state = CONST.STATE.ERRORED;
				reject(e);
			}
		});
	}

	addToHistory(data) {
		this.emit('addToHistory', data);
		this.history.push(data);
		if (this.history.length > MAX_HISTORY_DEPTH) {
			this.history.shift();
		}
	}

	sendAllFromHistory() {
		while (this.history.length) {
			let msg = this.history.shift();
			//sending out but only in secure manner, all messages for not auth users will be dropped
			this.send(msg, true).catch(this.onError.bind(this));
		}
	}

	/**
  * Finite states machine
  */

	get state() {
		return this[SYMBOL_STATE];
	}

	set state(state = CONST.STATE.NOT_CONNECTED) {
		if (Object.values(CONST.STATE).indexOf(state) > -1) {
			this.emit('stateChange', state, CONST.STATE_NAME[state]);
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
					this.emit('authorized');
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
				if(CONST.STATE.ERRORED === state){
					this.emit('errored');
				}else{
					this.emit('noPing');
				}
				this.disconnectTimeout = setTimeout(this.disconnect.bind(this), 100);
			}
			//если идём на обрыв, то переподключение не запускаем
			if ((CONST.STATE.NOT_CONNECTED === state) && (!this.isDead())) {
				this.emit('beforeReconnect');
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
			this.emit('changeActivity', activity, CONST.ACTIVITY_NAME[activity]);
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
}

//env dep export

module.exports = notWSConnection;

