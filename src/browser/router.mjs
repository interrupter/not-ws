
import EventEmitter from 'wolfy87-eventemitter';
import Func from './func.mjs';
import CONST from './const.mjs';
    

/**
      * Routing for messages
      *
      */

class notWSRouter extends EventEmitter{
	constructor({name, routes = {}, logger}){
		super();
		this.__name = name || 'notWSRouter';
		this.logMsg = logger?logger.log:()=>{};
		this.logDebug = logger?logger.debug:()=>{};
		this.logError = logger?logger.error:()=>{};
		this.routes = {
			__service: {
				updateToken:()=>{
					this.emit('updateToken');
					return Promise.resolve();
				}
			},
			test: {
				sayHello:()=>{
					this.logMsg('Say hello for test route!');
					return Promise.resolve(true);
				}
			},
			request:{
				auth:()=>{
					this.logMsg('request.auth');
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
      * @parms {object} messageServiceData object with fields:
      type - msg type, routes set
      name - action name
      cred - some credentials info
      @params {object} data payload information from message
      @params {object} client WS Connection
      @returns {Promise} from targeted action or throwing Error if route doesn't exist
      */
	async route({type, name, cred}, data, client){
      
		const identity = client.identity;
          
		if(
			Func.ObjHas(this.routes, type) &&
            Func.ObjHas(this.routes[type], name)
		){
			this.logMsg('ip:', client.getIP(), type, name);
			if(Array.isArray(this.routes[type][name]) && this.routes[type][name].length > 1){
				const len = this.routes[type][name].length;
				const guards = this.routes[type][name].slice(0, len - 1);
				const actualRoute = this.routes[type][name][len - 1];
				await Promise.all(
					guards.map((guard) => Func.executeFunctionAsAsync(guard, [{data, cred, client, identity}]))
				);
				return Func.executeFunctionAsAsync(actualRoute,[{data, cred, client, identity}]);

			}else if(Func.isFunc(this.routes[type][name])){
				return await Func.executeFunctionAsAsync(this.routes[type][name], [{data, cred, client, identity}]);
			}
		}
		throw (new CONST.notWSException(`Route not found ${type}/${name}`));
	}

	/**
            * Adding routes, chainable
            * @params {string} type name of type
            * @params {object} routes hash with name => () => {return new Promise} alike workers
            * @returns {object} self
            */
	setRoutesForType(type, routes){
		this.validateType(type);
		this.validateRoutes(routes);
		if (Func.ObjHas(this.routes, type)){
			this.routes[type] = Object.assign(this.routes[type], routes);
		}else{
			this.routes[type] = routes;
		}
		return this;
	}

	unsetRoutesForType(type, list = []){
		this.validateType(type);
		this.validateRoutesList(list);
		if (Func.ObjHas(this.routes, type)){
			for(let name of list){
				if(Func.ObjHas(this.routes[type], name)){
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
			throw new CONST.notWSException('Route\'s type name should be a String!');
		}
		return true;
	}

	validateRoutes(routes){
		if((typeof routes !== 'object') || (routes === null) || (routes === undefined)){
			throw new CONST.notWSException('Route\'s type\'s routes set should be an Object!');
		}
		return true;
	}

	validateRoutesList(list){
		if(!Array.isArray(list) || (typeof list === 'undefined')){
			throw new CONST.notWSException('List of routes names should be an Array!');
		}
		return true;
	}

	getRoutes(){
		return this.routes;
	}

}

            
export default notWSRouter;
                