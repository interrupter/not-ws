//imports

import EventEmitter from 'wolfy87-eventemitter';
import CONST from './const.mjs';
import Func from './func.mjs';



const SYMBOL_ACTIVITY = Symbol('activity');
const SYMBOL_STATE = Symbol('state');

const MAX_HISTORY_DEPTH = 40;

const DEFAULT_OPTIONS = {
	secure:     true,
	reconnect:  true,
	ping:       true,
	count:      true,
};

class notWSConnection extends EventEmitter{
	constructor(options, slave = false){
		super();
		this.options = Object.assign({}, DEFAULT_OPTIONS, options);
		if(this.options.ws){
			this.ws = options.ws;
			delete options.ws;
			if(this.ws.readyState === 1){
				this.setAlive(); //результат пинг запросов
				this[SYMBOL_STATE] = CONST.STATE.CONNECTED;
				if(this.options.secure){
					this[SYMBOL_STATE] = CONST.STATE.AUTHORIZED;
				}
			}else{
				this[SYMBOL_STATE] = CONST.STATE.NOT_CONNECTED;
				this.setDead(); //результат пинг запросов
			}
		}else{
			this[SYMBOL_STATE] = CONST.STATE.NOT_CONNECTED;
			this.setDead(); //результат пинг запросов
			this.ws = null; //Подключение к websocket серверу.
		}
		this[SYMBOL_ACTIVITY] = CONST.ACTIVITY.IDLE;
		//if was terminated
		this.isTerminated = false;
		this.isReconnecting = false;
		this.closing = false;
		this.slave = slave;
		this.heartbeatTimeout = null;
		this.connectInterval = null;
		this.connCount = 0; //Количество неудачных попыток подключения к websocket серверу.
		this.connCountMax = 10; //Количество попыток по превышении которого считаем что соединение с серверов разорвано.
		this.errConnMsg = null; //Идентификатор сообщения об ошибке подключения к вебсокет серверу.
		this.firstConn = true;
		this.bindEnvEvents();
		this.bindSocketEvents();
		//message history
		this.history = [];
		this.passed = {
			in:  0,
			out: 0,
		};
		return this;
	}

	getStatus(){
		return {
			state:          CONST.STATE_NAME[this[SYMBOL_STATE]],
			activity:       CONST.ACTIVITY_NAME[this[SYMBOL_ACTIVITY]],
			isAlive:        this.isAlive(),
			isTerminated:   this.isTerminated,
			isReconnecting: this.isReconnecting,
			in:             this.passed.in,
			out:            this.passed.out,
		};
	}

	getSocket(){
		return this.ws;
	}

	getIP(){
		if(this.isOpen() && this.ws._socket && this.ws._socket.remoteAddress){
			return this.ws._socket.remoteAddress;
		}else{
			return false;
		}
	}

	bindSocketEvents(){
		if(this.ws){
			this.listeners = {
				open: this.onOpen.bind(this),
				message: this.onMessage.bind(this),
				close: this.onClose.bind(this),
				error: this.onError.bind(this)
			};
    
			this.ws.onopen = this.listeners.open;
			this.ws.onmessage = this.listeners.message;
			this.ws.onclose = this.listeners.close;
			this.ws.onerror = this.listeners.error;
    
		}
	}



	bindEnvEvents(){
    
		window.onunload = this.disconnect.bind(this);
		window.onbeforeunload = this.disconnect.bind(this);
    
	}

	//Отключение от ws сервиса.
	disconnect(){
		this.emit('diconnecting');
		if(this.ws){
			//заменяем метод для onclose на пустую функцию.
      
			this.ws.onclose = Func.noop;
			this.ws.onerror = Func.noop;
			this.ws.onmessage = Func.noop;
			this.ws.onopen = Func.noop;
      
			//закрываем подключение.
			this.ws.close && this.ws.close();
			this.terminate();
		}
	}

	terminate() {
		if(this.connectInterval){
			clearInterval(this.connectInterval);
		}
		if (this.ws) {
			this.activity = CONST.ACTIVITY.TERMINATING;
      
			this.ws.terminate && this.ws.terminate();
		}
		this.isTerminated = true;
		this.ws = null;
		if(this.state !== CONST.STATE.NOT_CONNECTED){
			this.state = CONST.STATE.NOT_CONNECTED;
		}
		this.setDead();
	}

	//Подключение к websocket сервису.
	async connect(){
		try{
			if(!this.jwtToken){        
				this.scheduleReconnect();
				return;
			}
			if(this.ws && (this.ws.readyState !== WebSocket.CLOSED)){
				this.disconnect();
			}
			this.setAlive();
			this.isTerminated = false;
			//Счётчик колиества попыток подключения:
			this.connCount++;
			//пытаемся подключиться к вебсокет сервису.
			let connURI = this.getConnectURI();
			this.emit('connectURI', connURI);
			this.activity = CONST.ACTIVITY.CONNECTING;
			this.ws = new WebSocket(connURI);
			this.bindSocketEvents();
		}catch(e){
			this.emit('error',e);
			this.scheduleReconnect();
		}
	}

	setHalfDead(){
		if(this._alive){
			this._alive = false;
		}else{
			this.setDead();
		}
	}

	setAlive(){
		this._alive = true;
		this.alive = true;
	}

	setDead(){
		this.alive = false;
	}

	isAlive(){
		return this.alive;
	}

	isDead(){
		return !this.alive;
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
		//Сбрасываем счётчик количества попыток подключения и данные об ошибках.
		this.connCount = 0;
		this.setAlive();
		clearInterval(this.connectInterval);
		this.connectInterval = false;
		this.errConnMsg = null;
		this.state = CONST.STATE.CONNECTED;
		if(this.isSecure()){
			this.state = CONST.STATE.AUTHORIZED;
		}
		this.initPing();
		this.emit('ready');
		this.sendAllFromHistory();
	}

	//Обработчик сообщений пришедших от сервера.
	//msg - это messageEvent пришедший по WS, соответственно данные лежат в msg.data.
	onMessage(input){
		try{
			this.countPassed(input, 'in');
			//проверяем не "понг" ли это, если так - выходим
      
			let rawMsg = input.data;
      
			if(this.checkPingMsg(rawMsg)){
				return;
			}
			let data = Func.tryParseJSON(rawMsg);
			//Не удалось распарсить ответ от сервера как JSON
			if(!data){
				this.emit('messageInWrongFormat', rawMsg);
				return;
			}
			this.emit('message', data);
		}catch(e){
			this.emit('error', e);
		}
	}

	onError(err){
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
		if (!this.slave) {
			let timeout = this.getReconnectTimeout();
			this.emit('reconnectiningEvery', timeout);
			if (this.connectInterval) {
				clearInterval(this.connectInterval);
			}
			this.connectInterval = setInterval(this.performReconnect.bind(this), timeout);
		}
	}

	performReconnect(){
		if (!this.ws || this.ws.readyState === this.ws.CLOSED) {
			this.connect();
		}
	}

	reconnect() {
		if(!this.slave){
			if ([CONST.ACTIVITY.CONNECTING].indexOf(this.activity) > -1) {
				this.emit('concurentActivity', CONST.ACTIVITY[this.activity]);
				return;
			} else {
				this.scheduleReconnect();
			}
		}
	}

	/**
  *  Требуется аутентификация или нет
  */
	isSecure() {
		return this.options.secure;
	}

	isAutoReconnect(){
		if(this.slave){
			return false;
		}else{
			if (typeof this.options.reconnect !== 'undefined'){
				return this.options.reconnect;
			}else{
				return CONST.CLIENT_AUTO_RECONNECT;
			}
		}
	}

	/**
   *  Returns true if user connected, if secure===true,
   *  then client should be authentificated too
   *  @params {boolean} secure      if user should be connected and authenticated
   */
	isConnected(secure = true){
		if(this.ws && this.isAlive()){
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

	isOpen(){
		return this.ws && this.ws.readyState === 1;
	}

	isMessageTokenUpdateRequest(data){
		return data.type === '__service' && data.name === 'updateToken';
	}

	initPing(){
		//if server side client, only react on pong
		if(this.slave){
			this.on('pong', Func.heartbeat);
		}else{
			//if client send ping requests
			if(this.options.ping){
				if(this.pingInterval){
					clearInterval(this.pingInterval);
					this.pingInterval = false;
				}
				this.pingInterval = setInterval(this.sendPing.bind(this), this.options.pingTimeout || CONST.PING_TIMEOUT);
			}
		}
	}

	/**
  * If not connected, reconnects, else sets connection isNotAlive and sends ping
  */
	sendPing(){
		if(!this.isAlive()){
			this.emit('noPong');
			if(this.state === CONST.STATE.CONNECTED){
				this.state = CONST.STATE.NOT_CONNECTED;
			}
			return;
		}
		this.setHalfDead();
		this.ping();
	}

	pong(){
		if(this.isOpen()){
			this.wsSend('pong');
			this.emit('pong');
		}
	}

	/**
  * Ping connection
  */
	ping(){
		if(this.isOpen()){
      
			this.wsSend('ping').catch(Func.noop);
      
			this.emit('ping');
		}
	}

	/**
  * If message is plain text 'pong', then it sets connections as isAlive
  * @params {string}  msg   incoming message
  * @returns {boolean}  if it 'pong' message
  **/
	checkPingMsg(msg){
		if (msg === 'ping'){
			this.setAlive();
			this.emit('pinged');
			this.pong();
			return true;
		}
		if (msg === 'pong'){
			this.setAlive();
			this.emit('ponged');
			return true;
		}
		return false;
	}

  

	/**
  * Отправка сообщения
  * @param  {object|string} данные в виде
  *                         - строки, будут обернуты в соотвествии со спецификацией
  *                         - объекта, будут переданы без изменений
  * @return {Promise} resolve - удачно, reject - сбой
  */
	async send(data, secure) {
		//Проверяем что клиент подключен
		try {
			if (this.isConnected(secure) || (this.isOpen() && this.isMessageTokenUpdateRequest(data))) {
				//Пытаемся отправить сообщение клиенту.
				await this.wsSend(JSON.stringify(data));
			} else {
				this.emit('messageNotSent', CONST.STATE_NAME[this.state]);
				this.addToHistory(data);
			}
		} catch (e) {
			this.state = CONST.STATE.ERRORED;
			throw e;
		}
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
					throw new CONST.notWSException('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
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
					throw new CONST.notWSException('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
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
					throw new CONST.notWSException('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
				}
				break;
				////из остояний разрыва связи, можно уйти только в "не подключен"
				//можем только отключиться
			case CONST.STATE.NO_PING:
				if ([CONST.STATE.NOT_CONNECTED].indexOf(state) > -1) {
					this[SYMBOL_STATE] = state;
					this.activity = CONST.ACTIVITY.IDLE;
				} else {
					throw new CONST.notWSException('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
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
					throw new CONST.notWSException('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE]] + ' -> ' + CONST.STATE_NAME[state]);
				}
				break;
			}
			switch(this[SYMBOL_STATE]){
			case CONST.STATE.NOT_CONNECTED:
				//если идём на обрыв, то переподключение не запускаем
				this.emit('disconnected');
				if(this.isAlive()){
					this.emit('beforeReconnect');
					this.reconnect();
				}else{
					if(this.isAutoReconnect()){
						this.scheduleReconnect();
					}
				}
				break;
			case CONST.STATE.CONNECTED:  this.emit('connected');        break;
			case CONST.STATE.AUTHORIZED:  this.emit('authorized');      break;
			case CONST.STATE.NO_PING:
				this.emit('noPing');
				this.disconnectTimeout = setTimeout(this.disconnect.bind(this), 100);
				break;
			case CONST.STATE.ERRORED:
				this.emit('errored');
				this.disconnectTimeout = setTimeout(this.disconnect.bind(this), 100);
				break;
			}
		} else {
			throw new CONST.notWSException('set: Unknown notWSServerClient state: ' + state);
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
			switch(this[SYMBOL_ACTIVITY]){
			case CONST.ACTIVITY.IDLE:         this.emit('idle', this); break;
			case CONST.ACTIVITY.CONNECTING:   this.emit('connecting', this); break;
			case CONST.ACTIVITY.AUTHORIZING:  this.emit('authorizing', this); break;
			case CONST.ACTIVITY.CLOSING:      this.emit('closing', this); break;
			case CONST.ACTIVITY.TERMINATING:  this.emit('terminating', this); break;
			}
		} else {
			throw new CONST.notWSException('set: Unknown notWSServerClient activity: ' + activity);
		}
	}

	wsSend(msg){
		return new Promise((res, rej)=>{
			this.ws.send(this.countPassed(msg, 'out'), (err)=>{
				if(err){
					rej(err);
				}else{
					res();
				}
			});
		});

	}

	countPassed(input, where){
		this.passed[where] += this.options.count?this.getMessageSize(input):0;
		return input;
	}

	getMessageSize(input){
    
		return new Blob([input]).size;
    
	}

	destroy(){
		clearInterval(this.connectInterval);
		clearInterval(this.pingInterval);
		clearTimeout(this.disconnectTimeout);
		this.emit('destroyed');
		this.removeAllListeners();
	}
}

//env dep export

export default notWSConnection;

