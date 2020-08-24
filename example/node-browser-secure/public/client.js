var notWSClient = (function () {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var EventEmitter$1 = createCommonjsModule(function (module) {
	(function (exports) {

	    /**
	     * Class for managing events.
	     * Can be extended to provide event functionality in other classes.
	     *
	     * @class EventEmitter Manages event registering and emitting.
	     */
	    function EventEmitter() {}

	    // Shortcuts to improve speed and size
	    var proto = EventEmitter.prototype;
	    var originalGlobalValue = exports.EventEmitter;

	    /**
	     * Finds the index of the listener for the event in its storage array.
	     *
	     * @param {Function[]} listeners Array of listeners to search through.
	     * @param {Function} listener Method to look for.
	     * @return {Number} Index of the specified listener, -1 if not found
	     * @api private
	     */
	    function indexOfListener(listeners, listener) {
	        var i = listeners.length;
	        while (i--) {
	            if (listeners[i].listener === listener) {
	                return i;
	            }
	        }

	        return -1;
	    }

	    /**
	     * Alias a method while keeping the context correct, to allow for overwriting of target method.
	     *
	     * @param {String} name The name of the target method.
	     * @return {Function} The aliased method
	     * @api private
	     */
	    function alias(name) {
	        return function aliasClosure() {
	            return this[name].apply(this, arguments);
	        };
	    }

	    /**
	     * Returns the listener array for the specified event.
	     * Will initialise the event object and listener arrays if required.
	     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
	     * Each property in the object response is an array of listener functions.
	     *
	     * @param {String|RegExp} evt Name of the event to return the listeners from.
	     * @return {Function[]|Object} All listener functions for the event.
	     */
	    proto.getListeners = function getListeners(evt) {
	        var events = this._getEvents();
	        var response;
	        var key;

	        // Return a concatenated array of all matching events if
	        // the selector is a regular expression.
	        if (evt instanceof RegExp) {
	            response = {};
	            for (key in events) {
	                if (events.hasOwnProperty(key) && evt.test(key)) {
	                    response[key] = events[key];
	                }
	            }
	        }
	        else {
	            response = events[evt] || (events[evt] = []);
	        }

	        return response;
	    };

	    /**
	     * Takes a list of listener objects and flattens it into a list of listener functions.
	     *
	     * @param {Object[]} listeners Raw listener objects.
	     * @return {Function[]} Just the listener functions.
	     */
	    proto.flattenListeners = function flattenListeners(listeners) {
	        var flatListeners = [];
	        var i;

	        for (i = 0; i < listeners.length; i += 1) {
	            flatListeners.push(listeners[i].listener);
	        }

	        return flatListeners;
	    };

	    /**
	     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
	     *
	     * @param {String|RegExp} evt Name of the event to return the listeners from.
	     * @return {Object} All listener functions for an event in an object.
	     */
	    proto.getListenersAsObject = function getListenersAsObject(evt) {
	        var listeners = this.getListeners(evt);
	        var response;

	        if (listeners instanceof Array) {
	            response = {};
	            response[evt] = listeners;
	        }

	        return response || listeners;
	    };

	    function isValidListener (listener) {
	        if (typeof listener === 'function' || listener instanceof RegExp) {
	            return true
	        } else if (listener && typeof listener === 'object') {
	            return isValidListener(listener.listener)
	        } else {
	            return false
	        }
	    }

	    /**
	     * Adds a listener function to the specified event.
	     * The listener will not be added if it is a duplicate.
	     * If the listener returns true then it will be removed after it is called.
	     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
	     *
	     * @param {String|RegExp} evt Name of the event to attach the listener to.
	     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.addListener = function addListener(evt, listener) {
	        if (!isValidListener(listener)) {
	            throw new TypeError('listener must be a function');
	        }

	        var listeners = this.getListenersAsObject(evt);
	        var listenerIsWrapped = typeof listener === 'object';
	        var key;

	        for (key in listeners) {
	            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
	                listeners[key].push(listenerIsWrapped ? listener : {
	                    listener: listener,
	                    once: false
	                });
	            }
	        }

	        return this;
	    };

	    /**
	     * Alias of addListener
	     */
	    proto.on = alias('addListener');

	    /**
	     * Semi-alias of addListener. It will add a listener that will be
	     * automatically removed after its first execution.
	     *
	     * @param {String|RegExp} evt Name of the event to attach the listener to.
	     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.addOnceListener = function addOnceListener(evt, listener) {
	        return this.addListener(evt, {
	            listener: listener,
	            once: true
	        });
	    };

	    /**
	     * Alias of addOnceListener.
	     */
	    proto.once = alias('addOnceListener');

	    /**
	     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
	     * You need to tell it what event names should be matched by a regex.
	     *
	     * @param {String} evt Name of the event to create.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.defineEvent = function defineEvent(evt) {
	        this.getListeners(evt);
	        return this;
	    };

	    /**
	     * Uses defineEvent to define multiple events.
	     *
	     * @param {String[]} evts An array of event names to define.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.defineEvents = function defineEvents(evts) {
	        for (var i = 0; i < evts.length; i += 1) {
	            this.defineEvent(evts[i]);
	        }
	        return this;
	    };

	    /**
	     * Removes a listener function from the specified event.
	     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
	     *
	     * @param {String|RegExp} evt Name of the event to remove the listener from.
	     * @param {Function} listener Method to remove from the event.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.removeListener = function removeListener(evt, listener) {
	        var listeners = this.getListenersAsObject(evt);
	        var index;
	        var key;

	        for (key in listeners) {
	            if (listeners.hasOwnProperty(key)) {
	                index = indexOfListener(listeners[key], listener);

	                if (index !== -1) {
	                    listeners[key].splice(index, 1);
	                }
	            }
	        }

	        return this;
	    };

	    /**
	     * Alias of removeListener
	     */
	    proto.off = alias('removeListener');

	    /**
	     * Adds listeners in bulk using the manipulateListeners method.
	     * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
	     * You can also pass it a regular expression to add the array of listeners to all events that match it.
	     * Yeah, this function does quite a bit. That's probably a bad thing.
	     *
	     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
	     * @param {Function[]} [listeners] An optional array of listener functions to add.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.addListeners = function addListeners(evt, listeners) {
	        // Pass through to manipulateListeners
	        return this.manipulateListeners(false, evt, listeners);
	    };

	    /**
	     * Removes listeners in bulk using the manipulateListeners method.
	     * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	     * You can also pass it an event name and an array of listeners to be removed.
	     * You can also pass it a regular expression to remove the listeners from all events that match it.
	     *
	     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
	     * @param {Function[]} [listeners] An optional array of listener functions to remove.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.removeListeners = function removeListeners(evt, listeners) {
	        // Pass through to manipulateListeners
	        return this.manipulateListeners(true, evt, listeners);
	    };

	    /**
	     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
	     * The first argument will determine if the listeners are removed (true) or added (false).
	     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
	     * You can also pass it an event name and an array of listeners to be added/removed.
	     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
	     *
	     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
	     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
	     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
	        var i;
	        var value;
	        var single = remove ? this.removeListener : this.addListener;
	        var multiple = remove ? this.removeListeners : this.addListeners;

	        // If evt is an object then pass each of its properties to this method
	        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
	            for (i in evt) {
	                if (evt.hasOwnProperty(i) && (value = evt[i])) {
	                    // Pass the single listener straight through to the singular method
	                    if (typeof value === 'function') {
	                        single.call(this, i, value);
	                    }
	                    else {
	                        // Otherwise pass back to the multiple function
	                        multiple.call(this, i, value);
	                    }
	                }
	            }
	        }
	        else {
	            // So evt must be a string
	            // And listeners must be an array of listeners
	            // Loop over it and pass each one to the multiple method
	            i = listeners.length;
	            while (i--) {
	                single.call(this, evt, listeners[i]);
	            }
	        }

	        return this;
	    };

	    /**
	     * Removes all listeners from a specified event.
	     * If you do not specify an event then all listeners will be removed.
	     * That means every event will be emptied.
	     * You can also pass a regex to remove all events that match it.
	     *
	     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.removeEvent = function removeEvent(evt) {
	        var type = typeof evt;
	        var events = this._getEvents();
	        var key;

	        // Remove different things depending on the state of evt
	        if (type === 'string') {
	            // Remove all listeners for the specified event
	            delete events[evt];
	        }
	        else if (evt instanceof RegExp) {
	            // Remove all events matching the regex.
	            for (key in events) {
	                if (events.hasOwnProperty(key) && evt.test(key)) {
	                    delete events[key];
	                }
	            }
	        }
	        else {
	            // Remove all listeners in all events
	            delete this._events;
	        }

	        return this;
	    };

	    /**
	     * Alias of removeEvent.
	     *
	     * Added to mirror the node API.
	     */
	    proto.removeAllListeners = alias('removeEvent');

	    /**
	     * Emits an event of your choice.
	     * When emitted, every listener attached to that event will be executed.
	     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
	     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
	     * So they will not arrive within the array on the other side, they will be separate.
	     * You can also pass a regular expression to emit to all events that match it.
	     *
	     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	     * @param {Array} [args] Optional array of arguments to be passed to each listener.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.emitEvent = function emitEvent(evt, args) {
	        var listenersMap = this.getListenersAsObject(evt);
	        var listeners;
	        var listener;
	        var i;
	        var key;
	        var response;

	        for (key in listenersMap) {
	            if (listenersMap.hasOwnProperty(key)) {
	                listeners = listenersMap[key].slice(0);

	                for (i = 0; i < listeners.length; i++) {
	                    // If the listener returns true then it shall be removed from the event
	                    // The function is executed either with a basic call or an apply if there is an args array
	                    listener = listeners[i];

	                    if (listener.once === true) {
	                        this.removeListener(evt, listener.listener);
	                    }

	                    response = listener.listener.apply(this, args || []);

	                    if (response === this._getOnceReturnValue()) {
	                        this.removeListener(evt, listener.listener);
	                    }
	                }
	            }
	        }

	        return this;
	    };

	    /**
	     * Alias of emitEvent
	     */
	    proto.trigger = alias('emitEvent');

	    /**
	     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
	     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
	     *
	     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
	     * @param {...*} Optional additional arguments to be passed to each listener.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.emit = function emit(evt) {
	        var args = Array.prototype.slice.call(arguments, 1);
	        return this.emitEvent(evt, args);
	    };

	    /**
	     * Sets the current value to check against when executing listeners. If a
	     * listeners return value matches the one set here then it will be removed
	     * after execution. This value defaults to true.
	     *
	     * @param {*} value The new value to check for when executing listeners.
	     * @return {Object} Current instance of EventEmitter for chaining.
	     */
	    proto.setOnceReturnValue = function setOnceReturnValue(value) {
	        this._onceReturnValue = value;
	        return this;
	    };

	    /**
	     * Fetches the current value to check against when executing listeners. If
	     * the listeners return value matches this one then it should be removed
	     * automatically. It will return true by default.
	     *
	     * @return {*|Boolean} The current value to check for or the default, true.
	     * @api private
	     */
	    proto._getOnceReturnValue = function _getOnceReturnValue() {
	        if (this.hasOwnProperty('_onceReturnValue')) {
	            return this._onceReturnValue;
	        }
	        else {
	            return true;
	        }
	    };

	    /**
	     * Fetches the events object and creates one if required.
	     *
	     * @return {Object} The events storage object.
	     * @api private
	     */
	    proto._getEvents = function _getEvents() {
	        return this._events || (this._events = {});
	    };

	    /**
	     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
	     *
	     * @return {Function} Non conflicting EventEmitter class.
	     */
	    EventEmitter.noConflict = function noConflict() {
	        exports.EventEmitter = originalGlobalValue;
	        return EventEmitter;
	    };

	    // Expose the class either via AMD, CommonJS or the global object
	    if ( module.exports){
	        module.exports = EventEmitter;
	    }
	    else {
	        exports.EventEmitter = EventEmitter;
	    }
	}(typeof window !== 'undefined' ? window : commonjsGlobal || {}));
	});

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

	/**
	* Routing for messages
	*
	*/

	class notWSRouter extends EventEmitter$1 {
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

	  getRoutes() {
	    return this.routes;
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

	    if (Object.prototype.hasOwnProperty.call(this.options.types, CONST.MSG_TYPE.REQUEST) && !Object.prototype.hasOwnProperty.call(this.options.types, CONST.MSG_TYPE.RESPONSE)) {
	      this.options.types[CONST.MSG_TYPE.RESPONSE] = this.options.types[CONST.MSG_TYPE.REQUEST];
	    }

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
	      let err = new Error(CONST.ERR_MSG.MSG_TYPE_IS_NOT_VALID);
	      err.details = {
	        type: this.getType(msg)
	      };
	      throw err;
	    }

	    if (!this.validateTypeAndName(this.getType(msg), this.getName(msg))) {
	      let err = new Error(CONST.ERR_MSG.MSG_NAME_IS_NOT_VALID);
	      err.details = {
	        type: this.getType(msg),
	        name: this.getName(msg)
	      };
	      throw err;
	    }

	    return msg;
	  }

	  enableRoute(route, name) {
	    if (!Object.prototype.hasOwnProperty.call(this.options, 'types')) {
	      this.options.types = {};
	    }

	    if (!Object.prototype.hasOwnProperty.call(this.options.types, route)) {
	      this.options.types[route] = [];
	    }

	    if (this.options.types[route].indexOf(name) === -1) {
	      this.options.types[route].push(name);
	    }

	    return this;
	  }

	  disableRoute(route, name) {
	    if (!Object.prototype.hasOwnProperty.call(this.options, 'types')) {
	      this.options.types = {};
	    }

	    if (!Object.prototype.hasOwnProperty.call(this.options.types, route)) {
	      this.options.types[route] = [];
	    }

	    if (this.options.types[route].indexOf(name) > -1) {
	      this.options.types[route].splice(this.options.types[route].indexOf(name), 1);
	    }

	    return this;
	  }

	}

	//imports
	// - host       - Адрес сервиса
	// - port       - Порт сервиса
	// - doLogout   - Метод выхода из системы.
	// - fcCallback - коллбэк вызываемый при первом подключении

	class notWSClient extends EventEmitter$1 {
	  constructor({
	    options,
	    messenger,
	    router
	  }) {
	    super();
	    let logger = options.logger; //Основные параметры

	    this.options = options; //Параметры клиентского подключения

	    this.__name = options.name ? options.name : 'WSClient'; //Подключение к WS service TMA

	    this.ws = null; //Подключение к websocket серверу.

	    this.connCount = 0; //Количество неудачных попыток подключения к websocket серверу.

	    this.connCountMax = 10; //Количество попыток по превышении которого считаем что соединение с серверов разорвано.

	    this.errConnMsg = null; //Идентификатор сообщения об ошибке подключения к вебсокет серверу.

	    this.firstConn = true;
	    this.messenger = messenger ? messenger : new notWSMessage(options.messenger ? options.messenger : {});
	    this.router = router ? router : new notWSRouter(options.router ? options.router : {});
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

	  fullfillRequest(id) {
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
	      //this.logDebug(msgEv);
	      //проверяем не "понг" ли это, если так - выходим
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
	      this.emit('message', msg);

	      if (msg.service.type === CONST.MSG_TYPE.RESPONSE) {
	        let request = this.fullfillRequest(msg.service.id);

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
	      this.logError(e, e.details);
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
	    //this.logDebug('out ping', this.isAlive);
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
	      //this.logDebug('in pong');
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
	    if (payload !== 'pong' && payload !== 'ping') {
	      this.logMsg('outgoing message', type, name);
	    }

	    let message = this.messenger.pack(payload, {
	      type,
	      timeOffset: this.timeOffset,
	      name
	    });
	    return this.sendMsg(message).catch(this.logError.bind(this));
	  } //Отправка запроса на сервер.


	  sendRequest(name, payload) {
	    this.logMsg('outgoing request', name);
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
