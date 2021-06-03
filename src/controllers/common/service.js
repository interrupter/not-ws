import notWSClient from '../../browser/client.js';

class nsWS {
	constructor(app) {
		this.app = app;
		this.init();
	}

	init(){
		const clients = this.app.getOptions('wsc', {});
		for(let client in clients){
			this.initClient(client, clients[client]);
		}
	}

	initClient(name, opts){
		try{
			let options = {},
				optionsFromAppConfig = false;
			//integrating with collected from modules
			for(let optName of ['name', 'messenger', 'router', 'getToken', 'logger', 'debug']){
				if(Object.prototype.hasOwnProperty.call(opts, optName)){
					options[optName] = opts[optName];
				}
			}
			//copy opts from app wide config
			optionsFromAppConfig = this.app.getOptions(`modules.ws.clients.${name}`, false);
			if(optionsFromAppConfig){
				if(!Object.prototype.hasOwnProperty.call(options, 'connection')){
					options.connection = {};
				}
				options.connection = Object.assign(options.connection, {...optionsFromAppConfig});
			}
			let client = new notWSClient(options);
			client.once('ready', this.app.emit.bind(this.app, `wsClient:${name}:ready`, client));
			client.on('connected', this.app.emit.bind(this.app, `wsClient:${name}:connected`, client));
			client.on('diconnected', this.app.emit.bind(this.app, `wsClient:${name}:diconnected`, client));
			this.app.setWSClient(name, client);
		}catch(e){
			this.app.error(e);
		}
	}

}

export default nsWS;
