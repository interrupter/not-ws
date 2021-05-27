const expect = require('chai').expect,
	utils = require('../src/node/func.js');

describe('Func', function () {
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
