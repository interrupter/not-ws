const
  EventEmitter = require('events'),
  expect = require('chai').expect,
  CONST = require('../src/node/const.js'),
  notWSConnection = require('../src/node/connection.js');

function getFakeMessenger(options) {
  let res = {};
  for (let t in options) {
    res[t] = function() {
      if (options[t] === 'input') {
        return arguments[0];
      } else {
        return options[t];
      }
    }
  }
  return res;
}



describe('notWSConnection', () => {
  it('creating default', (done) => {
    try {
      let sock = new EventEmitter();
      sock.terminate = () => {};
      new notWSConnection({
        ws: sock,
        state: 'offline',
      });
      done();
    } catch (e) {
      done(e);
    }
  });


  describe('Socket events', () => {
    after(function () {
    //  global.asyncDump();
    });

    it('reaction on open event', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1',
        });
        client.on('connected', () => {
          client.terminate();
          done();
        });
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);
        sock.emit('open', 'Hello, socket!');
      } catch (e) {
        expect(e.message).to.be.equal('Message is not JSON!');
        done(e);
      }
    });


    it('reaction on message event, valid JSON input', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.on('message', (json) => {
          expect(json).to.be.instanceof(Object);
          expect(json.name).to.be.equal('test');
          client.terminate();
          done();
        });
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);
        sock.emit('message', JSON.stringify({
          name: 'test'
        }));
      } catch (e) {
        done(e);
      }
    });

    it('reaction on message event, invalid JSON input', (done) => {

      let sock = new EventEmitter();
      sock.terminate = () => {};
      let client = new notWSConnection({
        ws: sock,
        state: 'offline',
        ip: '127.0.0.1'
      });
      client.diconnect = () => {};
      client.reconnect = () => {};
      client.on('messageInWronFormat', (data) => {
        expect(data).to.be.equal('Hello, socket!');
        client.terminate();
        done();
      });
      client.on('message', (json) => {
        expect(json).to.be.instanceof(Object);
        expect(json.name).to.be.equal('test');
        client.terminate();
        done(new Error('This should throw exception!'));
      });
      setTimeout(()=>{
        clearInterval(client.connectInterval);
        clearTimeout(client.disconnectTimeout);
      },1000);
      sock.emit('message', 'Hello, socket!');
    });


    it('reaction on error event, proper Error object (state: NOT_CONNECTED; activity: IDLE)', (done) => {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let errorName = 'Message is not JSON!';
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        let notChecked =true;
        client.on('error', (msg) => {
          if (notChecked) {
            notChecked = false;
            expect(msg.message).to.be.equal(errorName);
            client.terminate();
            done();
          }
        });
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);
        sock.emit('error', new Error(errorName));
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
    });

   it('reaction on error event, string (state: NOT_CONNECTED; activity: IDLE)', (done) => {

        let sock = new EventEmitter();
        sock.terminate = () => {};
        let errorName = 'Message is not JSON!';
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        let checked = false;
        client.on('error', (msg) => {
          if (!checked) {
            expect(msg).to.be.equal(errorName);
            checked = true;
            client.terminate();
            done();
          }else{
            client.terminate();
            done(new Error('double error call'));
          }
        });
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);
        client.diconnect = () => {};
        client.reconnect = () => {};
        sock.emit('error', errorName);
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);

    });

    it('reaction on error event, string (state: CONNECTED; activity: TERMINATING)', (done) => {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let errorName = 'Message is not JSON!';
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.TERMINATING;
        client.on('error', (msg) => {
          expect(msg).to.be.equal(errorName);
          client.terminate();
          done();
        } );
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);
        client.diconnect = () => {};
        client.reconnect = () => {};
        sock.emit('error', errorName);
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
    });

    it('reaction on close event, string (state: CONNECTED; activity: CLOSING)', (done) => {

        let sock = new EventEmitter();
        sock.terminate = () => {};
        let errorName = 'Message is not JSON!';
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.CLOSING;
        let notDone = true;
        client.on('close', (msg) => {
          if(notDone){
            notDone = false;
            expect(msg).to.be.equal(errorName);
            client.terminate();
            done();
          }
        });
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);
        sock.emit('close', errorName);
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
    });


    it('reaction on close event, Error object (state: CONNECTED; activity: IDLE)', (done) => {

        let sock = new EventEmitter();
        sock.terminate = () => {};
        let errorName = 'Message is not JSON!';
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.IDLE;
        client.on('close', (msg) => {
          expect(msg).to.be.equal(`1005::No Status Recvd`);
          client.terminate();
          done();
        });
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);
        let err = new Error(errorName, 1005);
        err.code = 1005;
        sock.emit('close', err);
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);

    });

    it('reaction on close event, error code (state: CONNECTED; activity: IDLE)', (done) => {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1',
          credentials: {}
        });
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.activity = CONST.ACTIVITY.IDLE;
        client.on('close', ()=>{
          done(new Error('should be terminated, not close'));
        });
        client.on('terminated', (msg) =>{
          expect(msg).to.be.equal(`No Status Recvd`);
          client.terminate();
          done();
        });
        sock.emit('close', 1005);
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        setTimeout(()=>{
          clearInterval(client.connectInterval);
          clearTimeout(client.disconnectTimeout);
        },1000);

    });
  });



  describe('connection', () => {
    it('suicide', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.on('errored', (t) => {
          expect(t).to.be.instanceof(notWSConnection);
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
        sock.terminate = () => {};
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
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
        sock.terminate = () => {};
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
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
        sock.terminate = () => {};
        sock.close = () => {};
        let client = new notWSConnection({
          ws: sock,
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
        sock.terminate = () => {};
        sock.readyState = 1;
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1',
          secure: false
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
        sock.terminate = () => {};
        sock.readyState = 1;
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1',
          secure: true
        });
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        expect(client.isConnected()).to.be.true;
        done();
      } catch (e) {
        done(e);
      }
    });

    it('scheduleConnect - no input timeout', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        sock.readyState = 1;
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        expect(client.isConnected()).to.be.true;
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  describe('activity', () => {
    it('set/get', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
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
        let faultySet_1 = () => {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        let f = () => {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        let checked = false;
        client.on('diconnecting', ()=>{
          if(!checked){
            client.terminate();
            checked = true;
            done();
          }
        });
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        let throwing = [
          () => {
            client.state = CONST.STATE.AUTHORIZED;
          },
          () => {
            client.state = CONST.STATE.NO_PING;
          },
          () => {
            client.state = CONST.STATE.NOT_CONNECTED;
          },
          () => {
            client.state = undefined;
          },
        ];
        for (let f of throwing) {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.state = CONST.STATE.CONNECTED;
        client.on('authorized', () => done());
        expect(client.state).to.be.equal(CONST.STATE.CONNECTED);
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.disconnect = () => {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.disconnect = () => {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.reconnect = () => {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.state = CONST.STATE.CONNECTED;
        let throwing = [
          () => {
            client.state = CONST.STATE.CONNECTED;
          }
        ];
        for (let f of throwing) {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        client.disconnect = () => {
          done();
        };
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.disconnect = () => {
          done();
        }
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.reconnect = function() {
          done();
        }
        client.requestServerTime = () => {};
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.requestServerTime = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.AUTHORIZED;
        clearInterval(client.getTimeOffsetInt);
        expect(client.state).to.be.equal(CONST.STATE.AUTHORIZED);
        let throwing = [
          () => {
            client.state = CONST.STATE.AUTHORIZED;
          }
        ];
        for (let f of throwing) {
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.reconnect = () => {
          done();
        }
        client.requestServerTime = () => {};
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.requestServerTime = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.NO_PING;
        expect(client.state).to.be.equal(CONST.STATE.NO_PING);
        let throwing = [
          () => {
            client.state = CONST.STATE.CONNECTED;
          },
          () => {
            client.state = CONST.STATE.AUTHORIZED;
          },
          () => {
            client.state = CONST.STATE.ERRORED;
          },
          () => {
            client.state = CONST.STATE.NO_PING;
          }
        ];
        for (let f of throwing) {
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
        sock.terminate = function() {};
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.reconnect = () => {
          done();
        }
        client.disconnect = () => {};
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
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.disconnect = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        expect(client.activity).to.be.equal(CONST.ACTIVITY.IDLE);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('set/get - ERRORED -> [not allowed states: CONNECTED, AUTHORIZED, NO_PING], throwing Errors', (done) => {
      try {
        let sock = new EventEmitter();
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        expect(client.state).to.be.equal(CONST.STATE.NOT_CONNECTED);
        client.requestServerTime = () => {};
        client.disconnect = () => {};
        client.state = CONST.STATE.CONNECTED;
        client.state = CONST.STATE.ERRORED;
        expect(client.state).to.be.equal(CONST.STATE.ERRORED);
        let throwing = [
          () => {
            client.state = CONST.STATE.CONNECTED;
          },
          () => {
            client.state = CONST.STATE.AUTHORIZED;
          },
          () => {
            client.state = CONST.STATE.NO_PING;
          }
        ];
        for (let f of throwing) {
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
    it('add to history; test history length cap', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        sock.readyState = 1;
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1'
        });
        client.state = CONST.STATE.CONNECTED;
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.addToHistory({
          some: 'data'
        });
        expect(client.history.length).to.be.equal(1);
        client.addToHistory({
          some: 'data2'
        });
        expect(client.history.length).to.be.equal(2);
        client.addToHistory({
          some: 'data3'
        });
        expect(client.history.length).to.be.equal(3);
        for (let i = 0; i < 45; i++) {
          client.addToHistory({
            some: 'data_' + i
          });
          expect(client.history.length).to.be.below(41);
        }
        done();
      } catch (e) {
        done(e);
      }
    });

    it('send all from history', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        sock.readyState = 1;
        let client = new notWSConnection({
          ws: sock,
          state: 'offline',
          ip: '127.0.0.1',
        });

        client.state = CONST.STATE.CONNECTED;
        client.diconnect = () => {};
        client.reconnect = () => {};
        client.addToHistory({
          some: 'data'
        });
        expect(client.history.length).to.be.equal(1);
        client.addToHistory({
          'type': 'new',
          some: 'data'
        });
        expect(client.history.length).to.be.equal(2);
        client.addToHistory({
          'type': 'old',
          some: 'data'
        });
        expect(client.history.length).to.be.equal(3);
        for (let i = 0; i < 45; i++) {
          client.addToHistory({
            'type': 'test',
            some: 'data_' + i
          });
          expect(client.history.length).to.be.below(41);
        }
        let counter = 0;
        client.send = () => {
          counter++;
          return Promise.resolve();
        }
        client.sendAllFromHistory();
        expect(counter).to.be.equal(40);
        done();
      } catch (e) {
        done(e);
      }
    });
  });


});
