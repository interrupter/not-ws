const
  expect = require('chai').expect,
  notWSRouter = require('../src/node/router.js');

before((done) => {
  done();
});

after((done) => {
  done();
});

describe('notWSRouter', () => {
  before(() => {});
  after(() => {});

  it('creating default', (done) => {
    try {
      new notWSRouter({});
      done();
    } catch (e) {
      done(e);
    }
  });

  it('creating with undefined routes', (done) => {
      try {
        new notWSRouter({routes:undefined});
        done();
      } catch (e) {
        done(e);
      }
  });


  it('creating with empty routes', (done) => {
    try {
      new notWSRouter({routes:{}})
      done();
    } catch (e) {
      done(e);
    }
  });

  it('creating with routes', () => {
    let
      routes = {
        method:{
          man(){}
        }
      },
      router = new notWSRouter({routes});

    expect(router.routes.method).to.be.deep.equal(routes.method);
  });

  it('route: no route - should throw', (done) => {
    let
      routes = {
        method:{
          man(){}
        }
      },
      router = new notWSRouter({routes});
      try{
        router.route({type: 'many', name: 'soy', cred: null}, {});
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route not found many/soy');
        done();
      }
  });

  it('route: good route, Promise returned', () => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      let t = router.route({type: 'method', name: 'man', cred: null}, {}, {ip: '127.0.0.1'});
      expect(t).to.instanceof(Promise);
  });

  it('setRoutesForType: type is invalid: null', (done) => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.setRoutesForType(null, {});
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route\'s type name should be a String!');
        done();
      }
  });

  it('setRoutesForType: type is invalid: object', (done) => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.setRoutesForType({}, {});
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route\'s type name should be a String!');
        done();
      }
  });

  it('setRoutesForType: type is invalid: undefined', (done) => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.setRoutesForType(undefined, {});
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route\'s type name should be a String!');
        done();
      }
  });

  it('setRoutesForType: type is invalid: empty string', (done) => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.setRoutesForType('', {});
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route\'s type name should be a String!');
        done();
      }
  });

  it('setRoutesForType: good type, routes is invalid: null', (done) => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.setRoutesForType('test', null);
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route\'s type\'s routes set should be an Object!');
        done();
      }
  });

  it('setRoutesForType: good type, routes is invalid: undefined', (done) => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.setRoutesForType('test', undefined);
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route\'s type\'s routes set should be an Object!');
        done();
      }
  });

  it('setRoutesForType: good type, routes is invalid: number', (done) => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.setRoutesForType('test', 12.3);
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('Route\'s type\'s routes set should be an Object!');
        done();
      }
  });

  it('setRoutesForType: good type - new, good routes', () => {
    let
      routes = {
        method:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      router.setRoutesForType('test', {me(){}});
      expect(router.routes).to.have.property('test');
      expect(router.routes.test).to.have.keys(['me', 'sayHello']);
  });

  it('setRoutesForType: good type - exists, good routes', () => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      router.setRoutesForType('test', {me(){}});
      expect(router.routes).to.have.property('test');
      expect(router.routes.test).to.have.keys(['me', 'man', 'sayHello']);
  });


  it('unsetRoutesForType: good type - exists, bad list of routes: null', (done) => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.unsetRoutesForType('test', null);
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('List of routes names should be an Array!');
        done();
      }
  });

  it('validateRoutesList: undefined - should throw', (done) => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      try{
        router.validateRoutesList(undefined);
        done(new Error('this should throw, but worked out!'));
      }catch(e){
        expect(e).to.be.instanceof(Error);
        expect(e.message).to.be.equal('List of routes names should be an Array!');
        done();
      }
  });

  it('unsetRoutesForType: good type - exists, good list of routes', () => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      router.unsetRoutesForType('test', ['man', 'sayHello']);
      expect(Object.keys(router.routes).length).to.be.equal(2);
      router.unsetRoutesForType('__service', ['updateToken']);
      expect(Object.keys(router.routes).length).to.be.equal(1);
  });

  it('unsetRoutesForType: good type - exists, good list of routes', () => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          },
          woman(data){
            return Promise.resolve(data);
          },
          kid(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      router.unsetRoutesForType('test', ['man', 'woman']);
      expect(Object.keys(router.routes).length).to.be.equal(3);
      expect(router.routes.test).to.have.keys(['kid', 'sayHello']);
  });

  it('unsetRoutesForType: good type - exists, good list of routes, but some does not exist', () => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          },
          woman(data){
            return Promise.resolve(data);
          },
          kid(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      router.unsetRoutesForType('test', ['man', 'woman', 'oldman']);
      expect(Object.keys(router.routes).length).to.be.equal(3);
      expect(router.routes.test).to.have.keys(['kid', 'sayHello']);
  });

  it('unsetRoutesForType: good type - exists, list is not specified', () => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          },
          woman(data){
            return Promise.resolve(data);
          },
          kid(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      router.unsetRoutesForType('test');
      expect(Object.keys(router.routes).length).to.be.equal(3);
      expect(router.routes.test).to.have.keys(['kid', 'sayHello', 'woman', 'man']);
  });

  it('unsetRoutesForType: bad type - not exists, good list of routes', () => {
    let
      routes = {
        test:{
          man(data){
            return Promise.resolve(data);
          },
          woman(data){
            return Promise.resolve(data);
          },
          kid(data){
            return Promise.resolve(data);
          }
        }
      },
      router = new notWSRouter({routes});
      router.unsetRoutesForType('tst', ['man', 'woman']);
      expect(Object.keys(router.routes).length).to.be.equal(3);
      expect(router.routes.test).to.have.keys(['kid', 'sayHello', 'man', 'woman']);
  });

});
