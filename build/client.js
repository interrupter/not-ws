var notWSClient = (function () {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var EventEmitter = createCommonjsModule(function (module) {
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
	const PING_TIMEOUT = 5000;
	const HEARTBEAT_INTERVAL = 5000;
	const CLIENT_RECONNECT_TIMEOUT = 5000;
	const CLIENT_RECONNECT_TIMEOUT_LONG = 30000;
	const TIME_OFFSET_REQUEST_INTERVAL = 5 * 60 * 1000;
	const CLIENT_AUTO_RECONNECT = true;
	const TOKEN_TTL = 1800;
	const TOKEN_RENEW_TTL = 300;
	const MSG_TYPE = {
	  REQUEST: 'request',
	  RESPONSE: 'response',
	  EVENT: 'event',
	  COMMAND: 'command'
	};
	const DEV_ENV = 'development';
	let [, hash] = location.hash.split('#');
	const ENV_TYPE = hash;
	var CONST = {
	  ENV_TYPE,
	  DEV_ENV,
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
	  TIME_OFFSET_REQUEST_INTERVAL,
	  MSG_TYPE,
	  TOKEN_TTL,
	  TOKEN_RENEW_TTL
	};

	//Проверка является ли переменная функцией.
	function isFunc(func) {
	  return typeof func === 'function';
	}

	function noop() {}

	function heartbeat() {
	  this._alive = true;
	}

	function ObjHas(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	} //Проверка строки на JSON(со stackoverflow).
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

	function isArray(val) {
	  return Array.isArray(val);
	}

	let capitalizeFirstLetter = function (name) {
	  return name.charAt(0).toUpperCase() + name.slice(1);
	};

	var Func = {
	  isFunc,
	  isArray,
	  noop,
	  heartbeat,
	  ObjHas,
	  tryParseJSON,
	  capitalizeFirstLetter
	};

	/**
	* Routing for messages
	*
	*/

	class notWSRouter extends EventEmitter {
	  constructor({
	    name,
	    routes = {},
	    logger
	  }) {
	    super();
	    this.__name = name || 'notWSRouter';
	    this.logMsg = logger ? logger.log : () => {};
	    this.logDebug = logger ? logger.debug : () => {};
	    this.logError = logger ? logger.error : () => {};
	    this.routes = {
	      __service: {
	        updateToken: () => {
	          this.emit('updateToken');
	          return Promise.resolve();
	        }
	      },
	      test: {
	        sayHello: () => {
	          this.logMsg('Say hello for test route!');
	          return Promise.resolve(true);
	        }
	      },
	      request: {
	        auth: () => {
	          this.logMsg('request.auth');
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
	    @params {object}  client  WS Connection
	    @returns  {Promise} from targeted action or throwing Error if route doesn't exist
	  */


	  route({
	    type,
	    name,
	    cred
	  }, data, client) {
	    if (Func.ObjHas(this.routes, type) && Func.ObjHas(this.routes[type], name)) {
	      this.logMsg('ip:', client.getIP(), type, name);
	      return this.routes[type][name]({
	        data,
	        cred,
	        client
	      });
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

	    if (Func.ObjHas(this.routes, type)) {
	      this.routes[type] = Object.assign(this.routes[type], routes);
	    } else {
	      this.routes[type] = routes;
	    }

	    return this;
	  }

	  unsetRoutesForType(type, list = []) {
	    this.validateType(type);
	    this.validateRoutesList(list);

	    if (Func.ObjHas(this.routes, type)) {
	      for (let name of list) {
	        if (Func.ObjHas(this.routes[type], name)) {
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

	// Unique ID creation requires a high quality random # generator. In the browser we therefore
	// require the crypto API and do not support built-in fallback to lower quality random number
	// generators (like Math.random()).
	var getRandomValues;
	var rnds8 = new Uint8Array(16);
	function rng() {
	  // lazy load so that environments that need to polyfill have a chance to do so
	  if (!getRandomValues) {
	    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
	    // find the complete implementation of crypto (msCrypto) on IE11.
	    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

	    if (!getRandomValues) {
	      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
	    }
	  }

	  return getRandomValues(rnds8);
	}

	var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

	function validate(uuid) {
	  return typeof uuid === 'string' && REGEX.test(uuid);
	}

	/**
	 * Convert array of 16 byte values to UUID string format of the form:
	 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
	 */

	var byteToHex = [];

	for (var i = 0; i < 256; ++i) {
	  byteToHex.push((i + 0x100).toString(16).substr(1));
	}

	function stringify(arr) {
	  var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
	  // Note: Be careful editing this code!  It's been tuned for performance
	  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
	  var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
	  // of the following:
	  // - One or more input array values don't map to a hex octet (leading to
	  // "undefined" in the uuid)
	  // - Invalid input values for the RFC `version` or `variant` fields

	  if (!validate(uuid)) {
	    throw TypeError('Stringified UUID is invalid');
	  }

	  return uuid;
	}

	function v4(options, buf, offset) {
	  options = options || {};
	  var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

	  rnds[6] = rnds[6] & 0x0f | 0x40;
	  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

	  if (buf) {
	    offset = offset || 0;

	    for (var i = 0; i < 16; ++i) {
	      buf[offset + i] = rnds[i];
	    }

	    return buf;
	  }

	  return stringify(rnds);
	}

	/**
	 * set of default options
	 */

	const DEFAULT_OPTIONS = {
	  validateType: true,
	  //validation of message type
	  validateTypeAndName: true,
	  //validation of message type and name
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

	class notWSMessenger extends EventEmitter {
	  constructor(options = {}) {
	    super();
	    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

	    if (Func.ObjHas(this.options.types, CONST.MSG_TYPE.REQUEST) && !Func.ObjHas(this.options.types, CONST.MSG_TYPE.RESPONSE)) {
	      this.options.types[CONST.MSG_TYPE.RESPONSE] = this.options.types[CONST.MSG_TYPE.REQUEST];
	    }

	    return this;
	  }

	  setCredentials(credentials) {
	    this.options.credentials = credentials;
	    return this;
	  }

	  getServiceData(msg) {
	    if (Func.ObjHas(msg, 'service')) {
	      return msg.service;
	    } else {
	      return {
	        id: msg.id,
	        time: msg.time,
	        type: msg.type,
	        name: msg.name
	      };
	    }
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
	      id: v4(),
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
	    if (this.options.types && Func.ObjHas(this.options.types, type)) {
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

	    if (!validate(serviceData.id)) {
	      throw new Error(CONST.ERR_MSG.MSG_ID_IS_NOT_VALID);
	    }

	    if ( //если не в списке исключений
	    !this.routeIsSecurityException(serviceData.type, serviceData.name) && //проверяем права доступа
	    !this.validateCredentials(this.getCredentials(msg))) {
	      throw new Error(CONST.ERR_MSG.MSG_CREDENTIALS_IS_NOT_VALID);
	    }

	    if (this.options.validateType) {
	      if (!this.validateType(this.getType(msg))) {
	        let err = new Error(CONST.ERR_MSG.MSG_TYPE_IS_NOT_VALID);
	        err.details = {
	          type: this.getType(msg)
	        };
	        throw err;
	      }
	    }

	    if (this.options.validateTypeAndName) {
	      if (!this.validateTypeAndName(this.getType(msg), this.getName(msg))) {
	        let err = new Error(CONST.ERR_MSG.MSG_NAME_IS_NOT_VALID);
	        err.details = {
	          type: this.getType(msg),
	          name: this.getName(msg)
	        };
	        throw err;
	      }
	    }

	    return msg;
	  }

	  enableRoute(route, name) {
	    if (!Func.ObjHas(this.options, 'types')) {
	      this.options.types = {};
	    }

	    if (!Func.ObjHas(this.options.types, route)) {
	      this.options.types[route] = [];
	    }

	    if (this.options.types[route].indexOf(name) === -1) {
	      this.options.types[route].push(name);
	    }

	    return this;
	  }

	  disableRoute(route, name) {
	    if (!Func.ObjHas(this.options, 'types')) {
	      return this;
	    }

	    if (!Func.ObjHas(this.options.types, route)) {
	      return this;
	    }

	    if (this.options.types[route].indexOf(name) > -1) {
	      this.options.types[route].splice(this.options.types[route].indexOf(name), 1);
	    }

	    return this;
	  }

	}

	//imports
	const SYMBOL_ACTIVITY$1 = Symbol('activity');
	const SYMBOL_STATE$1 = Symbol('state');
	const MAX_HISTORY_DEPTH = 40;
	const DEFAULT_OPTIONS$1 = {
	  secure: true,
	  reconnect: true,
	  ping: true,
	  count: true
	};

	class notWSConnection extends EventEmitter {
	  constructor(options, slave = false) {
	    super();
	    this.options = Object.assign({}, DEFAULT_OPTIONS$1, options);

	    if (this.options.ws) {
	      this.ws = options.ws;
	      delete options.ws;

	      if (this.ws.readyState === 1) {
	        this.setAlive(); //результат пинг запросов

	        this[SYMBOL_STATE$1] = CONST.STATE.CONNECTED;

	        if (this.options.secure) {
	          this[SYMBOL_STATE$1] = CONST.STATE.AUTHORIZED;
	        }
	      } else {
	        this[SYMBOL_STATE$1] = CONST.STATE.NOT_CONNECTED;
	        this.setDead(); //результат пинг запросов
	      }
	    } else {
	      this[SYMBOL_STATE$1] = CONST.STATE.NOT_CONNECTED;
	      this.setDead(); //результат пинг запросов

	      this.ws = null; //Подключение к websocket серверу.
	    }

	    this[SYMBOL_ACTIVITY$1] = CONST.ACTIVITY.IDLE; //if was terminated

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
	    this.bindSocketEvents(); //message history

	    this.history = [];
	    this.passed = {
	      in: 0,
	      out: 0
	    };
	    return this;
	  }

	  getStatus() {
	    return {
	      state: CONST.STATE_NAME[this[SYMBOL_STATE$1]],
	      activity: CONST.ACTIVITY_NAME[this[SYMBOL_ACTIVITY$1]],
	      isAlive: this.isAlive(),
	      isTerminated: this.isTerminated,
	      isReconnecting: this.isReconnecting,
	      in: this.passed.in,
	      out: this.paased.out
	    };
	  }

	  getSocket() {
	    return this.ws;
	  }

	  getIP() {
	    if (this.isOpen() && this.ws._socket && this.ws._socket.remoteAddress) {
	      return this.ws._socket.remoteAddress;
	    } else {
	      return false;
	    }
	  }

	  bindSocketEvents() {
	    if (this.ws) {
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

	  bindEnvEvents() {
	    window.onunload = this.disconnect.bind(this);
	    window.onbeforeunload = this.disconnect.bind(this);
	  } //Отключение от ws сервиса.


	  disconnect() {
	    this.emit('diconnecting');

	    if (this.ws) {
	      //заменяем метод для onclose на пустую функцию.
	      this.ws.onclose = Func.noop;
	      this.ws.onerror = Func.noop;
	      this.ws.onmessage = Func.noop;
	      this.ws.onopen = Func.noop; //закрываем подключение.

	      this.ws.close && this.ws.close();
	      this.terminate();
	    }
	  }

	  terminate() {
	    if (this.connectInterval) {
	      clearInterval(this.connectInterval);
	    }

	    if (this.ws) {
	      this.activity = CONST.ACTIVITY.TERMINATING;
	      this.ws.terminate && this.ws.terminate();
	    }

	    this.isTerminated = true;
	    this.ws = null;

	    if (this.state !== CONST.STATE.NOT_CONNECTED) {
	      this.state = CONST.STATE.NOT_CONNECTED;
	    }

	    this.setDead();
	  } //Подключение к websocket сервису.


	  async connect() {
	    try {
	      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
	        this.disconnect();
	      }

	      this.setAlive();
	      this.isTerminated = false; //Счётчик колиества попыток подключения:

	      this.connCount++; //пытаемся подключиться к вебсокет сервису.

	      let connURI = this.getConnectURI();
	      this.emit('connectURI', connURI);
	      this.activity = CONST.ACTIVITY.CONNECTING;
	      this.ws = new WebSocket(connURI);
	      this.bindSocketEvents();
	    } catch (e) {
	      this.emit('error', e);
	      this.scheduleReconnect();
	    }
	  }

	  setHalfDead() {
	    if (this._alive) {
	      this._alive = false;
	    } else {
	      this.setDead();
	    }
	  }

	  setAlive() {
	    this._alive = true;
	    this.alive = true;
	  }

	  setDead() {
	    this.alive = false;
	  }

	  isAlive() {
	    return this.alive;
	  }

	  isDead() {
	    return !this.alive;
	  }

	  getConnectURI() {
	    let protocol = 'ws';

	    if (this.options.protocol) {
	      protocol = this.options.protocol;
	    } else {
	      if (this.options.ssl) {
	        protocol = 'wss';
	      }
	    }

	    let base = `${protocol}://${this.options.host}`;

	    if (this.options.port && parseInt(this.options.port) !== 80) {
	      base = `${base}:${this.options.port}/${this.options.path}`;
	    } else {
	      base = `${base}/${this.options.path}`;
	    }

	    if (this.isSecure()) {
	      return `${base}?token=${this.jwtToken}`;
	    } else {
	      return base;
	    }
	  }

	  setToken(token) {
	    this.jwtToken = token;
	  }

	  onOpen() {
	    //Сбрасываем счётчик количества попыток подключения и данные об ошибках.
	    this.connCount = 0;
	    this.setAlive();
	    clearInterval(this.connectInterval);
	    this.connectInterval = false;
	    this.errConnMsg = null;
	    this.state = CONST.STATE.CONNECTED;

	    if (this.isSecure()) {
	      this.state = CONST.STATE.AUTHORIZED;
	    }

	    this.initPing();
	    this.emit('ready');
	    this.sendAllFromHistory();
	  } //Обработчик сообщений пришедших от сервера.
	  //msg - это messageEvent пришедший по WS, соответственно данные лежат в msg.data.


	  onMessage(input) {
	    try {
	      this.countPassed(input, 'in'); //проверяем не "понг" ли это, если так - выходим

	      let rawMsg = input.data;

	      if (this.checkPingMsg(rawMsg)) {
	        return;
	      }

	      let data = Func.tryParseJSON(rawMsg); //Не удалось распарсить ответ от сервера как JSON

	      if (!data) {
	        this.emit('messageInWronFormat', rawMsg);
	        return;
	      }

	      this.emit('message', data);
	    } catch (e) {
	      this.emit('error', e);
	    }
	  }

	  onError(err) {
	    if (this.connectInterval) {
	      clearInterval(this.connectInterval);
	      this.connectInterval = false;
	    }

	    if (this.activity === CONST.ACTIVITY.TERMINATING) {
	      this.state = CONST.STATE.NOT_CONNECTED;
	    } else {
	      this.state = CONST.STATE.ERRORED;
	    }

	    this.emit('error', err);
	  } //Обработчик закрытия подключения.


	  onClose(event) {
	    if (typeof event.code !== 'undefined') {
	      let reason = `${event.code}::` + CONST.mapWsCloseCodes(event);
	      this.emit('close', reason);
	    } else {
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

	  getReconnectTimeout() {
	    if (this.connCount >= this.connCountMax) {
	      return CONST.CLIENT_RECONNECT_TIMEOUT_LONG;
	    } else {
	      return CONST.CLIENT_RECONNECT_TIMEOUT;
	    }
	  }

	  scheduleReconnect() {
	    if (!this.slave) {
	      let timeout = this.getReconnectTimeout();
	      this.emit('reconnectiningEvery', timeout);

	      if (this.connectInterval) {
	        clearInterval(this.connectInterval);
	      }

	      this.connectInterval = setInterval(this.performReconnect.bind(this), timeout);
	    }
	  }

	  performReconnect() {
	    if (!this.ws || this.ws.readyState === this.ws.CLOSED) {
	      this.connect();
	    }
	  }

	  reconnect() {
	    if (!this.slave) {
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

	  isAutoReconnect() {
	    if (this.slave) {
	      return false;
	    } else {
	      if (typeof this.options.reconnect !== 'undefined') {
	        return this.options.reconnect;
	      } else {
	        return CONST.CLIENT_AUTO_RECONNECT;
	      }
	    }
	  }
	  /**
	   *  Returns true if user connected, if secure===true,
	   *  then client should be authentificated too
	   *  @params {boolean} secure      if user should be connected and authenticated
	   */


	  isConnected(secure = true) {
	    if (this.ws && this.isAlive()) {
	      if (secure) {
	        return this.isConnectionSecure();
	      } else {
	        return true;
	      }
	    } else {
	      return false;
	    }
	  }

	  isConnectionSecure() {
	    let state = CONST.STATE.CONNECTED;

	    if (this.isSecure()) {
	      state = CONST.STATE.AUTHORIZED;
	    }

	    return this.state === state && this.ws.readyState === 1; // 1- OPEN
	  }

	  isOpen() {
	    return this.ws && this.ws.readyState === 1;
	  }

	  isMessageTokenUpdateRequest(data) {
	    return data.type === '__service' && data.name === 'updateToken';
	  }

	  initPing() {
	    //if server side client, only react on pong
	    if (this.slave) {
	      this.on('pong', Func.heartbeat);
	    } else {
	      //if client send ping requests
	      if (this.options.ping) {
	        if (this.pingInterval) {
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


	  sendPing() {
	    if (!this.isAlive()) {
	      this.emit('noPong');

	      if (this.state === CONST.STATE.CONNECTED) {
	        this.state = CONST.STATE.NOT_CONNECTED;
	      }

	      return;
	    }

	    this.setHalfDead();
	    this.ping();
	  }

	  pong() {
	    if (this.isOpen()) {
	      this.wsSend('pong');
	      this.emit('pong');
	    }
	  }
	  /**
	  * Ping connection
	  */


	  ping() {
	    if (this.isOpen()) {
	      this.wsSend('ping').catch(Func.noop);
	      this.emit('ping');
	    }
	  }
	  /**
	  * If message is plain text 'pong', then it sets connections as isAlive
	  * @params {string}  msg   incoming message
	  * @returns {boolean}  if it 'pong' message
	  **/


	  checkPingMsg(msg) {
	    if (msg === 'ping') {
	      this.setAlive();
	      this.emit('pinged');
	      this.pong();
	      return true;
	    }

	    if (msg === 'pong') {
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
	      if (this.isConnected(secure) || this.isOpen() && this.isMessageTokenUpdateRequest(data)) {
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
	      let msg = this.history.shift(); //sending out but only in secure manner, all messages for not auth users will be dropped

	      this.send(msg, true).catch(this.onError.bind(this));
	    }
	  }
	  /**
	  * Finite states machine
	  */


	  get state() {
	    return this[SYMBOL_STATE$1];
	  }

	  set state(state = CONST.STATE.NOT_CONNECTED) {
	    if (Object.values(CONST.STATE).indexOf(state) > -1) {
	      this.emit('stateChange', state, CONST.STATE_NAME[state]); //для каждого варианта, есть только ограниченное кол-во вариантов перехода
	      //из "нет соединения" в "авторизован" не прыгнуть

	      switch (this[SYMBOL_STATE$1]) {
	        //можем только подключиться или вылететь с ошибкой подключения
	        case CONST.STATE.NOT_CONNECTED:
	          if ([CONST.STATE.CONNECTED, CONST.STATE.ERRORED].indexOf(state) > -1) {
	            this[SYMBOL_STATE$1] = state;
	            this.activity = CONST.ACTIVITY.IDLE;
	          } else {
	            throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE$1]] + ' -> ' + CONST.STATE_NAME[state]);
	          }

	          break;
	        //можем повиснуть, авторизоваться вылететь с ошибкой

	        case CONST.STATE.CONNECTED:
	          if ([CONST.STATE.AUTHORIZED, CONST.STATE.NO_PING, CONST.STATE.ERRORED, CONST.STATE.NOT_CONNECTED].indexOf(state) > -1) {
	            this[SYMBOL_STATE$1] = state;
	            this.activity = CONST.ACTIVITY.IDLE;
	          } else {
	            throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE$1]] + ' -> ' + CONST.STATE_NAME[state]);
	          }

	          break;
	        //можем потерять авторизацию, но продолжить висеть на линии
	        //повиснуть
	        //вылететь с ошибкой связи

	        case CONST.STATE.AUTHORIZED:
	          if ([CONST.STATE.CONNECTED, CONST.STATE.NO_PING, CONST.STATE.ERRORED, CONST.STATE.NOT_CONNECTED].indexOf(state) > -1) {
	            this[SYMBOL_STATE$1] = state;
	            this.activity = CONST.ACTIVITY.IDLE;
	          } else {
	            throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE$1]] + ' -> ' + CONST.STATE_NAME[state]);
	          }

	          break;
	        ////из остояний разрыва связи, можно уйти только в "не подключен"
	        //можем только отключиться

	        case CONST.STATE.NO_PING:
	          if ([CONST.STATE.NOT_CONNECTED].indexOf(state) > -1) {
	            this[SYMBOL_STATE$1] = state;
	            this.activity = CONST.ACTIVITY.IDLE;
	          } else {
	            throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE$1]] + ' -> ' + CONST.STATE_NAME[state]);
	          }

	          break;
	        //можем только отключиться

	        case CONST.STATE.ERRORED:
	          if ([CONST.STATE.NOT_CONNECTED, CONST.STATE.ERRORED].indexOf(state) > -1) {
	            this[SYMBOL_STATE$1] = state;
	            this.activity = CONST.ACTIVITY.IDLE;
	          } else {
	            throw new Error('Wrong state transition: ' + CONST.STATE_NAME[this[SYMBOL_STATE$1]] + ' -> ' + CONST.STATE_NAME[state]);
	          }

	          break;
	      }

	      switch (this[SYMBOL_STATE$1]) {
	        case CONST.STATE.NOT_CONNECTED:
	          //если идём на обрыв, то переподключение не запускаем
	          this.emit('disconnected');

	          if (this.isAlive()) {
	            this.emit('beforeReconnect');
	            this.reconnect();
	          } else {
	            if (this.isAutoReconnect()) {
	              this.scheduleReconnect();
	            }
	          }

	          break;

	        case CONST.STATE.CONNECTED:
	          this.emit('connected');
	          break;

	        case CONST.STATE.AUTHORIZED:
	          this.emit('authorized');
	          break;

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
	      throw new Error('set: Unknown notWSServerClient state: ' + state);
	    }
	  }

	  get activity() {
	    return this[SYMBOL_ACTIVITY$1];
	  } //

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
	      this.emit('changeActivity', activity, CONST.ACTIVITY_NAME[activity]); //для каждого варианта, есть только ограниченное кол-во вариантов перехода
	      //из "нет соединения" в "авторизован" не прыгнуть

	      switch (this[SYMBOL_ACTIVITY$1]) {
	        //можем только подключиться
	        case CONST.ACTIVITY.IDLE:
	          if ([CONST.ACTIVITY.CONNECTING, CONST.ACTIVITY.CLOSING, CONST.ACTIVITY.TERMINATING, CONST.ACTIVITY.AUTHORIZING].indexOf(activity) > -1) {
	            this[SYMBOL_ACTIVITY$1] = activity;
	          }

	          break;

	        case CONST.ACTIVITY.CONNECTING:
	        case CONST.ACTIVITY.CLOSING:
	        case CONST.ACTIVITY.TERMINATING:
	        case CONST.ACTIVITY.AUTHORIZING:
	          if ([CONST.ACTIVITY.IDLE].indexOf(activity) > -1) {
	            this[SYMBOL_ACTIVITY$1] = activity;
	          }

	          break;
	      }

	      switch (this[SYMBOL_ACTIVITY$1]) {
	        case CONST.ACTIVITY.IDLE:
	          this.emit('idle', this);
	          break;

	        case CONST.ACTIVITY.CONNECTING:
	          this.emit('connecting', this);
	          break;

	        case CONST.ACTIVITY.AUTHORIZING:
	          this.emit('authorizing', this);
	          break;

	        case CONST.ACTIVITY.CLOSING:
	          this.emit('closing', this);
	          break;

	        case CONST.ACTIVITY.TERMINATING:
	          this.emit('terminating', this);
	          break;
	      }
	    } else {
	      throw new Error('set: Unknown notWSServerClient activity: ' + activity);
	    }
	  }

	  wsSend(msg) {
	    return new Promise((res, rej) => {
	      this.ws.send(this.countPassed(msg, 'out'), err => {
	        if (err) {
	          rej(err);
	        } else {
	          res();
	        }
	      });
	    });
	  }

	  countPassed(input, where) {
	    this.passed[where] += this.options.count ? this.getMessageSize(input) : 0;
	    return input;
	  }

	  getMessageSize(input) {
	    return new Blob([input]).size;
	  }

	  destroy() {
	    clearInterval(this.connectInterval);
	    clearInterval(this.pingInterval);
	    clearTimeout(this.disconnectTimeout);
	    this.emit('destroyed');
	    this.removeAllListeners();
	  }

	} //env dep export

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

	class notWSClient extends EventEmitter {
	  constructor({
	    name,
	    connection,
	    getToken,
	    messenger,
	    router,
	    logger,
	    identity,
	    //user information
	    credentials,
	    //client creds for access
	    slave = false,
	    debug = []
	  }) {
	    if (!router) {
	      throw new Error('Router is not set or is not instance of notWSRouter');
	    }

	    if (!(router instanceof notWSRouter)) {
	      router = new notWSRouter(router);
	    }

	    if (!messenger) {
	      throw new Error('Messenger is not set or is not instance of notWSMessenger');
	    }

	    if (!(messenger instanceof notWSMessenger)) {
	      messenger = new notWSMessenger(messenger);
	    }

	    super(); //Основные параметры

	    this.__name = name ? name : CONST.DEFAULT_CLIENT_NAME; //jwt

	    this.jwtToken = null; //Токен авторизации.

	    this.jwtExpire = null; //Время до истечения токена.

	    this.jwtDate = null; //Дата создания токена.
	    //setting envs

	    this.tokenGetter = getToken;
	    this.identity = identity;
	    this.credentials = credentials;
	    this.messenger = messenger;
	    this.router = router;
	    this.slave = slave;
	    this.debug = debug; //Подключение к WS

	    this.initConnection(connection, this.slave);

	    if (!this.slave) {
	      this.router.on('updateToken', this.renewToken.bind(this));
	    } //common constructor part for client browser client, node client, node server client
	    //logging


	    this.logMsg = logger ? logger.log : () => {};
	    this.logDebug = logger ? logger.debug : () => {};
	    this.logError = logger ? logger.error : () => {}; //requests processing

	    this.requests = []; //Список текущих запросов к API.

	    this.reqTimeout = 15000; //Таймаут для выполнения запросов.

	    this.reqChkTimer = null; //Таймер для проверки таймаутов выполнения запросов.

	    this.reqChkStep = 2000; //Таймер для проверки таймаутов выполнения запросов.
	    //time off set from server time

	    this._timeOffset = 0;
	    this.getTimeOffsetInt = null;

	    if (!this.slave) {
	      this.connect();
	    }

	    return this;
	  }

	  getIP() {
	    return this.connection ? this.connection.getIP() : false;
	  }

	  initConnection(connection) {
	    this.connection = new notWSConnection(connection);
	    this.connection.on('disconnected', () => {
	      this.logMsg('disconnected');
	      this.stopReqChckTimer();
	      this.emit('close', this);
	    });
	    this.connection.on('connected', () => {
	      this.logMsg('connected'); //Запускаем таймер проверки списка запросов.

	      this.startReqChckTimer();
	      this.emit('open', this);
	    });
	    this.connection.on('connectURI', e => {
	      this.logMsg('connectURI', e);
	    });
	    this.connection.on('close', e => {
	      this.logMsg('close', e);
	    });
	    this.connection.on('error', e => {
	      this.logError(e);
	    });
	    this.connection.on('message', this.processMessage.bind(this));
	    this.connection.on('ready', () => {
	      this.logMsg('ready');
	      this.emit('ready', this);
	    });

	    if (this.connect.debug && this.connect.debug.includes('ping')) {
	      this.connection.on('ping', () => {
	        this.logDebug('ping');
	      });
	      this.connection.on('pong', () => {
	        this.logDebug('pong');
	      });
	      this.connection.on('pinged', () => {
	        this.logDebug('pinged');
	      });
	      this.connection.on('ponged', () => {
	        this.logDebug('ponged');
	      });
	    }
	  }

	  async connect() {
	    if (!this.slave) {
	      try {
	        if (!this.isConnected()) {
	          //если нужна аутентификация
	          if (this.connection.isSecure()) {
	            //получаем и сохраняем токен токен
	            this.saveToken(await this.getToken());
	          } //подключаемся


	          this.connection.connect();
	        }
	      } catch (e) {
	        this.logError(e);
	      }
	    }
	  }

	  suicide() {
	    this.emit('errored', this);
	  }

	  disconnect() {
	    this.connection.disconnect();
	  }

	  terminate() {
	    this.connection.terminate();
	    this.connection.destroy();
	  }

	  destroy() {
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

	  isAutoReconnect() {
	    return this.connection.isAutoReconnect();
	  } //Запуск таймера проверки запросов.


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

	    if (Func.isFunc(request.cb)) {
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

	      if (Func.isFunc(request.cb)) {
	        request.cb(CONST.ERR_MSG.REQUEST_TIMEOUT);
	      } else {
	        this.logMsg(`timeout check:Не задан callback для запроса с id: ${reqId}`);
	      }

	      this.requests.splice(reqIndex, 1);
	    });
	  } //Получение токена.
	  //Возможно реализовать разными способами, поэтому выделено в отдельный метод.


	  getToken(renew = false) {
	    let token = localStorage.getItem('token');

	    if (typeof token !== 'undefined' && token !== 'undefined' && token && !renew) {
	      return Promise.resolve(token);
	    } else {
	      if (Func.isFunc(this.tokenGetter)) {
	        return this.tokenGetter();
	      } else {
	        return Promise.reject();
	      }
	    }
	  }

	  async renewToken() {
	    if (!this.slave) {
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
	  }

	  saveToken(token) {
	    if (!this.slave) {
	      localStorage.setItem('token', token);
	      this.jwtToken = token;
	      this.messenger.setCredentials(token);
	      this.connection.setToken(token);
	      this.emit('tokenUpdated', token);
	    }
	  }

	  ping() {
	    this.connection.sendPing();
	  }

	  processMessage(data) {
	    try {
	      this.messenger.validate(data);
	      let msg = this.messenger.unpack(data);
	      this.emit('message', msg, this);
	      this.emit(msg.service.type + ':' + msg.service.name, msg.service, msg.payload, this.connection.getSocket()); //routing

	      this.selectRoute(msg);
	    } catch (e) {
	      this.logError(e, e.details);
	    }
	  }

	  selectRoute(msg) {
	    switch (msg.service.type) {
	      //couple of special types
	      case CONST.MSG_TYPE.RESPONSE:
	        this.routeResponse(msg);
	        break;

	      case CONST.MSG_TYPE.REQUEST:
	        this.routeRequest(msg);
	        break;

	      case CONST.MSG_TYPE.EVENT:
	        this.routeEvent(msg);
	        break;
	      //all other

	      default:
	        this.routeCommon(msg);
	    }
	  }

	  routeResponse(msg) {
	    let request = this.fullfillRequest(msg.service.id);

	    if (request !== null) {
	      request.cb(msg);
	    }
	  }

	  routeEvent(msg) {
	    this.router.route(msg.service, msg.payload, this).catch(e => {
	      this.logError(e);
	    });
	  }

	  routeCommon(msg) {
	    this.router.route(msg.service, msg.payload, this).catch(e => {
	      this.logError(e);
	      this.respond({}, {
	        id: msg.service.id,
	        type: CONST.MSG_TYPE.RESPONSE,
	        name: msg.service.name
	      }, e);
	    });
	  }

	  routeRequest(msg) {
	    this.router.route(msg.service, msg.payload, this).then(responseData => {
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
	  /**
	  *  Отправка данных определенного типа и названия
	  *  @param {string}  type  тип данных
	  *  @param {string}  name  название
	  *  @param {object}  payload  данные
	  *  @returns  {Promise}
	  */


	  send(type, name, payload) {
	    if (type === CONST.MSG_TYPE.REQUEST) {
	      return this.request(name, payload);
	    } else {
	      return this.message(type, name, payload);
	    }
	  }

	  respond(resp, service = {}, error) {
	    if (typeof resp === 'object' && resp !== null) {
	      let msg = this.messenger.pack(resp, service, error);
	      return this.connection.send(msg);
	    } else {
	      return true;
	    }
	  }

	  __request(name, payload, cb, secure = true) {
	    let message = this.messenger.pack(payload, {
	      type: CONST.MSG_TYPE.REQUEST,
	      timeOffset: this.timeOffset,
	      name
	    });
	    this.addRequest(this.messenger.getServiceData(message).id, cb);
	    this.connection.send(message, secure).catch(this.logError.bind(this));
	  }

	  request(name, payload, secure = true) {
	    return new Promise((resolve, reject) => {
	      try {
	        this.__request(name, payload, response => {
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

	  message(type, name, payload) {
	    if (payload !== 'pong' && payload !== 'ping') {
	      this.logDebug('outgoing message', type, name);
	    }

	    let message = this.messenger.pack(payload, {
	      type,
	      timeOffset: this.timeOffset,
	      name
	    });
	    return this.connection.send(message).catch(this.logError.bind(this));
	  }

	  informClientAboutExperiedToken() {
	    this.logMsg('force to update token');
	    this.send('__service', 'updateToken', {}, false).catch(this.logError.bind(this));
	  }
	  /**
	  * Server time
	  */


	  requestServerTime() {
	    if (this.connection.isConnected()) {
	      const sendTime = Date.now();
	      this.request('getTime', {}).then(result => {
	        const receiveTime = Date.now();
	        const correction = Math.round((receiveTime - sendTime) / 2);
	        const serverTime = parseInt(result, 10);
	        const correctedTime = serverTime + correction;
	        const offset = correctedTime - receiveTime;
	        this.timeOffset = offset;
	      }).catch(err => {
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

	  getTimeOnAuthorized() {
	    if (this.getTimeOffsetInt) {
	      clearInterval(this.getTimeOffsetInt);
	      this.getTimeOffsetInt = null;
	    }

	    this.requestServerTime();
	    this.getTimeOffsetInt = setInterval(this.requestServerTime.bind(this), CONST.TIME_OFFSET_REQUEST_INTERVAL);
	  }

	} //env dep export

	return notWSClient;

}());
