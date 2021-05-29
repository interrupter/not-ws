const
  EventEmitter = require('events'),
  expect = require('chai').expect,
  CONST = require('../src/node/const.js'),
  notWSServerClient = require('../src/node/client.js'),
  notWSRouter = require('../src/node/router.js'),
  notWSMessenger = require('../src/node/messenger.js');

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

function getFakeMessengerAndRouter(){
  return {
    router: new notWSRouter({}),
    messenger: new notWSMessenger({})
  };
}

describe('notWSServerClient', () => {
  it('creating default', (done) => {
    try {
      let sock = new EventEmitter();
      sock.terminate = () => {};
      new notWSServerClient({
        ...getFakeMessengerAndRouter(),
        connection: {
          ws: sock,
        },
        slave: true,
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  it('creating default with name in options', (done) => {
    try {
      let sock = new EventEmitter();
      sock.terminate = () => {};
      new notWSServerClient({
        connection: {
          ws: sock,
          ip: '127.0.0.1',
        },
        slave: true,
        credentials: {},
        name: 'test socket',
        ...getFakeMessengerAndRouter(),
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  describe('request checks', () => {
    it('start checks', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
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
        sock.terminate = () => {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        client.reqChkStep = 10;
        client.startReqChckTimer();
        client.stopReqChckTimer();
        done();
      } catch (e) {
        done(e);
      }
    });

    it('find request position by id', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        client.requests = [{
          id: 1
        }, {
          id: 11
        }, {
          id: 1111
        }];
        expect(client.findRequest(11)).to.be.equal(1);
        expect(client.findRequest(1111)).to.be.equal(2);
        expect(client.findRequest(1)).to.be.equal(0);
        expect(client.findRequest(11111)).to.be.equal(false);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('add request', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        client.requests = [];
        client.addRequest(12, done);
        expect(client.requests.length).to.be.equal(1);
        expect(client.requests[0].id).to.be.equal(12);
        done();
      } catch (e) {
        done(e);
      }
    });

    it('check requests - empty request queue', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        client.checkRequests();
        done();
      } catch (e) {
        done(e);
      }
    });

    it('check requests - request queue without timeouts', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        sock.close = () => {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        client.addRequest(1, () => {
          done(new Error('shouldnt be called'));
        });
        client.addRequest(2, () => {
          done(new Error('shouldnt be called'));
        });
        client.addRequest(3, () => {
          done(new Error('shouldnt be called'));
        });
        client.checkRequests();
        done();
      } catch (e) {
        done(e);
      }
    });


    it('check requests - request queue with few timeouts', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = function() {};
        sock.close = function() {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        client.disconnect = () => {};
        let errCB = (err) => {
          expect(err).to.be.equal('Request timeout');
        };
        let timeout = Date.now() - (client.reqTimeout + 100);
        client.addRequest(1, () => {
          done(new Error('shouldnt be called'));
        });
        client.requests.push({
          id: 21,
          cb: errCB,
          time: timeout
        });
        client.requests.push({
          id: 31,
          cb: errCB,
          time: timeout
        });
        client.addRequest(2, () => {
          done(new Error('shouldnt be called'));
        });
        client.addRequest(3, () => {
          done(new Error('shouldnt be called'));
        });
        client.requests.push({
          id: 41,
          cb: errCB,
          time: timeout
        });
        client.checkRequests();
        setTimeout(done, 1000);
      } catch (e) {
        done(e);
      }
    });

    it('check requests - request queue(10000) with all timeouts and no callbacks', (done) => {
      try {
        let sock = new EventEmitter();
        sock.terminate = () => {};
        sock.close = () => {};
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        let checked = 0;
        client.disconnect = () => {};
        client.logMsg = (msg) => {
          if (checked < 10000) {
            expect(msg).match(/timeout check:Не задан callback для запроса с id: \d+/);
            checked++;
            if (checked === 10000) {
              done();
            }
          }
        };
        let timeout = Date.now() - (client.reqTimeout + 100);
        for (let t = 0; t < 10000; t++) {
          client.requests.push({
            id: t,
            cb: undefined,
            time: timeout
          });
        }
        client.checkRequests();
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
          ...getFakeMessengerAndRouter(),
          slave: true,
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
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
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
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
        sock.readyState = 1;
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        sock.terminate = () => {};
        client.connection.isConnected = () => true;
        client.request = () => {
          return Promise.reject(new Error(errorName));
        };
        expect(client.connection.isConnected()).to.be.ok;
        client.logError = (err) => {
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
        sock.readyState = 1;
        let client = new notWSServerClient({
          ...getFakeMessengerAndRouter(),
          connection:{
            ws: sock,
            ip: '127.0.0.1',
          },
          slave: true,
          credentials: {}
        });
        sock.terminate = () => {};
        client.request = async (name, data, secure) => {
          return Date.now() - 2000;
        };
        client.requestServerTime();
        setTimeout(()=>{
          expect(client.timeOffset).to.be.within(-3000, 3000);
          done();
        }, 500);
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
