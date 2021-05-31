
const EventEmitter = require('events');
const uuid = require('uuid');
const CONST = require('./const.js');
const Func = require('./func.js');

/**
 * set of default options
 */
const DEFAULT_OPTIONS = {
	validateType:         true, //validation of message type
	validateTypeAndName:  true, //validation of message type and name
	secure: false, // if true - all not validated credentials are wrong
	securityException: ['request.auth'], //пример того как указывать пути без аутентификации, даже при secure=true
	validators: { //additional validators for validate method
		/**
    credentials(credentials){
      return (credentials.password === 'password') && (credentials.login === 'login');
    }
    */
	},
	types:      {
		'typeOfMessage':  ['list', 'of', 'name\'s', 'of', 'actions'],
		'test': ['sayHello'],
		'__service': ['updateToken'],
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
		if(Func.ObjHas(this.options.types, CONST.MSG_TYPE.REQUEST) && !Func.ObjHas(this.options.types, CONST.MSG_TYPE.RESPONSE)){
			this.options.types[CONST.MSG_TYPE.RESPONSE] = this.options.types[CONST.MSG_TYPE.REQUEST];
		}
		return this;
	}

	setCredentials(credentials) {
		this.options.credentials = credentials;
		return this;
	}

	getServiceData(msg) {
		if(Func.ObjHas(msg, 'service')){
			return msg.service;
		}else{
			return {
				id: msg.id,
				time: msg.time,
				type: msg.type,
				name: msg.name,
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
		return (typeof msg.error !== 'undefined') && (msg.error !== null);
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
		if ((typeof serviceData === 'undefined') || (serviceData === null)) {
			throw new Error('No Service Data for packing notWSMsg');
		}
		let msg = {
			id: uuid.v4(),
			time: (new Date()).getTime(),
			payload,
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
			return (this.options.securityException.indexOf(route) > -1);
		}
		return false;
	}

	validate(msg) {
		let serviceData = this.getServiceData(msg);
		if (!uuid.validate(serviceData.id)) {
			throw new Error(CONST.ERR_MSG.MSG_ID_IS_NOT_VALID);
		}
		if (
		//если не в списке исключений
			!this.routeIsSecurityException(serviceData.type, serviceData.name) &&
      //проверяем права доступа
      !this.validateCredentials(this.getCredentials(msg))
		) {
			throw new Error(CONST.ERR_MSG.MSG_CREDENTIALS_IS_NOT_VALID);
		}
		if(this.options.validateType){
			if (!this.validateType(this.getType(msg))) {
				let err = new Error(CONST.ERR_MSG.MSG_TYPE_IS_NOT_VALID);
				err.details = {
					type: this.getType(msg)
				};
				throw err;
			}
		}
		if(this.options.validateTypeAndName){
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

	enableRoute(route, name){
		if(!Func.ObjHas(this.options, 'types')){
			this.options.types = {};
		}
		if(!Func.ObjHas(this.options.types, route)){
			this.options.types[route] = [];
		}
		if(this.options.types[route].indexOf(name) === -1){
			this.options.types[route].push(name);
		}
		return this;
	}

	disableRoute(route, name){
		if(!Func.ObjHas(this.options, 'types')){
			return this;
		}
		if(!Func.ObjHas(this.options.types, route)){
			return this;
		}
		if(this.options.types[route].indexOf(name) > -1){
			this.options.types[route].splice(this.options.types[route].indexOf(name), 1);
		}
		return this;
	}
}


module.exports = notWSMessenger;

