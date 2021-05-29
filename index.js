const CONST = require('./src/node/const');
const Func = require('./src/node/func');

const notWSServer = require('./src/node/server');
const notWSRouter = require('./src/node/router');
const notWSMessenger = require('./src/node/messenger');
const notWSClient = require('./src/node/client');
const initialize = require('./src/node/initialize');

const path = require('path');

module.exports = {
	name: 'not-ws',
	paths: {
		controllers:	path.join(__dirname, 'src', 'controllers')
	},
	initialize,
	notWSServer,
	notWSRouter,
	notWSMessenger,
	notWSClient,
	CONST,
	Func
};
