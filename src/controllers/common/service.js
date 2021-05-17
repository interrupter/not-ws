import notWSClient from '../browser/client.js';

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
      let options = {}, optionsFromAppConfig = false;
      //copy opts from app wide config
      optionsFromAppConfig = this.app.getOptions(`modules.ws.clients.${name}`, false);
      if(optionsFromAppConfig){
        options.options = Object.assign({}, {...optionsFromAppConfig});
      }
      //integrating with collected from modules
      for(let optName in ['options', 'messenger', 'router']){
        if(Object.prototype.hasOwnProperty.call(opts, optName)){
          options[optName] = opts[optName];
        }
      }
      let client = new notWSClient(options);
      this.app.setWSClient(name, client);
      if(Object.prototype.hasOwnProperty.call(opts, 'routes')){
        if(Object.prototype.hasOwnProperty.call(opts.routes, 'event')){
          for(let evName in opts.routes.event){
            client.on(`remote.${evName}`, opts.routes.event[evName]);
          }
        }
      }
    }catch(e){
      this.app.error(e);
    }
  }
}

export default nsWS;
