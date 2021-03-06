'use strict';
//Смещение временной зоны.
const TZ_OFFSET = (new Date().getTimezoneOffset() / 60) * -1;

const ENV_TYPE = process.env.NODE_ENV;

const DEV_ENV = 'development';
const NOOP = ()=>{};
//Standart pad function.
function pad(n) { return n < 10 ? '0' + n : n; }

//Convert Date object to local ISO string.
function localIsoDate(date){
	date = date || new Date;
	let localIsoString = date.getFullYear() + '-'
      + pad(date.getMonth() + 1) + '-'
      + pad(date.getDate()) + 'T'
      + pad(date.getHours()) + ':'
      + pad(date.getMinutes()) + ':'
      + pad(date.getSeconds());
	return localIsoString;
}
//Проверка является ли переменная функцией.
let isFunc = function(func){
	return typeof(func) === 'function';
};
//Проверка является ли переменная массивом
let isArray = function(data){
	return (typeof data == "object") && (data instanceof Array);
};
//Функция вывода сообщения в консоль.
let logMsg = function(){
	let now = localIsoDate();
	// eslint-disable-next-line no-console
	console.log(`[${now}]: `, ...arguments);
};
//Генерация метода вывода сообщений в консоль с указанием префикса.
let genLogMsg = (prefix)=>{
	return function(){
		let now = localIsoDate();
		// eslint-disable-next-line no-console
		console.log(`[${now}]: ${prefix}::`, ...arguments);
	};
};

/**
* Определяет является ли окружение окружением разработки
* @returns  {boolean} true если это запущено в окружении разработки
**/
function isDev(){
	return ENV_TYPE === DEV_ENV;
}

let genLogDebug = (prefix)=>{
	if (isDev()){
		return genLogMsg(prefix);
	}else{
		return NOOP;
	}
};

//Функция вывода сообщения об ошибке
let logError = function(){
	let now = localIsoDate();
	// eslint-disable-next-line no-console
	console.error(`[${now}]: `, ...arguments);
};

let genLogError = (prefix)=>{
	return function(){
		let now = localIsoDate();
		// eslint-disable-next-line no-console
		console.error(`[${now}]: ${prefix}::`, ...arguments);
	};
};
//Проверка строки на JSON(со stackoverflow).
//http://stackoverflow.com/questions/3710204/how-to-check-if-a-string-is-a-valid-json-string-in-javascript-without-using-try
let tryParseJSON = function (jsonString){
	try {
		let o = JSON.parse(jsonString);
		// Handle non-exception-throwing cases:
		// Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
		// but... JSON.parse(null) returns null, and typeof null === "object",
		// so we must check for that, too. Thankfully, null is falsey, so this suffices:
		if (o && typeof o === "object") {
			return o;
		}
	}catch (e) {
		// eslint-disable-next-line no-console
		console.error(e);
	}
	return false;
};

let capitalizeFirstLetter = function(name){
	return name.charAt(0).toUpperCase() + name.slice(1);
};




	exports.TZ_OFFSET 	 = TZ_OFFSET;
	exports.logMsg       = logMsg;
	exports.logError     = logError;
	exports.genLogMsg    = genLogMsg;
	exports.genLogError  = genLogError;
	exports.genLogDebug  = genLogDebug;
	exports.isFunc       = isFunc;
	exports.isArray      = isArray;
	exports.localIsoDate = localIsoDate;
	exports.tryParseJSON = tryParseJSON;
	exports.capitalizeFirstLetter = capitalizeFirstLetter;


