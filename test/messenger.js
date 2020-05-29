const
  uuidv4 = require('uuid/v4'),
  expect = require('chai').expect,
  assert = require('chai').assert,
  notWSMessage = require('../src/node/messenger.js');

before((done) => {
  done();
});

after((done) => {
  done();
});

describe('notWSMessage', () => {
  before(() => {});
  after(() => {});

  it('creating default', (done) => {
    try {
      new notWSMessage();
      done();
    } catch (e) {
      done(e);
    }
  });

  it('setting credentials', () => {
    let msg = new notWSMessage(),
      cred = {
        login: 'master',
        password: 'test'
      };
    msg.setCredentials(cred);
    expect(msg.options.credentials).to.be.deep.equal(cred);
  });

  it('getting service data from message', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'auth',
        validate: 'me',
        od: 1
      },
      serviceData = msg.getServiceData(message);
    expect(serviceData).to.be.deep.equal({
      id: message.id,
      time: message.time,
      type: message.type,
      name: message.name
    });
  });

  it('getting type', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        validate: 'me',
        od: 1
      };
    expect(msg.getType(message)).to.be.deep.equal('request');
  });

  it('getting name', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        validate: 'me',
        od: 1
      };
    expect(msg.getName(message)).to.be.deep.equal('loath');
  });

  it('getting credentials', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        validate: 'me',
        od: 1,
        cred: {
          login: 'logn',
          passw: 'passwd'
        }
      };
    expect(msg.getCredentials(message)).to.be.deep.equal({
      login: 'logn',
      passw: 'passwd'
    });
  });

  it('getting payload', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        validate: 'me',
        payload: {
          test: 'ok'
        },
        od: 1,
        cred: {
          login: 'logn',
          passw: 'passwd'
        }
      };
    expect(msg.getPayload(message)).to.be.deep.equal({
      test: 'ok'
    });
  });

  it('isErrored - false', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        validate: 'me',
        payload: {
          test: 'ok'
        },
        od: 1,
        cred: {
          login: 'logn',
          passw: 'passwd'
        }
      };
    expect(msg.isErrored(message)).to.be.not.ok;
  });

  it('isErrored - true', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        error: {},
        validate: 'me',
        payload: {
          test: 'ok'
        },
        od: 1,
        cred: {
          login: 'logn',
          passw: 'passwd'
        }
      };
    expect(msg.isErrored(message)).to.be.ok;
  });

  it('getErrorMessage from string error', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        error: 'string',
        validate: 'me',
        payload: {
          test: 'ok'
        },
        od: 1,
        cred: {
          login: 'logn',
          passw: 'passwd'
        }
      };
    expect(msg.getErrorMessage(message)).to.be.equal('string');
  });

  it('getErrorMessage from error object', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        error: {
          code: 200,
          message: 'legacy error'
        },
        validate: 'me',
        payload: {
          test: 'ok'
        },
        od: 1,
        cred: {
          login: 'logn',
          passw: 'passwd'
        }
      };
    expect(msg.getErrorMessage(message)).to.be.deep.equal('200: legacy error');
  });

  it('getErrorMessage from undefined error', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        validate: 'me',
        payload: {
          test: 'ok'
        },
        od: 1,
        cred: {
          login: 'logn',
          passw: 'passwd'
        }
      };
    expect(() => {
      msg.getErrorMessage(message)
    }).to.throw(Error);
  });

  it('getErrorReport from error object', () => {
    let msg = new notWSMessage(),
      message = {
        id: uuidv4(),
        time: (new Date()).getTime(),
        type: 'request',
        name: 'loath',
        error: {
          code: 200,
          message: 'legacy error'
        }
      };
    expect(msg.getErrorReport(message)).to.be.deep.equal({
      code: 200,
      message: 'legacy error'
    });
  });

  it('pack message, without cred and error', () => {
    let msg = new notWSMessage(),
      payload = {
        test: 90
      },
      serviceData = {
        type: 'response',
        name: 'auth'
      },
      packed = msg.pack(payload, serviceData);
    expect(packed).to.have.property('id');
    expect(packed).to.have.property('time');
    expect(packed).to.have.property('payload');
    expect(packed).to.have.property('type');
    expect(packed).to.have.property('name');
  });

  it('pack message with error, without cred', () => {
    let msg = new notWSMessage(),
      payload = {
        test: 90
      },
      error = {
        code: 1,
        message: 'error'
      },
      serviceData = {
        type: 'response',
        name: 'auth'
      },
      packed = msg.pack(payload, serviceData, error);
    expect(packed).to.have.property('id');
    expect(packed).to.have.property('time');
    expect(packed).to.have.property('payload');
    expect(packed).to.have.property('type');
    expect(packed).to.have.property('name');
    expect(packed).to.have.property('error');
  });

  it('pack message with error and with cred', () => {
    let msg = new notWSMessage({
        credentials: {
          login: 'login',
          passwd: 'passwd'
        }
      }),
      payload = {
        test: 90
      },
      error = {
        code: 1,
        message: 'error'
      },
      serviceData = {
        type: 'response',
        name: 'auth'
      },
      packed = msg.pack(payload, serviceData, error);
    expect(packed).to.have.property('id');
    expect(packed).to.have.property('time');
    expect(packed).to.have.property('payload');
    expect(packed).to.have.property('type');
    expect(packed).to.have.property('name');
    expect(packed).to.have.property('error');
    expect(packed).to.have.property('cred');
    expect(packed.cred).to.be.deep.equal({
      login: 'login',
      passwd: 'passwd'
    });
  });

  it('pack message with error and with cred, but without serviceData - should throw', () => {
    let msg = new notWSMessage({
        credentials: {
          login: 'login',
          passwd: 'passwd'
        }
      }),
      payload = {
        test: 90
      },
      error = {
        code: 1,
        message: 'error'
      },
      pack = () => {
        msg.pack(payload, undefined, error)
      };
    expect(pack).to.throw(Error);
  });


  it('unpack message, without cred and error', () => {
    let msg = new notWSMessage(),
      message = {
        payload: {
          foo: 'bar'
        },
        type: 'response',
        name: 'auth'
      },
      unpacked = msg.unpack(message);
    expect(unpacked).to.have.property('cred');
    expect(unpacked).to.have.property('service');
    expect(unpacked).to.have.property('payload');
    expect(unpacked.cred).to.be.undefined;
    expect(unpacked.service).to.be.deep.equal({
      id: undefined,
      time: undefined,
      type: 'response',
      name: 'auth'
    });
    expect(unpacked.payload).to.be.deep.equal({
      foo: 'bar'
    });
  });

  it('unpack message, without cred, but with error - should throw', () => {
    let msg = new notWSMessage(),
      message = {
        payload: {
          foo: 'bar'
        },
        error: {
          code: 500,
          message: 'This is fatal.'
        },
        type: 'response',
        name: 'auth'
      },
      unpack = () => {
        msg.unpack(message)
      };
    expect(unpack).to.throw(Error);
  });

  it('validateCredentials: no cred, insecure, no validators', () => {
    let msg = new notWSMessage({
        secure: false
      }),
      message = {
        cred: undefined,
        type: 'response',
        name: 'auth'
      };
    expect(msg.validateCredentials(message.cred)).to.be.ok;
  });

  it('validateCredentials: no cred, secure, no validators', () => {
    let msg = new notWSMessage({
        secure: true
      }),
      message = {
        cred: undefined,
        type: 'response',
        name: 'auth'
      };
    expect(msg.validateCredentials(message.cred)).to.be.not.ok;
  });

  it('validateCredentials: no cred, secure, validators', () => {
    let msg = new notWSMessage({
        secure: true,
        validators: {
          credentials(cred) {
            return (cred.login === 'login') && (cred.password === 'password');
          }
        }
      }),
      message = {
        cred: undefined,
        type: 'response',
        name: 'auth'
      };
    expect(msg.validateCredentials(message.cred)).to.be.not.ok;
  });

  it('validateCredentials: invalid cred, secure, validators', () => {
    let msg = new notWSMessage({
        secure: true,
        validators: {
          credentials(cred) {
            return (cred.login === 'login') && (cred.password === 'password');
          }
        }
      }),
      message = {
        cred: {
          login: 'paasword',
          password: 'login'
        },
        type: 'response',
        name: 'auth'
      };
    expect(msg.validateCredentials(message.cred)).to.be.not.ok;
  });

  it('validateCredentials: valid cred, secure, validators', () => {
    let msg = new notWSMessage({
        secure: true,
        validators: {
          credentials(cred) {
            return (cred.login === 'login') && (cred.password === 'password');
          }
        }
      }),
      message = {
        cred: {
          login: 'login',
          password: 'password'
        },
        type: 'response',
        name: 'auth'
      };
    expect(msg.validateCredentials(message.cred)).to.be.ok;
  });

  it('validateType: no types, invalid type, insecure', () => {
    let msg = new notWSMessage({
        secure: false
      }),
      message = {
        type: 'response',
        name: 'auth'
      };
    expect(msg.validateType(message.type)).to.be.not.ok;
  });

  it('validateType: invalid type, insecure', () => {
    let msg = new notWSMessage({
        secure: false,
        types: {
          request: ['list']
        }
      }),
      message = {
        type: 'anounce',
        name: 'auth'
      };
    expect(msg.validateType(message.type)).to.be.not.ok;
  });

  it('validateType: valid type, insecure', () => {
    let msg = new notWSMessage({
        secure: false,
        types: {
          request: ['list']
        }
      }),
      message = {
        type: 'request',
        name: 'auth'
      };
    expect(msg.validateType(message.type)).to.be.ok;
  });

  it('validateTypeAndName: invalid type, invalid name, insecure', () => {
    let msg = new notWSMessage({
        secure: false,
        types: {
          request: ['list']
        }
      }),
      message = {
        type: 'response',
        name: 'auth'
      };
    expect(msg.validateTypeAndName(message.type, message.name)).to.be.not.ok;
  });

  it('validateTypeAndName: invalid type, valid name, insecure', () => {
    let msg = new notWSMessage({
        secure: false,
        types: {
          request: ['list']
        }
      }),
      message = {
        type: 'lenta',
        name: 'list'
      };
    expect(msg.validateTypeAndName(message.type, message.name)).to.be.not.ok;
  });

  it('validateTypeAndName: valid type, invalid name, insecure', () => {
    let msg = new notWSMessage({
        secure: false,
        types: {
          request: ['list']
        }
      }),
      message = {
        type: 'request',
        name: 'tequela'
      };
    expect(msg.validateTypeAndName(message.type, message.name)).to.be.not.ok;
  });

  it('validateTypeAndName: valid type, valid name, insecure', () => {
    let msg = new notWSMessage({
        secure: false,
        types: {
          request: ['list']
        }
      }),
      message = {
        type: 'request',
        name: 'list'
      };
    expect(msg.validateTypeAndName(message.type, message.name)).to.be.ok;
  });

  it('validateTypeAndName for Response without declaration: valid type, valid name, insecure', () => {
    let msg = new notWSMessage({
        secure: false,
        types: {
          request: ['list']
        }
      }),
      message = {
        type: 'response',
        name: 'list'
      };
    expect(msg.validateTypeAndName(message.type, message.name)).to.be.ok;
  });


  it('routeIsSecurityException: no security exceptions', () => {
    let msg = new notWSMessage({
        secure: false,
        securityException: undefined
      }),
      type = 'request',
      name = 'list';
    expect(msg.routeIsSecurityException(type, name)).to.be.not.ok;
  });


  it('routeIsSecurityException: security exceptions, wrong route', () => {
    let msg = new notWSMessage({
        secure: false,
        securityException: ['method.open']
      }),
      type = 'request',
      name = 'list';
    expect(msg.routeIsSecurityException(type, name)).to.be.not.ok;
  });


  it('validate: no service data', () => {
    let msg = new notWSMessage({
        secure: false,
        securityException: ['method.open']
      }),
      message = {
        payload: {
          foo: 'bar'
        }
      };
    expect(() => {
      msg.validate(message)
    }).to.throw(Error);
  });


  it('validate: service data with missformed id', (done) => {
    let msg = new notWSMessage({
        secure: false,
        securityException: ['method.open']
      }),
      message = {
				id: '123123',
        payload: {
          foo: 'bar'
        }
      };
      try{
        msg.validate(message)
        done(new Error('expect to throw error'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Message ID is not valid uuidv4');
        done();
      }
  });

	it('validate: route is not security exception in secure env ', (done) => {
    let msg = new notWSMessage({
        secure: true,
        securityException: ['method.open']
      }),
      message = {
				id: uuidv4(),
        payload: {
          foo: 'bar'
        }
      };
    try{
      msg.validate(message)
      done(new Error('expect to throw error'));
    }catch(e){
      expect(e).to.be.instanceof(Error);
      expect(e.message).to.be.equal('Message Credentials is not valid!');
      done();
    }
  });

  it('validate: route is security exception in secure env, but type is not correct ', (done) => {
    let msg = new notWSMessage({
        secure: true,
        securityException: ['method.open']
      }),
      message = {
				id: uuidv4(),
        type: 'method',
        name: 'open',
        payload: {
          foo: 'bar'
        }
      };
    try{
      msg.validate(message)
      done(new Error('expect to throw error'));
    }catch(e){
      expect(e).to.be.instanceof(Error);
      expect(e.message).to.be.equal('Message Type is not valid!');
      done();
    }
  });

  it('validate: route is security exception in secure env, but name is not correct ', (done) => {
    let msg = new notWSMessage({
        secure: true,
        securityException: ['method.open'],
        types:{
          method: ['man']
        }
      }),
      message = {
				id: uuidv4(),
        type: 'method',
        name: 'open',
        payload: {
          foo: 'bar'
        }
      };
    try{
      msg.validate(message)
      done(new Error('expect to throw error'));
    }catch(e){
      expect(e).to.be.instanceof(Error);
      expect(e.message).to.be.equal('Message Name is not valid!');
      done();
    }
  });

  it('validate: route is security exception in secure env, but type is not correct ', (done) => {
    let msg = new notWSMessage({
        secure: true,
        securityException: ['method.open'],
        types:{
          method: ['open']
        }
      }),
      message = {
				id: uuidv4(),
        type: 'method',
        name: 'open',
        payload: {
          foo: 'bar'
        }
      };
    try{
      msg.validate(message)
      done();
    }catch(e){
      done(e);
    }
  });

});
