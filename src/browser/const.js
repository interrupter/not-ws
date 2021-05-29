const STATE = {
	//нет подключения
	NOT_CONNECTED: 0,
	//есть подключение
	CONNECTED: 1,
	//есть авторизация
	AUTHORIZED: 2,
	//нет отклика
	NO_PING: 3,
	//ошибка соединения
	ERRORED: 4
};

const STATE_NAME = {
	0: 'Не подключен',
	1: 'Подключен',
	2: 'Авторизован',
	3: 'Нет отклика',
	4: 'Ошибка связи',
};

//деятельность объекта, не завершенное дествие
const ACTIVITY = {
	IDLE: 0,
	//идёт подключение
	CONNECTING: 1,
	//закрытие соединения
	CLOSING: 2,
	//разрыв соединения
	TERMINATING: 3,
	//авторизация по токену
	AUTHORIZING: 4
};

const ACTIVITY_NAME = {
	0: 'Простаивает',
	1: 'Открытие связи',
	2: 'Закрытие связи',
	3: 'Обрыв связи',
	4: 'Авторизация',
};


//Список кодов закрытия взят с https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
let WS_CLOSURE_REASONS = {
	1000 : 'Normal Closure',
	1001 : 'Going Away',
	1002 : 'Protocol Error',
	1003 : 'Unsupported Data',
	1005 : 'No Status Recvd',
	1006 : 'Abnormal Closure',
	1007 : 'Invalid frame payload data',
	1008 : 'Policy Violation',
	1009 : 'Message too big',
	1010 : 'Missing Extension',
	1011 : 'Internal Error',
	1012 : 'Service Restart',
	1013 : 'Try Again Later',
	1014 : 'Bad Gateway',
	1015 : 'TLS Handshake'
};

//Возвращает описание причины возникновения ивента закрытия WS-подключения
function mapWsCloseCodes(event){
	if(!event) return 'unknown reason';   //Если event не задан, то причина неизвестна.
	if(event.reason) return event.reason; //Если reason уже задан, возвращаем его.
	//Определяем reason-код и ищем его в WS_CLOSURE_REASONS
	let code = (typeof event.code !== 'undefined'? event.code.toString(): 'undefined');
	if (!isNaN(parseInt(event))){
		code = event;
	}
	return Object.prototype.hasOwnProperty.call(WS_CLOSURE_REASONS, code) ? WS_CLOSURE_REASONS[code] : `Unknown reason: ${code}`;
}

const SYMBOL_ACTIVITY = Symbol('activity');
const SYMBOL_STATE = Symbol('state');
const DEFAULT_CLIENT_NAME = 'not-ws link';
const DEFAULT_SERVER_NAME = 'not-ws server';

const ERR_MSG = {
	REQUEST_TIMEOUT: 'Request timeout',
	MSG_ID_IS_NOT_VALID: 'Message ID is not valid uuidv4',
	MSG_CREDENTIALS_IS_NOT_VALID: 'Message Credentials is not valid!',
	MSG_TYPE_IS_NOT_VALID:  'Message Type is not valid!',
	MSG_NAME_IS_NOT_VALID:  'Message Name is not valid!',
};

const PING_TIMEOUT = 5000;
const HEARTBEAT_INTERVAL = 5000;
const CLIENT_RECONNECT_TIMEOUT = 5000;
const CLIENT_RECONNECT_TIMEOUT_LONG = 30000;
const TIME_OFFSET_REQUEST_INTERVAL = 5 * 60 * 1000;
const CLIENT_AUTO_RECONNECT = true;

const TOKEN_TTL = 1800;
const TOKEN_RENEW_TTL = 300;

const MSG_TYPE = {
	REQUEST:     'request',
	RESPONSE:   'response',
	EVENT:       'event',
	COMMAND:     'command',
};

const DEV_ENV = 'development';



let [, hash] = location.hash.split('#');
const ENV_TYPE = hash;

export default {
	ENV_TYPE,
	DEV_ENV,
	STATE,
	STATE_NAME,
	ACTIVITY,
	ACTIVITY_NAME,
	WS_CLOSURE_REASONS,
	mapWsCloseCodes,
	HEARTBEAT_INTERVAL,
	SYMBOL_ACTIVITY,
	SYMBOL_STATE,
	DEFAULT_SERVER_NAME,
	DEFAULT_CLIENT_NAME,
	ERR_MSG,
	PING_TIMEOUT,
	CLIENT_RECONNECT_TIMEOUT,
	CLIENT_RECONNECT_TIMEOUT_LONG,
	CLIENT_AUTO_RECONNECT,
	TIME_OFFSET_REQUEST_INTERVAL,
	MSG_TYPE,
	TOKEN_TTL,
	TOKEN_RENEW_TTL,
};


