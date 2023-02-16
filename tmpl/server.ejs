const url           = require('url');
const ws            = require('ws');
const EventEmitter  = require('events');
const jwt           = require('jsonwebtoken');

const CONST = require('./const.js');
const Func = require('./func.js');

const notWSClient = require('./client.js');

const DEFAULT_CONNECTION = {
  port: 12000,
  ping: true,
  secure: true,
  //ретрансляция сообщений
  relay: null,
};

function testClientIdentityId(_id){
  return (client)=>{
    if(client.connection.isAlive() && client.identity){
      if(client.identity && client.identity._id){
        return client.identity._id.toString() === _id.toString();
      }
    }
    return false;
  };
}

class notWSServer extends EventEmitter{

  /**
  *  connection           -   connection params
  *  connection.server    -   express http/s server
  *  connection.port      -   server port
  *  connection.secure    -   auth required
  *  connection.ping      -   ping clients
  *  connection.relay     -   should pass incoming message to specified interface
  *  connection.interface -   relay interface
  *  jwt                  -   JWT token options
  *  jwt.key              -   JWT key
  *  routes               -   collection of routes on server, that will be passed to getRouter
  *  getRouter            -   getter/factory for client router function(conn, req, routes)
  *  messenger            -   messenger options, that will be passed to getMessenger
  *  getMessenger         -   getter/factory for client messenger function(conn, req, messenger)
  *  credentials          -   creds
  **/

  constructor({
      connection = {},
      jwt,
      getRouter,
      routes,
      getMessenger,
      messenger,
      credentials,
      logger
    }){
    if(!Func.isFunc(getRouter) && !routes){
      throw new CONST.notWSException('getRouter is not function and routes is not set');
    }
    if(!Func.isFunc(getMessenger) && !messenger){
      throw new CONST.notWSException('getMessenger is not function and messenger is not set');
    }
    super();
    this.connection = Object.assign({}, DEFAULT_CONNECTION, connection);

    this.logMsg = logger?logger.log:()=>{};
		this.logDebug = logger?logger.debug:()=>{};
		this.logError = logger?logger.error:()=>{};

    this.routes = routes;
    this.messenger = messenger;

    this.wsServer   = null;
    this.isClosing   = false;
    this.wsClients  = [];
    this.wsMaxConns = 100;

    this.jwt = jwt;
    this.credentials = credentials;

    this.getRouter = getRouter;
    this.getMessenger = getMessenger;

    this.intPingPong = null;
    return this;
  }

  start(){
    let opts = {};
    if(this.connection.server){
       opts.server = this.connection.server;
    }
    if(!isNaN(this.connection.port) && this.connection.port){
      opts.port = this.connection.port;
    }
    if(this.connection.host){
      opts.host = this.connection.host;
    }
    if(opts.host || opts.port || opts.server){
      this.wsServer = new ws.Server(opts);
      if(this.connection.ping){
        this.initPingPong();
      }
      this.initServer();
      this.emit('started');
    }else{
      throw new CONST.notWSException('No host, port or server object for start.');
    }
  }

  async stop(){
    try{
      this.setClosing();
      await this.closeClientConnections();
      await this.closeServer();
    }catch(e){
      this.logError(e);
    }
  }

  initServer(){
    this.wsServer.on('error', this.onError.bind(this));
    this.wsServer.on('connection', this.onConnection.bind(this));
  }

  onError(err){
    this.logError(`ws server error: `, err);
    this.emit('wsError', err);
  }

  isSecure(){
    return !!this.connection.secure;
  }

  connectionIsNotSecure(conn, req){
    //Пропускаем уже отключенные токены.
    if((!conn) || (conn.readyState !== conn.OPEN)){
      return false;
    }
    let token = url.parse(req.url, true).query.token;
    //Проверяем токен
    try {
      this.logMsg('token', token);
      jwt.verify(token, this.jwt.key);
      return false;
    } catch(err) {
      this.logDebug(err);
      if(err.name === 'TokenExpiredError'){
        this.logError('Client must update token');
      }
      return true;
    }
  }

  getClientIdentity(req){
    if(this.isSecure()){
      let token = url.parse(req.url, true).query.token;
      return jwt.verify(token, this.jwt.key);
    }else{
      return false;
    }
  }

  onConnection(connection, req){
    if(this.isSecure()){
      //this.logMsg('Secure server');
      if(this.connectionIsNotSecure(connection, req)){
        this.informClientAboutExperiedToken(connection, req)
					.then(()=>{
						connection.close();
					})
					.catch(this.logError.bind(this));
				this.logMsg(`Connection from ${req.socket.remoteAddress} refused, as not secure`);
				return;
      }
    }
    let wsConn = new notWSClient({
      identity:     this.getClientIdentity(req),
      slave:        true,
      connection:{
        ping:         false,
        ws:           connection,
        ip:           req.socket.remoteAddress,
      },
      credentials:  Object.assign({}, this.credentials),
      messenger:    this.getMessengerForClient(connection, req),
      router:       this.getRouterForClient(connection, req)
    });
    this.emit('connection', wsConn, req);
    wsConn.connection.once('errored', this.terminateAndRemoveWSClient.bind(this));
    wsConn.on('message', this.onClientMessage.bind(this));
    this.wsClients.push(wsConn);
    this.logMsg(`New client from ${req.socket.remoteAddress}`);
    this.lastCount = this.wsClients.length;
    this.emit('clientsCountChanged', this.wsClients.length);
  }

  onClientMessage(){
    this.emit('clientMessage', ...arguments);
  }

  getMessengerForClient(conn, req){
    if(Func.isFunc(this.getMessenger)){
      return this.getMessenger(conn, req, this.messenger);
    }else{
      return this.messenger;
    }
  }

  getRouterForClient(conn, req){
    if(Func.isFunc(this.getRouter)){
      return this.getRouter(conn, req, this.routes);
    }else{
      return {routes: this.routes};
    }
  }

  setClosing(){
    this.isClosing = true;
  }

  closeServer(){
    return new Promise((res, rej)=>{
      try{
        this.wsServer.close((e)=>{
          if(e){
            rej(e);
          }else{
            res();
          }
        });
      }catch(e){
        rej(e);
      }
    });
  }

  closeClientConnections(){
    while(this.wsClients.length){
      if(this.wsClients[0].isConnected()){
        this.terminateAndRemoveWSClient(this.wsClients[0]);
      }else{
        this.removeClient(this.wsClients[0]);
      }
    }
  }

  terminateAndRemoveWSClient(wsc){
    if (wsc){
      wsc.terminate();
      wsc.destroy();
      this.removeClient(wsc);
    }
  }

  removeClient(wsc){
    if(this.wsClients.indexOf(wsc) > -1){
      this.wsClients.splice(this.wsClients.indexOf(wsc), 1);
    }
  }

  findAndRemoveDeadClients(){
    let dead =[];
    for(let client of this.wsClients){
      if(client.isDead()){
        dead.push(client);
      }
    }
    dead.forEach(this.removeClient.bind(this));
    if(this.lastCount !== this.wsClients.length) {
      this.lastCount = this.wsClients.length;
      this.emit('clientsCountChanged', this.wsClients.length);
    }
  }

  initPingPong(){
		if(this.intPingPong){
			clearInterval(this.intPingPong);
		}
		this.initPingPong = setInterval(this.pingAll.bind(this), CONST.PING_TIMEOUT);
		this.pingAll();
	}

	pingAll(){
		this.wsClients.forEach(this.pingOne.bind(this));
    this.findAndRemoveDeadClients();
	}

	pingOne(client){
		client.ping();
	}

  informClientAboutExperiedToken(conn, req){
    return new Promise((res, rej)=>{
    try{
      let msg = {
        type:'__service',
        name: 'updateToken'
      };
      conn.send(JSON.stringify(this.getMessengerForClient(conn, req).pack({}, msg)),
        (e)=>{
          if(e){rej(e);}
          else{res();}
        });
    }catch(e){
      rej(e);
    }
    });
  }

  /**
  * Broadcasting message to clients
  * @param {string} type  type of the message
  * @param {string} name  name of the message
  * @param {object} payload data to be transmitted
  * @secure {boolean} secure
  */
  broadcast(type, name, payload, secure = true, connFilter = undefined){
    this.getClients(connFilter).forEach((client)=>{
      client.send(type, name, payload, secure);
    });
  }

  /**
  * filtering clients by specified function and return resulting array
  * @param {function} filter function to filter clients
  * @returns {Array}
  */
  getClients(filter){
    if(Func.isFunc(filter)){
      return this.wsClients.filter(filter);
    }else{
      return this.wsClients;
    }
  }

  /**
  * filtering clients by specified function and return first passing test
  * @param {function} test function to test clients and found required
  * @returns {notWSServerClient}
  */
  getClient({test, _id}){
    if(!Func.isFunc(test) && _id){
      test = testClientIdentityId(_id);
    }
    for(let t in this.wsClients){
      if(test(this.wsClients[t])){
        return this.wsClients[t];
      }
    }
    return false;
  }

  /**
  * filtering clients by specified function and return first passing test
  * @param {function} test function to test clients and found required
  * @returns {notWSServerClient}
  */
  getClients({test, _id}){
    if(!Func.isFunc(test) && _id){
      test = testClientIdentityId(_id);
    }
    let results = this.wsClients.filter(test);
    return results;
  }

}
module.exports = notWSServer;
