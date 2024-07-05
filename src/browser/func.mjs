//Проверка является ли переменная функцией.
function isFunc(func){
	return typeof(func) === 'function';
}

/**
* Returns true if argument is Async function
* @param {function} func to test
* @return {boolean} if this function is constructed as AsyncFunction
**/
function isAsync(func){
	return func.constructor.name === "AsyncFunction";
}

/**
* Executes method in appropriate way inside Promise
* @param {function} proc function to execute
* @param {Array} params array of params
* @return {Promise} results of method execution
**/
async function executeFunctionAsAsync (proc, params){
	if (isFunc(proc)) {
		if (isAsync(proc)) {
			return await proc(...params);
		} else {
			return proc(...params);
		}
	}
//throw new Error("Could not execute `proc` is not a function");
}

function noop() {}
function heartbeat() { this._alive = true;}

function ObjHas(obj, prop){
	return Object.hasOwn(obj, prop);
}

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

function isArray(val){
	return Array.isArray(val);
}

let capitalizeFirstLetter = function(name){
	return name.charAt(0).toUpperCase() + name.slice(1);
};


export default {
	isFunc,
	isAsync,
	executeFunctionAsAsync,
	isArray,
	noop,
	heartbeat,
	ObjHas,
	tryParseJSON,
	capitalizeFirstLetter
};
    