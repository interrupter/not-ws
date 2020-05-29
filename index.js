const CONST = require('./src/node/const');
const LOG = require('./src/node/log');

const notWSServer = require('./src/node/server');
const notWSServerClient = require('./src/node/server.client');
const notWSRouter = require('./src/node/router');
const notWSMessenger = require('./src/node/messenger');
const notWSClient = require('./src/node/client');

const path = require('path');

module.exports = {
	name: 'not-ws',
	paths: {
		controllers:	path.join(__dirname, 'src', 'controllers')
	},
	notWSServer,
	notWSServerClient,
	notWSRouter,
	notWSMessenger,
	notWSClient,
	CONST,
	LOG
};
