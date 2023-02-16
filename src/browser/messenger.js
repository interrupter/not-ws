
  import EventEmitter from 'wolfy87-eventemitter';
  import CONST from './const.js';
  import Func from './func.js';
  import * as uuid from 'uuid';

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
  },
  wrap:{
    ok: undefined,
    error: undefined
  },
  isErrored: undefined,             //override rule of defining unpacked message as failed (msg):void
  markMessageAsErrored: undefined   //override rule of marking message as errored (msg, serviceData, error):void
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
  error:{} <- if errored on communitaction level, errors from other levels could be transported in payload

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
    this.options = {...DEFAULT_OPTIONS, ...options};
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
    if(Func.isFunc(this.options.isErrored)){
      return this.options.isErrored(msg);
    }else{
      return (typeof msg.error !== 'undefined') && (msg.error !== null);
    }
  }

  markMessageAsErrored(msg, serviceData, error ){
    if(Func.isFunc(this.options.markMessageAsErrored)){
      this.options.markMessageAsErrored(msg, serviceData, error);
    }else{
      if (error instanceof CONST.notWSException) {
        msg.error = error;
      }
    }
  }

  getErrorMessage(msg) {
    if (typeof msg.error === 'string') {
      return msg.error;
    } else if (typeof msg.error === 'object') {
      return `${msg.error.code}: ${msg.error.message}`;
    } else {
      throw new CONST.notWSException('No error data in message');
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
    if (!error && (typeof serviceData === 'undefined') || (serviceData === null)) {
      throw new CONST.notWSException('No Service Data or Error for packing notWSMsg');
    }
    const payloadWrapped = this.wrapPayload(payload, serviceData, error);
    let msg = {
      id: uuid.v4(),
      time: (new Date()).getTime(),
      payload: payloadWrapped,
    };    
    if (this.options.credentials) {
      msg.cred = this.options.credentials;
    }
    this.markMessageAsErrored(msg, serviceData, error);
    return Object.assign(msg, serviceData);
  }

  wrapPayload(payload, serviceData, error){
    if((error && error instanceof Error)){
      return this.wrapPayloadAs('error', payload, serviceData, error);
    }else{
      return this.wrapPayloadAs('ok', payload, serviceData, error);
    }
  }

  wrapPayloadAs(status, payload, serviceData, error){
    if(typeof this.options.wrap === 'object' && Func.isFunc(this.options.wrap[status])){
      return this.options.wrap[status](payload, serviceData, error);
    }else{
      return payload;
    }
  }

  unpack(msg) {
    if (this.isErrored(msg)) {
      let err = new CONST.notWSException(this.getErrorMessage(msg));
      err.report = this.getErrorReport(msg);
      throw err;
    }
    return {
      cred: this.getCredentials(msg),
      service: this.getServiceData(msg),
      payload: this.getPayload(msg)
    };
  }

  validateCredentials(credentials = {}, serviceData) {
    if (this.options.validators && this.options.validators.credentials) {
      return this.options.validators.credentials(credentials, serviceData);
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
      throw new CONST.notWSException(CONST.ERR_MSG.MSG_ID_IS_NOT_VALID);
    }
    if (
      //если не в списке исключений
      !this.routeIsSecurityException(serviceData.type, serviceData.name) &&
      //проверяем права доступа
      !this.validateCredentials(this.getCredentials(msg), serviceData)
    ) {
      throw new CONST.notWSException(CONST.ERR_MSG.MSG_CREDENTIALS_IS_NOT_VALID);
    }
    //not neccessary, but
    this.validateRouteTypeAndName(msg);
    return msg;
  }

  validateRouteTypeAndName(msg){
    //default: false
    if(this.options.validateTypeAndName){
      this.validateRouteType(msg);
      let type = this.getType(msg),
        name = this.getName(msg);
      if (!this.validateTypeAndName(type, name)) {
        let err = new CONST.notWSException(CONST.ERR_MSG.MSG_NAME_IS_NOT_VALID);
        err.details = {type,name};
        throw err;
      }
    }else{
      this.validateRouteType(msg);
    }
  }

  validateRouteType(msg){
    let type = this.getType(msg);
    //default: true
    if(this.options.validateType){
      if (!this.validateType(type)) {
        let err = new CONST.notWSException(CONST.ERR_MSG.MSG_TYPE_IS_NOT_VALID);
        err.details = {type};
        throw err;
      }
    }
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


export default notWSMessenger;

