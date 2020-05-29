
const EventEmitter = require('events');
const LOG = require('./log.js');


/**
* Routing for messages
*
*/

class notWSRouter extends EventEmitter{
	constructor(options, routes = {}, logger){
		super();
		this.options = options;
		this.__name = 'notWSRouter';
		this.logMsg = logger?logger.log:LOG.genLogMsg(this.__name);
		this.logDebug = logger?logger.debug:LOG.genLogDebug(this.__name);
		this.logError = logger?logger.error:LOG.genLogError(this.__name);
		this.routes = {
			__service: {
				updateToken:()=>{
					this.emit('updateToken');
					return Promise.resolve();
				}
			}
		};
		if(routes && Object.keys(routes).length > 0 ){
			this.initRoutes(routes);
		}
		return this;
	}

	initRoutes(routes){
		for(let type in routes){
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
	route({type, name, cred}, data, conn){
		if(Object.prototype.hasOwnProperty.call(this.routes, type) && Object.prototype.hasOwnProperty.call(this.routes[type], name)){
			this.logMsg(conn.ip, type, name);
			return this.routes[type][name](data, cred, conn);
		}
		throw (new Error(`Route not found ${type}/${name}`));
	}

	/**
  * Adding routes, chainable
  * @params {string}  type  name of type
  * @params {object}  routes  hash with name => () => {return new Promise} alike workers
  * @returns {object} self
  */
	setRoutesForType(type, routes){
		this.validateType(type);
		this.validateRoutes(routes);
		if (Object.prototype.hasOwnProperty.call(this.routes, type)){
			this.routes[type] = Object.assign(this.routes[type], routes);
		}else{
			this.routes[type] = routes;
		}
		return this;
	}

	unsetRoutesForType(type, list = []){
		this.validateType(type);
		this.validateRoutesList(list);
		if (Object.prototype.hasOwnProperty.call(this.routes, type)){
			for(let name of list){
				if(Object.prototype.hasOwnProperty.call(this.routes[type], name)){
					delete this.routes[type][name];
				}
			}
			if(Object.keys(this.routes[type]).length === 0){
				delete this.routes[type];
			}
		}
		return this;
	}

	validateType(type){
		if((typeof type !== 'string') || (type === '')){
			throw new Error('Route\'s type name should be a String!');
		}
		return true;
	}

	validateRoutes(routes){
		if((typeof routes !== 'object') || (routes === null) || (routes === undefined)){
			throw new Error('Route\'s type\'s routes set should be an Object!');
		}
		return true;
	}

	validateRoutesList(list){
		if(!Array.isArray(list) || (typeof list === 'undefined')){
			throw new Error('List of routes names should be an Array!');
		}
		return true;
	}

	getRoutes(){
		return this.routes
	}

}


module.exports = notWSRouter;

