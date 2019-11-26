var notWSClient = (function () {
	'use strict';

	const STATE = {
	  //нет подключения
	  NOT_CONNECTED: 0,
	  //есть подключение
	  CONNECTED: 1,
	  //есть авторизация
	  AUTHORIZED: 2,
	  //нет отклика
	  NO_PING: 3,
	  //ошибка соединения
	  ERRORED: 4
	};
	const STATE_NAME = {
	  0: 'Не подключен',
	  1: 'Подключен',
	  2: 'Авторизован',
	  3: 'Нет отклика',
	  4: 'Ошибка связи'
	}; //деятельность объекта, не завершенное дествие

	const ACTIVITY = {
	  IDLE: 0,
	  //идёт подключение
	  CONNECTING: 1,
	  //закрытие соединения
	  CLOSING: 2,
	  //разрыв соединения
	  TERMINATING: 3,
	  //авторизация по токену
	  AUTHORIZING: 4
	};
	const ACTIVITY_NAME = {
	  0: 'Простаивает',
	  1: 'Открытие связи',
	  2: 'Закрытие связи',
	  3: 'Обрыв связи',
	  4: 'Авторизация'
	}; //Список кодов закрытия взят с https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent

	let WS_CLOSURE_REASONS = {
	  1000: 'Normal Closure',
	  1001: 'Going Away',
	  1002: 'Protocol Error',
	  1003: 'Unsupported Data',
	  1005: 'No Status Recvd',
	  1006: 'Abnormal Closure',
	  1007: 'Invalid frame payload data',
	  1008: 'Policy Violation',
	  1009: 'Message too big',
	  1010: 'Missing Extension',
	  1011: 'Internal Error',
	  1012: 'Service Restart',
	  1013: 'Try Again Later',
	  1014: 'Bad Gateway',
	  1015: 'TLS Handshake'
	}; //Возвращает описание причины возникновения ивента закрытия WS-подключения

	function mapWsCloseCodes(event) {
	  if (!event) return 'unknown reason'; //Если event не задан, то причина неизвестна.

	  if (event.reason) return event.reason; //Если reason уже задан, возвращаем его.
	  //Определяем reason-код и ищем его в WS_CLOSURE_REASONS

	  let code = typeof event.code !== 'undefined' ? event.code.toString() : 'undefined';

	  if (!isNaN(parseInt(event))) {
	    code = event;
	  }

	  return Object.prototype.hasOwnProperty.call(WS_CLOSURE_REASONS, code) ? WS_CLOSURE_REASONS[code] : `Unknown reason: ${code}`;
	}

	const SYMBOL_ACTIVITY = Symbol('activity');
	const SYMBOL_STATE = Symbol('state');
	const DEFAULT_CLIENT_NAME = 'not-ws link';
	const DEFAULT_SERVER_NAME = 'not-ws server';
	const ERR_MSG = {
	  REQUEST_TIMEOUT: 'Request timeout',
	  MSG_ID_IS_NOT_VALID: 'Message ID is not valid uuidv4',
	  MSG_CREDENTIALS_IS_NOT_VALID: 'Message Credentials is not valid!',
	  MSG_TYPE_IS_NOT_VALID: 'Message Type is not valid!',
	  MSG_NAME_IS_NOT_VALID: 'Message Name is not valid!'
	};
	const PING_TIMEOUT = 30000;
	const HEARTBEAT_INTERVAL = 30000;
	const CLIENT_RECONNECT_TIMEOUT = 5000;
	const CLIENT_RECONNECT_TIMEOUT_LONG = 30000;
	const CLIENT_AUTO_RECONNECT = true;

	function noop() {}

	function heartbeat() {
	  this.isAlive = true;
	}

	const TOKEN_TTL = 1800;
	const TOKEN_RENEW_TTL = 300;
	const MSG_TYPE = {
	  REQUEST: 'request',
	  RESPONSE: 'response',
	  EVENT: 'event',
	  COMMAND: 'command'
	};
	var CONST = {
	  STATE,
	  STATE_NAME,
	  ACTIVITY,
	  ACTIVITY_NAME,
	  WS_CLOSURE_REASONS,
	  mapWsCloseCodes,
	  HEARTBEAT_INTERVAL,
	  SYMBOL_ACTIVITY,
	  SYMBOL_STATE,
	  DEFAULT_SERVER_NAME,
	  DEFAULT_CLIENT_NAME,
	  ERR_MSG,
	  PING_TIMEOUT,
	  CLIENT_RECONNECT_TIMEOUT,
	  CLIENT_RECONNECT_TIMEOUT_LONG,
	  CLIENT_AUTO_RECONNECT,
	  heartbeat,
	  noop,
	  MSG_TYPE,
	  TOKEN_TTL,
	  TOKEN_RENEW_TTL
	};

	const TZ_OFFSET = new Date().getTimezoneOffset() / 60 * -1;
	let [, hash] = location.hash.split('#');
	const ENV_TYPE = hash;
	const DEV_ENV = 'development';

	const NOOP = () => {}; //Standart pad function.


	function pad(n) {
	  return n < 10 ? '0' + n : n;
	} //Convert Date object to local ISO string.


	function localIsoDate(date) {
	  date = date || new Date();
	  let localIsoString = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
	  return localIsoString;
	} //Проверка является ли переменная функцией.


	let isFunc = function (func) {
	  return typeof func === 'function';
	}; //Проверка является ли переменная массивом


	let isArray = function (data) {
	  return typeof data == "object" && data instanceof Array;
	}; //Функция вывода сообщения в консоль.


	let logMsg = function () {
	  let now = localIsoDate(); // eslint-disable-next-line no-console

	  console.log(`[${now}]: `, ...arguments);
	}; //Генерация метода вывода сообщений в консоль с указанием префикса.


	let genLogMsg = prefix => {
	  return function () {
	    let now = localIsoDate(); // eslint-disable-next-line no-console

	    console.log(`[${now}]: ${prefix}::`, ...arguments);
	  };
	};
	/**
	* Определяет является ли окружение окружением разработки
	* @returns  {boolean} true если это запущено в окружении разработки
	**/


	function isDev() {
	  return ENV_TYPE === DEV_ENV;
	}

	let genLogDebug = prefix => {
	  if (isDev()) {
	    return genLogMsg(prefix);
	  } else {
	    return NOOP;
	  }
	}; //Функция вывода сообщения об ошибке


	let logError = function () {
	  let now = localIsoDate(); // eslint-disable-next-line no-console

	  console.error(`[${now}]: `, ...arguments);
	};

	let genLogError = prefix => {
	  return function () {
	    let now = localIsoDate(); // eslint-disable-next-line no-console

	    console.error(`[${now}]: ${prefix}::`, ...arguments);
	  };
	}; //Проверка строки на JSON(со stackoverflow).
	//http://stackoverflow.com/questions/3710204/how-to-check-if-a-string-is-a-valid-json-string-in-javascript-without-using-try


	let tryParseJSON = function (jsonString) {
	  try {
	    let o = JSON.parse(jsonString); // Handle non-exception-throwing cases:
	    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
	    // but... JSON.parse(null) returns null, and typeof null === "object",
	    // so we must check for that, too. Thankfully, null is falsey, so this suffices:

	    if (o && typeof o === "object") {
	      return o;
	    }
	  } catch (e) {
	    // eslint-disable-next-line no-console
	    console.error(e);
	  }

	  return false;
	};

	let capitalizeFirstLetter = function (name) {
	  return name.charAt(0).toUpperCase() + name.slice(1);
	};

	var LOG = {
	  TZ_OFFSET,
	  logMsg,
	  logError,
	  genLogMsg,
	  genLogError,
	  genLogDebug,
	  isFunc,
	  isArray,
	  localIsoDate,
	  tryParseJSON,
	  capitalizeFirstLetter
	};

	/* global EventEmitter */
	/**
	* Routing for messages
	*
	*/

	class notWSRouter extends EventEmitter {
	  constructor(options, routes = {}, logger) {
	    super();
	    this.options = options;
	    this.__name = 'notWSRouter';
	    this.logMsg = logger ? logger.log : LOG.genLogMsg(this.__name);
	    this.logDebug = logger ? logger.debug : LOG.genLogDebug(this.__name);
	    this.logError = logger ? logger.error : LOG.genLogError(this.__name);
	    this.routes = {
	      __service: {
	        updateToken: () => {
	          this.emit('updateToken');
	          return Promise.resolve();
	        }
	      }
	    };

	    if (routes && Object.keys(routes).length > 0) {
	      this.initRoutes(routes);
	    }

	    return this;
	  }

	  initRoutes(routes) {
	    for (let type in routes) {
	      this.setRoutesForType(type, routes[type]);
	    }
	  }
	  /**
	   * Routing action
	   * @parms {object} messageServiceData  object with fields:
	                       type - msg type, routes set
	                       name - action name
	                       cred - some credentials info
	     @params {object}  data  payload information from message
	  	@params {object}  conn  WS Connection
	     @returns  {Promise} from targeted action or throwing Error if route doesn't exist
	   */


	  route({
	    type,
	    name,
	    cred
	  }, data, conn) {
	    if (Object.prototype.hasOwnProperty.call(this.routes, type) && Object.prototype.hasOwnProperty.call(this.routes[type], name)) {
	      this.logMsg(conn.ip, type, name);
	      return this.routes[type][name](data, cred, conn);
	    }

	    throw new Error(`Route not found ${type}/${name}`);
	  }
	  /**
	   * Adding routes, chainable
	   * @params {string}  type  name of type
	   * @params {object}  routes  hash with name => () => {return new Promise} alike workers
	   * @returns {object} self
	   */


	  setRoutesForType(type, routes) {
	    this.validateType(type);
	    this.validateRoutes(routes);

	    if (Object.prototype.hasOwnProperty.call(this.routes, type)) {
	      this.routes[type] = Object.assign(this.routes[type], routes);
	    } else {
	      this.routes[type] = routes;
	    }

	    return this;
	  }

	  unsetRoutesForType(type, list = []) {
	    this.validateType(type);
	    this.validateRoutesList(list);

	    if (Object.prototype.hasOwnProperty.call(this.routes, type)) {
	      for (let name of list) {
	        if (Object.prototype.hasOwnProperty.call(this.routes[type], name)) {
	          delete this.routes[type][name];
	        }
	      }

	      if (Object.keys(this.routes[type]).length === 0) {
	        delete this.routes[type];
	      }
	    }

	    return this;
	  }

	  validateType(type) {
	    if (typeof type !== 'string' || type === '') {
	      throw new Error('Route\'s type name should be a String!');
	    }

	    return true;
	  }

	  validateRoutes(routes) {
	    if (typeof routes !== 'object' || routes === null || routes === undefined) {
	      throw new Error('Route\'s type\'s routes set should be an Object!');
	    }

	    return true;
	  }

	  validateRoutesList(list) {
	    if (!Array.isArray(list) || typeof list === 'undefined') {
	      throw new Error('List of routes names should be an Array!');
	    }

	    return true;
	  }

	}

	/* global  msCrypto */

	/**
	* Version of https://github.com/kelektiv/node-uuid
	* Edited by Roman Burunkov, Aleksandr Repin
	**/

	/**
	 * Convert array of 16 byte values to UUID string format of the form:
	 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
	 */
	var byteToHex = [];

	for (var i = 0; i < 256; ++i) {
	  byteToHex[i] = (i + 0x100).toString(16).substr(1);
	}

	function bytesToUuid(buf, offset) {
	  var i = offset || 0;
	  var bth = byteToHex;
	  return bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + '-' + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]] + bth[buf[i++]];
	} // Unique ID creation requires a high quality random # generator.  In the
	// browser this is a little complicated due to unknown quality of Math.random()
	// and inconsistent support for the `crypto` API.  We do the best we can via
	// feature-detection
	// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.


	var getRandomValues = typeof crypto != 'undefined' && crypto.getRandomValues.bind(crypto) || typeof msCrypto != 'undefined' && msCrypto.getRandomValues.bind(msCrypto);
	var rng;

	if (getRandomValues) {
	  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
	  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

	  rng = function () {
	    getRandomValues(rnds8);
	    return rnds8;
	  };
	} else {
	  // Math.random()-based (RNG)
	  //
	  // If all else fails, use Math.random().  It's fast, but is of unspecified
	  // quality.
	  var rnds = new Array(16);

	  rng = function () {
	    for (var i = 0, r; i < 16; i++) {
	      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
	      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
	    }

	    return rnds;
	  };
	}

	function uuidv4(options, buf, offset) {
	  var i = buf && offset || 0;

	  if (typeof options == 'string') {
	    buf = options === 'binary' ? new Array(16) : null;
	    options = null;
	  }

	  options = options || {};
	  var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

	  rnds[6] = rnds[6] & 0x0f | 0x40;
	  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

	  if (buf) {
	    for (var ii = 0; ii < 16; ++ii) {
	      buf[i + ii] = rnds[ii];
	    }
	  }

	  return buf || bytesToUuid(rnds);
	}

	/* global validator,EventEmitter */
	/**
	 * set of default options
	 */

	const DEFAULT_OPTIONS = {
	  secure: false,
	  // if true - all not validated credentials are wrong
	  securityException: ['request.auth'],
	  //пример того как указывать пути без аутентификации, даже при secure=true
	  validators: {//additional validators for validate method

	    /**
	      credentials(credentials){
	        return (credentials.password === 'password') && (credentials.login === 'login');
	      }
	      */
	  },
	  types: {
	    'typeOfMessage': ['list', 'of', 'name\'s', 'of', 'actions'],
	    'test': ['sayHello'],
	    '__service': ['updateToken']
	  }
	};
	/***
	message format for this default adaptor
	{
	  id:uuidv4
	  type:string
	  name:string
	  payload:{} <- payload
	  cred:any
	  time:int
	  error:{} <- if errored

	}
	*/

	/**
	 * Message pre/post transmittion adapter
	 * Creates standart interface, mostly freeing other parts from
	 * understanding message inner structure
	 */

	class notWSMessage extends EventEmitter {
	  constructor(options = {}) {
	    super();
	    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
	    return this;
	  }

	  setCredentials(credentials) {
	    this.options.credentials = credentials;
	    return this;
	  }

	  getServiceData(msg) {
	    return {
	      id: msg.id,
	      time: msg.time,
	      type: msg.type,
	      name: msg.name
	    };
	  }

	  getType(msg) {
	    return msg.type;
	  }

	  getName(msg) {
	    return msg.name;
	  }

	  getCredentials(msg) {
	    return msg.cred;
	  }

	  getPayload(msg) {
	    return msg.payload;
	  }

	  isErrored(msg) {
	    return typeof msg.error !== 'undefined' && msg.error !== null;
	  }

	  getErrorMessage(msg) {
	    if (typeof msg.error === 'string') {
	      return msg.error;
	    } else if (typeof msg.error === 'object') {
	      return `${msg.error.code}: ${msg.error.message}`;
	    } else {
	      throw new Error('No error data in message');
	    }
	  }

	  getErrorReport(msg) {
	    return msg.error;
	  }
	  /**
	    *
	    *
	    */


	  pack(payload, serviceData, error) {
	    if (typeof serviceData === 'undefined' || serviceData === null) {
	      throw new Error('No Service Data for packing notWSMsg');
	    }

	    let msg = {
	      id: uuidv4(),
	      time: new Date().getTime(),
	      payload
	    };

	    if (this.options.credentials) {
	      msg.cred = this.options.credentials;
	    }

	    if (error) {
	      msg['error'] = error;
	    }

	    return Object.assign(msg, serviceData);
	  }

	  unpack(msg) {
	    if (this.isErrored(msg)) {
	      let err = new Error(this.getErrorMessage(msg));
	      err.report = this.getErrorReport(msg);
	      throw err;
	    }

	    return {
	      cred: this.getCredentials(msg),
	      service: this.getServiceData(msg),
	      payload: this.getPayload(msg)
	    };
	  }

	  validateCredentials(credentials = {}) {
	    if (this.options.validators && this.options.validators.credentials) {
	      return this.options.validators.credentials(credentials);
	    }

	    return !this.options.secure;
	  }

	  validateType(type) {
	    if (this.options.types) {
	      return Object.keys(this.options.types).indexOf(type) > -1;
	    }

	    return false;
	  }

	  validateTypeAndName(type, name) {
	    if (this.options.types && Object.prototype.hasOwnProperty.call(this.options.types, type)) {
	      return this.options.types[type].indexOf(name) > -1;
	    }

	    return false;
	  }

	  routeIsSecurityException(type, name) {
	    let route = `${type}.${name}`;

	    if (this.options.securityException && Array.isArray(this.options.securityException)) {
	      return this.options.securityException.indexOf(route) > -1;
	    }

	    return false;
	  }

	  validate(msg) {
	    let serviceData = this.getServiceData(msg);

	    if (!validator.isUUID(serviceData.id, 4)) {
	      throw new Error(CONST.ERR_MSG.MSG_ID_IS_NOT_VALID);
	    }

	    if ( //если не в списке исключений
	    !this.routeIsSecurityException(serviceData.type, serviceData.name) && //проверяем права доступа
	    !this.validateCredentials(this.getCredentials(msg))) {
	      throw new Error(CONST.ERR_MSG.MSG_CREDENTIALS_IS_NOT_VALID);
	    }

	    if (!this.validateType(this.getType(msg))) {
	      throw new Error(CONST.ERR_MSG.MSG_TYPE_IS_NOT_VALID);
	    }

	    if (!this.validateTypeAndName(this.getType(msg), this.getName(msg))) {
	      throw new Error(CONST.ERR_MSG.MSG_NAME_IS_NOT_VALID);
	    }

	    return msg;
	  }

	}

	//imports
	// - host       - Адрес сервиса
	// - port       - Порт сервиса
	// - doLogout   - Метод выхода из системы.
	// - fcCallback - коллбэк вызываемый при первом подключении

	class notWSClient extends EventEmitter {
	  constructor({
	    options,
	    messenger,
	    router
	  }) {
	    super();
	    let logger = options.logger; //Основные параметры

	    this.options = options; //Параметры клиентского подключения
	    //Подключение к WS service TMA

	    this.ws = null; //Подключение к websocket серверу.

	    this.connCount = 0; //Количество неудачных попыток подключения к websocket серверу.

	    this.connCountMax = 10; //Количество попыток по превышении которого считаем что соединение с серверов разорвано.

	    this.errConnMsg = null; //Идентификатор сообщения об ошибке подключения к вебсокет серверу.

	    this.firstConn = true;
	    this.messenger = messenger ? messenger : new notWSMessage(options.messenger ? options.messenger : {});
	    this.router = router ? router : new notWSRouter();
	    this.router.on('updateToken', this.renewToken.bind(this));
	    this.jwtToken = null; //Токен авторизации.

	    this.jwtExpire = null; //Время до истечения токена.

	    this.jwtDate = null; //Дата создания токена.
	    //logging

	    this.logMsg = logger ? logger.log : LOG.genLogMsg(this.__name);
	    this.logDebug = logger ? logger.debug : LOG.genLogDebug(this.__name);
	    this.logError = logger ? logger.error : LOG.genLogError(this.__name); //requests processing

	    this.requests = []; //Список текущих запросов к API.

	    this.reqTimeout = 15000; //Таймаут для выполнения запросов.

	    this.reqChkTimer = null; //Таймер для проверки таймаутов выполнения запросов.

	    this.reqChkStep = 2000; //Таймер для проверки таймаутов выполнения запросов.

	    window.onunload = this.disconnect.bind(this);
	    window.onbeforeunload = this.disconnect.bind(this);
	    this.connect();
	  } //Отключение от ws сервиса.


	  disconnect() {
	    this.logMsg(`Отключение от сервера...`);

	    if (this.ws) {
	      //заменяем метод для onclose на пустую функцию.
	      this.ws.onclose = function () {}; //закрываем подключение.


	      this.ws.close();
	      this.stopReqChckTimer();
	    } else {
	      //eslint-disable-next-line no-console
	      console.trace();
	    }
	  } //Получение токена.
	  //Возможно реализовать разными способами, поэтому выделено в отдельный метод.


	  getToken(renew = false) {
	    let token = localStorage.getItem('token');

	    if (typeof token !== 'undefined' && token && !renew) {
	      return Promise.resolve(token);
	    } else {
	      if (LOG.isFunc(this.options.getToken)) {
	        return this.options.getToken();
	      } else {
	        return Promise.reject();
	      }
	    }
	  }

	  async renewToken() {
	    try {
	      let token = await this.getToken(true);

	      if (token) {
	        this.saveToken(token);
	      } else {
	        throw new Error('Token isn\'t renewed');
	      }
	    } catch (e) {
	      this.logError(e);
	    }
	  }

	  saveToken(token) {
	    localStorage.setItem('token', token);
	    this.jwtToken = token;
	    this.messenger.setCredentials(token);
	    this.emit('tokenUpdated', token);
	  } //набор методов для работы с запросами и выявления безответных
	  //Запуск таймера проверки запросов.


	  startReqChckTimer() {
	    clearTimeout(this.reqChkTimer);
	    this.reqChkTimer = setTimeout(this.checkRequests.bind(this), this.reqChkStep);
	  }

	  stopReqChckTimer() {
	    clearTimeout(this.reqChkTimer);
	  } //Поиск запроса по uuid


	  findRequest(id) {
	    for (let i = 0; i < this.requests.length; i++) {
	      if (this.requests[i].id === id) {
	        return i;
	      }
	    }

	    return false;
	  }

	  extortRequest(id) {
	    let reqIndex = this.findRequest(id);

	    if (reqIndex === false) {
	      this.logMsg(`failed to find request for response ${id}`);
	      return null;
	    }

	    let request = this.requests[reqIndex]; //Удаление элемента из списка запросов.

	    this.requests.splice(reqIndex, 1); //Выполнение callback'а запроса.

	    if (LOG.isFunc(request.cb)) {
	      return request;
	    } else {
	      return null;
	    }
	  }

	  addRequest(id, callback) {
	    this.requests.push({
	      id,
	      //Идентификатор запроса.
	      time: Date.now(),
	      //Время отправки запроса.
	      cb: callback //callback для обработки результатов запроса.

	    });
	  } //Проверка списка запросов.


	  checkRequests() {
	    //Формирование списка запросов для удаления по таймауту.
	    let list = [];
	    let now = Date.now();
	    this.requests.forEach(req => {
	      let reqAge = now - req.time;

	      if (reqAge > this.reqTimeout) {
	        list.push(req.id);
	      }
	    }); //Удаление запросов по таймауту.

	    list.forEach(reqId => {
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
	  } //Обработчик сообщений пришедших от сервера.
	  //msg - это messageEvent пришедший по WS, соответственно данные лежат в msg.data.


	  onMessage(msgEv) {
	    try {
	      this.logDebug(msgEv); //проверяем не "понг" ли это, если так - выходим

	      if (this.checkPingMsg(msgEv)) {
	        return;
	      }

	      let data = LOG.tryParseJSON(msgEv.data); //Не удалось распарсить ответ от сервера как JSON

	      if (!data) {
	        this.logMsg(`получено сообщение от сервера:${msgEv.data}`);
	        return;
	      }

	      this.messenger.validate(data);
	      let msg = this.messenger.unpack(data);

	      if (msg.service.type === CONST.MSG_TYPE.RESPONSE) {
	        let request = this.extortRequest(msg.service.id);

	        if (request !== null) {
	          request.cb(msg);
	        }
	      } else if (msg.service.type === CONST.MSG_TYPE.EVENT) {
	        this.emit('remote.' + msg.service.name, msg.service, msg.payload, this.ws);
	      } else {
	        this.router.route(msg.service, msg.payload, this.ws).then(responseData => {
	          this.respond(responseData, {
	            id: msg.service.id,
	            type: CONST.MSG_TYPE.RESPONSE,
	            name: msg.service.name
	          });
	        }).catch(e => {
	          this.logError(e);
	          this.respond({}, {
	            id: msg.service.id,
	            type: CONST.MSG_TYPE.RESPONSE,
	            name: msg.service.name
	          }, e);
	        });
	      }
	    } catch (e) {
	      this.logError(e);
	    }
	  } //Подключение к websocket сервису.


	  async connect() {
	    try {
	      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
	        this.disconnect();
	      }

	      this.isAlive = true;
	      this.logMsg(`Подключение к WebSocket серверу...`); //Счётчик колиества попыток подключения:

	      this.connCount++; //Загружаем информацию о токене и пытаемся подключиться к вебсокет сервису.

	      if (this.isSecure()) {
	        this.saveToken((await this.getToken()));
	      }

	      let connURI = this.getConnectURI();
	      this.logMsg('Connecting to: ', connURI);
	      this.ws = new WebSocket(connURI);
	      this.ws.onopen = this.onOpen.bind(this);
	      this.ws.error = this.onError.bind(this);
	    } catch (e) {
	      //eslint-disable-next-line no-console
	      this.logError(e);
	      this.scheduleReconnect();
	    }
	  }

	  onOpen() {
	    this.logMsg('Установлено подключение к WebSocket серверу.'); //Сбрасываем счётчик количества попыток подключения и данные об ошибках.

	    this.connCount = 0;
	    this.isAlive = true;
	    clearInterval(this.connectTimeout);
	    this.connectTimeout = false;
	    this.errConnMsg = null;
	    this.ws.onmessage = this.onMessage.bind(this);
	    this.ws.onclose = this.onClose.bind(this); //Запускаем таймер проверки списка запросов.

	    this.startReqChckTimer();
	    this.initPing();
	    this.emit('ready');
	  }

	  onError(err) {
	    if (this.connectTimeout) {
	      clearInterval(this.connectTimeout);
	      this.connectTimeout = false;
	    }

	    this.logError(err);
	    this.scheduleReconnect();
	  } //Обработчик закрытия подключения.


	  onClose(event) {
	    let reason = `${event.code}::` + CONST.mapWsCloseCodes(event);
	    this.logMsg(`подключение разорвано: ${reason}`);

	    if (this.isAutoReconnect()) {
	      this.scheduleReconnect();
	    }

	    this.stopReqChckTimer();
	  }

	  getConnectURI() {
	    let base = `ws://${this.options.host}:${this.options.port}/${this.options.path}`;

	    if (this.isSecure()) {
	      return `${base}?token=${this.jwtToken}`;
	    } else {
	      return base;
	    }
	  }

	  getReconnectTimeout() {
	    if (this.connCount >= this.connCountMax) {
	      return CONST.CLIENT_RECONNECT_TIMEOUT_LONG;
	    } else {
	      return CONST.CLIENT_RECONNECT_TIMEOUT;
	    }
	  }

	  scheduleReconnect() {
	    let timeout = this.getReconnectTimeout();
	    this.logMsg(`Планируем переподключение каждые ${timeout}мс`);
	    this.connectTimeout = setInterval(() => {
	      if (this.isAlive === false) {
	        if (this.ws.readyState === this.ws.CLOSED) {
	          this.connect();
	        }
	      }
	    }, timeout);
	  }
	  /**
	   *  Требуется аутентификация или нет
	   */


	  isSecure() {
	    return this.options.secure;
	  }

	  isAutoReconnect() {
	    if (typeof this.options.autoReconnect !== 'undefined') {
	      return this.options.autoReconnect;
	    } else {
	      return CONST.CLIENT_AUTO_RECONNECT;
	    }
	  }

	  initPing() {
	    if (this.options.ping) {
	      if (this.intPing) {
	        clearInterval(this.intPing);
	        this.intPing = false;
	      }

	      this.intPing = setInterval(this.sendPing.bind(this), this.options.pingTimeout || CONST.PING_TIMEOUT);
	    }
	  }

	  sendPing() {
	    this.logDebug('out ping', this.isAlive);

	    if (this.isAlive === false) {
	      this.logMsg('Connection is not alive (no pong). Terminating');
	      this.disconnect();
	      this.scheduleReconnect();
	      return;
	    }

	    this.isAlive = false;
	    this.ws.send('ping');
	  }

	  checkPingMsg(msgEv) {
	    if (msgEv.data === 'pong') {
	      this.logDebug('in pong');
	      this.isAlive = true;
	      return true;
	    }

	    return false;
	  }

	  respond(resp, service = {}, error) {
	    if (resp && typeof resp === 'object' && resp !== null) {
	      let msg = this.options.messenger.pack(resp, service, error);
	      return this.sendMsg(msg);
	    } else {
	      return true;
	    }
	  }

	  isConnected() {
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
	          console.log('send message', data);
	          this.ws.send(JSON.stringify(data), err => {
	            if (err) {
	              this.state = CONST.STATE.ERRORED;
	              reject(err);
	            } else {
	              resolve();
	            }
	          });
	        } else {
	          this.logDebug('Failed to send message to ws client, connection is in state: ' + CONST.STATE_NAME[this.state] + '!'); //this.addToHistory(data);

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


	  send(type, name, payload) {
	    if (type === CONST.MSG_TYPE.REQUEST) {
	      return this.sendRequest(name, payload);
	    } else {
	      return this.sendMessage(type, name, payload);
	    }
	  }

	  sendMessage(type, name, payload) {
	    this.logDebug('message', type, name, payload);
	    let message = this.messenger.pack(payload, {
	      type,
	      timeOffset: this.timeOffset,
	      name
	    });
	    return this.sendMsg(message).catch(this.logError.bind(this));
	  } //Отправка запроса на сервер.


	  sendRequest(name, payload) {
	    this.logDebug('request', name, payload);
	    return new Promise((res, rej) => {
	      try {
	        //Формирование данных запроса.
	        let req = this.messenger.pack(payload, {
	          type: 'request',
	          timeOffset: this.timeOffset,
	          name
	        }); //Добавление запроса в список отправленных запросов.

	        this.addRequest(this.messenger.getServiceData(req).id, res); //Отправка запроса на сервер.

	        this.ws.send(JSON.stringify(req));
	      } catch (e) {
	        this.logError(e);
	        rej(e);
	      }
	    });
	  }

	}

	return notWSClient;

}());
