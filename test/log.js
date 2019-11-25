const expect = require('chai').expect,
	utils = require('../src/node/log.js');

describe('LOG', function () {
	it('logMsg, logError, genLogError, isFunc, isArray, localIsoDate, genLogMsg, tryParseJSON, capitalizeFirstLetter defined', ()=>{
		expect(utils.logMsg).to.be.instanceof(Function);
    expect(utils.logError).to.be.instanceof(Function);
    expect(utils.genLogError).to.be.instanceof(Function);
		expect(utils.isFunc).to.be.instanceof(Function);
		expect(utils.isArray).to.be.instanceof(Function);
    expect(utils.localIsoDate).to.be.instanceof(Function);
		expect(utils.genLogMsg).to.be.instanceof(Function);
		expect(utils.tryParseJSON).to.be.instanceof(Function);
    expect(utils.capitalizeFirstLetter).to.be.instanceof(Function);
	});

  describe('logMsg', function(){
    it('base', (done)=>{
      let argsTest = [1, 2,'test', {}, 'lettters'];
      console.logBak = console.log;
      console.log = function(){
        let now = utils.localIsoDate();
        let [time, ...args] = Array.from(arguments);
        expect(time).to.be.equal(`[${now}]: `);
        expect(args).to.have.ordered.members(argsTest);
        console.log = console.logBak;
        done();
      };
      utils.logMsg(...argsTest);
    });
  });

  describe('logError', function(){
    it('base', (done)=>{
      let argsTest = [1, 2,'test', {}, 'lettters'];
      console.errorBak = console.error;
      console.error = function(){
        let now = utils.localIsoDate();
        let [time, ...args] = Array.from(arguments);
        expect(time).to.be.equal(`[${now}]: `);
        expect(args).to.have.ordered.members(argsTest);
        console.error = console.errorBak;
        done();
      };
      utils.logError(...argsTest);
    });
  });

  describe('genLogError', function(){
    it('base', (done)=>{
      let argsTest = [1, 2,'test', {}, 'lettters'];
      let prefix = Math.random().toString();
      console.errorBak = console.error;
      console.error = function(){
        let now = utils.localIsoDate();
        let [time, ...args] = Array.from(arguments);
        expect(time).to.be.equal(`[${now}]: ${prefix}::`);
        expect(args).to.have.ordered.members(argsTest);
        console.error = console.errorBak;
        done();
      };
      let tf = utils.genLogError(prefix);
      tf(...argsTest);
    });
  });

  describe('isFunc', ()=>{
    it('base', ()=>{
      expect(utils.isFunc(()=>{})).to.be.true;
      expect(utils.isFunc(function(){})).to.be.true;
      expect(utils.isFunc()).to.be.false;
      expect(utils.isFunc(undefined)).to.be.false;
      expect(utils.isFunc(null)).to.be.false;
      expect(utils.isFunc(1)).to.be.false;
      expect(utils.isFunc('1')).to.be.false;
      expect(utils.isFunc({})).to.be.false;
    });
  });

  describe('isArray', ()=>{
    it('base', ()=>{
      expect(utils.isArray([])).to.be.true;
      expect(utils.isArray(Array(1,2,3))).to.be.true;
      expect(utils.isArray()).to.be.false;
      expect(utils.isArray(undefined)).to.be.false;
      expect(utils.isArray(null)).to.be.false;
      expect(utils.isArray(1)).to.be.false;
      expect(utils.isArray('1')).to.be.false;
      expect(utils.isArray({})).to.be.false;
    });
  });

  describe('tryParseJSON', ()=>{
    it('parse ok', ()=>{
      expect(utils.tryParseJSON('{"a": 1}')).to.be.deep.equal({a:1});
    });

    it('parse failed, thru exception', ()=>{
      expect(utils.tryParseJSON('{1}')).to.be.false;
    });

    it('parse failed, without exception', ()=>{
      expect(utils.tryParseJSON(null)).to.be.false;
    });
  });

  describe('capitalizeFirstLetter', ()=>{
    it('base', ()=>{
      expect(utils.capitalizeFirstLetter('case')).to.be.equal('Case');
      expect(utils.capitalizeFirstLetter('Case')).to.be.equal('Case');
      expect(utils.capitalizeFirstLetter('1case')).to.be.equal('1case');
      expect(utils.capitalizeFirstLetter(' case')).to.be.equal(' case');
    });
  });
});
