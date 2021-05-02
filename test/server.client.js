const
  EventEmitter = require('events'),
  expect = require('chai').expect,
  CONST = require('../src/node/const.js'),
  notWSServerClient = require('../src/node/server.client.js');

  function getFakeMessenger(options){
    let res = {};
    for(let t in options){
      res[t] = function(){
        if(options[t] === 'input'){
          return arguments[0];
        }else{
          return options[t];
        }
      }
    }
    return res;
  }

describe('notWSServerClient', () => {
  it('creating default', (done) => {
    try {
      let sock = new EventEmitter();
      sock.terminate = ()=>{};
      new notWSServerClient({
        socket: sock,
state: 'offline',
        options: {}
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  it('creating default with name in options', (done) => {
    try {
      let sock = new EventEmitter();
      sock.terminate = ()=>{};
      new notWSServerClient({
        socket: sock,
        state: 'offline',
        ip: '127.0.0.1',
        credentials: {},
        options: {
          name: 'test socket'
        }
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  describe('Socket events', () => {

    it('reaction on open event', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.on('open', (cl) => {
          expect(cl).to.be.deep.equal(client);
          done();
        })
        sock.emit('open', 'Hello, socket!');
      } catch (e) {
        expect(e.message).to.be.equal('Message is not JSON!');
        done();
      }
    });


    it('reaction on message event, valid JSON input', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {},
          messenger: getFakeMessenger({validate: true, unpack: 'input'})
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.on('message', (json) => {
          expect(json).to.be.instanceof(Object);
          expect(json.name).to.be.equal('test');
          done();
        })
        sock.emit('message', JSON.stringify({
          name: 'test'
        }));
      } catch (e) {
        done(e);
      }
    });

    it('reaction on message event, invalid JSON input', (done) => {

        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {},
          messenger: getFakeMessenger({validate: false})
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.logError = (e)=>{
          expect(e.message).to.be.equal('Message is not JSON!');
          done();
        }
        client.on('message', (json) => {
          expect(json).to.be.instanceof(Object);
          expect(json.name).to.be.equal('test');
          done(new Error('This should throw exception!'));
        })
        sock.emit('message', 'Hello, socket!');

    });


    it('reaction on error event, proper Error object (state: NOT_CONNECTED; activity: IDLE)', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let errorName = 'Message is not JSON!';
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        let checked = false;
        client.logMsg = (msg) => {
          if(!checked){
            expect(msg).to.be.equal(`ошибка: ${errorName}`);
            checked = true;
          }
        };
        client.diconnect = () => {};
        client.reconnect = () => {};
        sock.emit('error', new Error(errorName));
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('reaction on error event, string (state: NOT_CONNECTED; activity: IDLE)', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let errorName = 'Message is not JSON!';
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        let checked = false;
        client.logMsg = (msg) => {
          if (!checked){
            expect(msg).to.be.equal(`ошибка: unknown error`);
            checked = true;
          }
        };
        client.diconnect = () => {};
        client.reconnect = () => {};
        sock.emit('error', errorName);
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('reaction on error event, string (state: CONNECTED; activity: TERMINATING)', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let errorName = 'Message is not JSON!';
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.TERMINATING;
        client.logMsg = (msg) => {
          expect(msg).to.be.equal(`ошибка: unknown error`);
        };
        client.diconnect = () => {};
        client.reconnect = () => {};
        sock.emit('error', errorName);
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('reaction on close event, string (state: CONNECTED; activity: CLOSING)', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let errorName = 'Message is not JSON!';
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.CLOSING;
        client.logMsg = function*(msg, obj) {
          expect(msg).to.be.equal('подключение закрыто. причина:');
          expect(obj).to.be.equal(errorName);
          yield;
          expect(obj).to.be.equal('Подключен/Закрытие связи');
        };
        client.diconnect = () => {};
        client.reconnect = () => {};
        sock.emit('close', errorName);
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });


    it('reaction on close event, Error object (state: CONNECTED; activity: IDLE)', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let errorName = 'Message is not JSON!';
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.IDLE;
        client.logMsg = function*(msg, obj) {
          expect(msg).to.be.instanceof(Error);
          expect(msg.code).to.be.equal(1005);
          yield;
          expect(msg).to.be.equal(`подключение разорвано: 1005::No Status Recvd`);
        };
        let err = new Error(errorName, 1005);
        err.code = 1005;
        sock.emit('close', err);
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('reaction on close event, error code (state: CONNECTED; activity: IDLE)', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let errorName = 'Message is not JSON!';
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.IDLE;
        client.logMsg = function*(msg) {
          expect(msg).to.be.equal(`подключение разорвано: No Status Recvd`);
          yield;
        };
        sock.emit('close', 1005);
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  describe('request checks', () => {
    it('start checks', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.reqChkStep = 20;
        client.checkRequests = function() {
          client.stopReqChckTimer();
          done();
        }
        client.startReqChckTimer();
      } catch (e) {
        done(e);
      }
    });

    it('stop checks', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.reqChkStep = 10;
        client.startReqChckTimer();
        client.stopReqChckTimer();
        done();
      }catch (e) {
        done(e);
      }
    });

    it('find request position by id', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.requests = [{id: 1}, {id: 11}, {id: 1111}];
        expect(client.findRequest(11)).to.be.equal(1);
        expect(client.findRequest(1111)).to.be.equal(2);
        expect(client.findRequest(1)).to.be.equal(0);
        expect(client.findRequest(11111)).to.be.equal(false);
        done();
      }catch (e) {
        done(e);
      }
    });

    it('add request', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.requests = [];
        client.addRequest(12, done);
        expect(client.requests.length).to.be.equal(1);
        expect(client.requests[0].id).to.be.equal(12);
        done();
      }catch (e) {
        done(e);
      }
    });

    it('check requests - empty request queue', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.checkRequests();
        done();
      }catch (e) {
        done(e);
      }
    });

    it('check requests - request queue without timeouts', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        sock.close = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.addRequest(1,()=>{
          done(new Error('shouldnt be called'));
        });
        client.addRequest(2,()=>{
          done(new Error('shouldnt be called'));
        });
        client.addRequest(3,()=>{
          done(new Error('shouldnt be called'));
        });
        client.checkRequests();
        done();
      }catch (e) {
        done(e);
      }
    });


    it('check requests - request queue with few timeouts', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = function(){};
        sock.close = function(){};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.disconnect = ()=>{};
        let errCB = (err)=>{
          expect(err).to.be.equal('Request timeout');
        };
        let timeout = Date.now() - (client.reqTimeout + 100);
        client.addRequest(1,()=>{
          done(new Error('shouldnt be called'));
        });
        client.requests.push({id: 21, cb: errCB, time: timeout});
        client.requests.push({id: 31, cb: errCB, time: timeout});
        client.addRequest(2,()=>{
          done(new Error('shouldnt be called'));
        });
        client.addRequest(3,()=>{
          done(new Error('shouldnt be called'));
        });
        client.requests.push({id: 41, cb: errCB, time: timeout});
        client.checkRequests();
        setTimeout(done, 1000);
      }catch (e) {
        done(e);
      }
    });

    it('check requests - request queue(10000) with all timeouts and no callbacks', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        sock.close = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        let checked = 0;
        client.disconnect = ()=>{};
        client.logMsg = (msg)=>{
          if(checked < 10000){
            expect(msg).match(/timeout check:Не задан callback для запроса с id: \d+/);
            checked++;
            if(checked === 10000) {
              done();
            }
          }
        };
        let timeout = Date.now() - (client.reqTimeout + 100);
        for(let t = 0; t < 10000; t++){
          client.requests.push({id: t, cb: undefined, time: timeout});
        }
        client.checkRequests();
      }catch (e) {
        done(e);
      }
    });
  });

  describe('connection', () => {
    it('suicide', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.on('errored', (t)=>{
          expect(t).to.be.instanceof(notWSServerClient);
          done();
        });
        client.suicide();
      } catch (e) {
        done(e);
      }
    });


    it('terminate - socket exists; alive; connected', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        expect(client.isDead()).to.be.false;
        client.terminate();
        expect(client.isTerminated).to.be.true;
        expect(client.isDead()).to.be.true;
        expect(client.ws).to.be.null;
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });


    it('terminate - socket is null', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        client.ws = null;
        expect(client.isDead()).to.be.false;
        client.terminate();
        expect(client.isTerminated).to.be.true;
        expect(client.isDead()).to.be.true;
        expect(client.ws).to.be.null;
        done();
      } catch (e) {
        done(e);
      }
    });


    it('disconnect', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        client.disconnect();
        expect(client.isTerminated).to.be.true;
        expect(client.isDead()).to.be.true;
        expect(client.ws).to.be.null;
        done();
      } catch (e) {
        done(e);
      }
    });


    it('isConnected - insecure', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        sock.readyState = 1;
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        expect(client.isConnected()).to.be.true;
        done();
      } catch (e) {
        done(e);
      }
    });


    it('isConnected - secure', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};

        sock.readyState = 1;
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {},
          options: {
            secure: true
          }
        });
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.isConnected()).to.be.true;
        done();
      } catch (e) {
        done(e);
      }
    });


    it('scheduleConnect - no input timeout', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        sock.readyState = 1;
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {},
          options: {
            secure: true
          }
        });
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.isConnected()).to.be.true;
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  describe('timeOffset', () => {
    it('set/get', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.timeOffset = 10;
        expect(client._timeOffset).to.be.equal(10);
        expect(client.timeOffset).to.be.equal(10);
        client.timeOffset = 100;
        expect(client._timeOffset).to.be.equal(100);
        expect(client.timeOffset).to.be.equal(100);
        done();
      } catch (e) {
        done(e);
      }
    });


    it('requestServerTime - when not connected', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.requestServerTime();
        done();
      } catch (e) {
        done(e);
      }
    });

    it('requestServerTime - when connected, response is errored', (done) => {
      try {
        let errorName = 'Test error!';
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        sock.terminate = ()=>{};
        sock.readyState = 1;
        client.state = CONST.STATE.CONNECTED;
        client.request = (data, cb)=>{
          cb(new Error(errorName));
        };
        client.logError = (err)=>{
          expect(err).to.be.instanceof(Error);
          expect(err.message).to.be.equal(errorName);
          done();
        }
        client.requestServerTime();
      } catch (e) {
        done(e);
      }
    });

    it('requestServerTime - when connected, response is ok', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        sock.terminate = ()=>{};
        sock.readyState = 1;
        client.state = CONST.STATE.CONNECTED;
        client.request = (data, cb)=>{
          cb(null, Date.now() - 2000);
          expect(client.timeOffset).to.be.within(-3000, 3000);
          done();
        };
        client.requestServerTime();
      } catch (e) {
        done(e);
      }
    });
  });

  describe('activity', () => {
    it('set/get', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        //connecting
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        client.activity = CONST.ACTIVITY.CONNECTING;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.CONNECTING);
        //closing
        client.activity = CONST.ACTIVITY.IDLE;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        client.activity = CONST.ACTIVITY.CLOSING;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.CLOSING);
        //terminating
        client.activity = CONST.ACTIVITY.IDLE;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        client.activity = CONST.ACTIVITY.TERMINATING;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.TERMINATING);
        //authorizing
        client.activity = CONST.ACTIVITY.IDLE;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        client.activity = CONST.ACTIVITY.AUTHORIZING;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.AUTHORIZING);
        client.activity = CONST.ACTIVITY.IDLE;
        //authorizing
        client.activity = CONST.ACTIVITY.AUTHORIZING;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.AUTHORIZING);
        client.activity = CONST.ACTIVITY.AUTHORIZING;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.AUTHORIZING);
        client.activity = CONST.ACTIVITY.IDLE;
        let faultySet_1 = ()=>{
          client.activity = 'CONST.ACTIVITY.IDLE';
        }
        expect(faultySet_1).to.throw(Error);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        client.activity = undefined;
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  describe('state', () => {
    it('set/get - invalid state, should throw error', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        let f = ()=>{
          client.state = 'invalid state';
        };
        expect(f).to.throw(Error);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('set/get - NOT_CONNECTED -> CONNECTED', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.state = CONST.STATE.CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('set/get - NOT_CONNECTED -> ERRORED, expecting disconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.disconnect = ()=>{
          done();
        }
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - NOT_CONNECTED -> [not allowed states: AUTHORIZED, NO_PING, NOT_CONNECTED], throwing Errors', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        let throwing = [
          ()=>{ client.state = CONST.STATE.AUTHORIZED;    },
          ()=>{ client.state = CONST.STATE.NO_PING;       },
          ()=>{ client.state = CONST.STATE.NOT_CONNECTED; },
          ()=>{ client.state = undefined;                 },
        ];
        for(let f of throwing){
          expect(f).to.throw(Error);
          expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        }
        done();
      } catch (e) {
        done(e);
      }
    });

    it('set/get - CONNECTED -> AUTHORIZED', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        client.requestServerTime = ()=>{
          setTimeout(
            ()=>{
              clearInterval(client.getTimeOffsetInt);
            },
            100
          );
          done();
        };
        expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
        client.getTimeOffsetInt = setInterval( ()=>{}, 10000);
        client.state = CONST.STATE.AUTHORIZED;
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - CONNECTED -> NO_PING, expecting disconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.disconnect = ()=>{
          done();
        }
        client.state = CONST.STATE.CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
        client.state = CONST.STATE.NO_PING;
        expect(client.state).to.be.equal(CONST.STATE.NO_PING);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });


    it('set/get - CONNECTED -> ERRORED, expecting disconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.disconnect = ()=>{
          done();
        }
        client.state = CONST.STATE.CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });
    it('set/get - CONNECTED -> NOT_CONNECTED, expecting reconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.reconnect = ()=>{
          done();
        }
        client.state = CONST.STATE.CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
        client.state = CONST.STATE.NOT_CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - CONNECTED -> [not allowed states: NOT_CONNECTED], throwing Errors', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.state = CONST.STATE.CONNECTED;
        let throwing = [
          ()=>{ client.state = CONST.STATE.CONNECTED; }
        ];
        for(let f of throwing){
          expect(f).to.throw(Error);
          expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
        }
        done();
      } catch (e) {
        done(e);
      }
    });


    it('set/get - AUTHORIZED -> CONNECTED', () => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        client.state = CONST.STATE.CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - AUTHORIZED -> NO_PING, expecting disconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        client.disconnect = ()=>{done();};
        client.state = CONST.STATE.NO_PING;
        expect(client.state).to.be.equal(CONST.STATE.NO_PING);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - AUTHORIZED -> ERRORED, expecting disconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.disconnect = ()=>{
          done();
        }
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - AUTHORIZED -> NOT_CONNECTED, expecting reconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.reconnect = function(){
          done();
        }
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        client.state = CONST.STATE.NOT_CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - AUTHORIZED -> [not allowed states: AUTHORIZED], throwing Errors', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        let throwing = [
          ()=>{ client.state = CONST.STATE.AUTHORIZED; }
        ];
        for(let f of throwing){
          expect(f).to.throw(Error);
          expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        }
        done();
      } catch (e) {
        done(e);
      }
    });


    it('set/get - NO_PING -> NOT_CONNECTED, expecting reconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.reconnect = ()=>{
          done();
        }
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.NO_PING;
        expect(client.state).to.be.equal(CONST.STATE.NO_PING);
        client.state = CONST.STATE.NOT_CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - NO_PING -> [not allowed states: CONNECTED, AUTHORIZED, ERRORED, NO_PING], throwing Errors', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.NO_PING;
        expect(client.state).to.be.equal(CONST.STATE.NO_PING);
        let throwing = [
          ()=>{ client.state = CONST.STATE.CONNECTED; },
          ()=>{ client.state = CONST.STATE.AUTHORIZED; },
          ()=>{ client.state = CONST.STATE.ERRORED; },
          ()=>{ client.state = CONST.STATE.NO_PING; }
        ];
        for(let f of throwing){
          expect(f).to.throw(Error);
          expect(client.state).to.be.equal(CONST.STATE.NO_PING);
        }
        done();
      } catch (e) {
        done(e);
      }
    });

    it('set/get - ERRORED -> NOT_CONNECTED, expecting reconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = function(){};
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.reconnect = ()=>{
          done();
        }
        client.disconnect = ()=>{};
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        client.state = CONST.STATE.NOT_CONNECTED;
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
      } catch (e) {
        done(e);
      }
    });

    it('set/get - ERRORED -> ERRORED, expecting diconnect call', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
          state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.disconnect = ()=>{};
        client.requestServerTime = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch(e){
        done(e);
      }
    });

    it('set/get - ERRORED -> [not allowed states: CONNECTED, AUTHORIZED, NO_PING], throwing Errors', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.requestServerTime = ()=>{};
          client.disconnect = ()=>{};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        let throwing = [
          ()=>{ client.state = CONST.STATE.CONNECTED; },
          ()=>{ client.state = CONST.STATE.AUTHORIZED; },
          ()=>{ client.state = CONST.STATE.NO_PING; }
        ];
        for(let f of throwing){
          expect(f).to.throw(Error);
          expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        }
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  describe('message history', () => {
    it('add to history; type is new and exist, test history length cap', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        sock.readyState = 1;

        let client = new notWSServerClient({
          socket: sock,
state: 'offline',
          ip: '127.0.0.1',
          credentials: {},
          messenger: {
            getServiceData(val){return val;}
          }
        });
        client.state = CONST.STATE.CONNECTED;
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.addToHistory({'type': 'new', some: 'data'});
        expect(Object.keys(client.history).length).to.be.equal(1);
        expect(client.history.new.length).to.be.equal(1);
        client.addToHistory({'type': 'new', some: 'data'});
        expect(Object.keys(client.history).length).to.be.equal(1);
        expect(client.history.new.length).to.be.equal(2);
        client.addToHistory({'type': 'old', some: 'data'});
        expect(Object.keys(client.history).length).to.be.equal(2);
        expect(client.history.old.length).to.be.equal(1);
        for(let i=0; i < 45; i++){
          client.addToHistory({'type': 'test', some: 'data'});
          expect(Object.keys(client.history).length).to.be.equal(3);
          expect(client.history.test.length).to.be.below(41);
        }
        done();
      } catch (e) {
        done(e);
      }
    });

    it('send all from history', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = ()=>{};
        sock.readyState = 1;

        let client = new notWSServerClient({
          socket: sock,
          state: 'offline',
          ip: '127.0.0.1',
          credentials: {},
          messenger: {
            getServiceData(val){return val;}
          }
        });
        client.state = CONST.STATE.CONNECTED;
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.addToHistory({'type': 'new', some: 'data'});
        expect(Object.keys(client.history).length).to.be.equal(1);
        expect(client.history.new.length).to.be.equal(1);
        client.addToHistory({'type': 'new', some: 'data'});
        expect(Object.keys(client.history).length).to.be.equal(1);
        expect(client.history.new.length).to.be.equal(2);
        client.addToHistory({'type': 'old', some: 'data'});
        expect(Object.keys(client.history).length).to.be.equal(2);
        expect(client.history.old.length).to.be.equal(1);
        for(let i = 0; i < 45; i++){
          client.addToHistory({'type': 'test', some: 'data'});
          expect(Object.keys(client.history).length).to.be.equal(3);
          expect(client.history.test.length).to.be.below(41);
        }
        let counter = 0;
        client.sendMsg = ()=>{
          counter++;
          return Promise.resolve();
        }
        client.sendAllFromHistory();
        expect(counter).to.be.equal(43);
        done();
      } catch (e) {
        done(e);
      }
    });
  });


  describe('credentials', () => {
    it('get credentials', (done) => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    });

    it('set credentials', (done) => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    });

    it('validate credentials', (done) => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    });

    it('after credentials validation', (done) => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    });

    it('update credentials', (done) => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
