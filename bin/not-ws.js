#!/usr/bin/env node

/*
	not-error builder
	rebuilds scripts with custom vars (env,key,url)
  not-error.js  --key '2398v90128y5018'  --url-browser 'https://reporter.host/api/error'  --url-node 'https://reporter.host/api/error' --out 'dir/to/put/files'
  options
    key - product key
    url_node - link to error-collector server for server side
		url_browser - link to error-collector server for browser side
		out	-	dir to put files if not specified will be put in module_dir/build/
*/

const argv = require('yargs').argv,
	fs = require('fs'),
	path = require('path'),
	ejs = require('ejs');

let defOpts = {
	'out-node': 					path.join(__dirname, '../src/node'),
	'out-browser': 				path.join(__dirname, '../src/browser'),
};

if(argv['out-node'] === true){
	delete argv['out-node'];
}

if(argv['out-browser'] === true){
	delete argv['out-browser'];
}

let opts = {
	'out-browser': 					(argv['out-browser'] || defOpts['out-browser']),
	'out-node': 					(argv['out-node'] || defOpts['out-node'])
};
/**
*	SERVER - notWSServer class
*	SERVER_CLIENT - notWSServerClient class
*	CLIENT - notWSClient class
*/
const TEMPLATE_SERVER = path.join(__dirname, '../tmpl/server.ejs');
const OUTPUT_NODE_SERVER = path.join(opts['out-node'], 'server.js');

const TEMPLATE_SERVER_CLIENT = path.join(__dirname, '../tmpl/server.client.ejs');
const OUTPUT_NODE_SERVER_CLIENT = path.join(opts['out-node'], 'server.client.js');

const TEMPLATE_CLIENT = path.join(__dirname, '../tmpl/client.ejs');
const OUTPUT_NODE_CLIENT = path.join(opts['out-node'], 'client.js');
const OUTPUT_BROWSER_CLIENT = path.join(opts['out-browser'], 'client.js');

const TEMPLATE_LOG = path.join(__dirname, '../tmpl/log.ejs');
const OUTPUT_NODE_LOG = path.join(opts['out-node'], 'log.js');
const OUTPUT_BROWSER_LOG = path.join(opts['out-browser'], 'log.js');

const TEMPLATE_CONST = path.join(__dirname, '../tmpl/const.ejs');
const OUTPUT_NODE_CONST = path.join(opts['out-node'], 'const.js');
const OUTPUT_BROWSER_CONST = path.join(opts['out-browser'], 'const.js');

const TEMPLATE_MESSENGER = path.join(__dirname, '../tmpl/messenger.ejs');
const OUTPUT_NODE_MESSENGER = path.join(opts['out-node'], 'messenger.js');
const OUTPUT_BROWSER_MESSENGER = path.join(opts['out-browser'], 'messenger.js');

const TEMPLATE_ROUTER = path.join(__dirname, '../tmpl/router.ejs');
const OUTPUT_NODE_ROUTER = path.join(opts['out-node'], 'router.js');
const OUTPUT_BROWSER_ROUTER = path.join(opts['out-browser'], 'router.js');

const TEMPLATE_UUIDV4 = path.join(__dirname, '../tmpl/uuidv4.ejs');
const OUTPUT_BROWSER_UUIDV4 = path.join(opts['out-browser'], 'uuidv4.js');

function renderScript(input, options, dest){
	return new Promise((resolve ,reject)=>{
		let js = ejs.renderFile(input, options, (err, res)=>{
			if(err){
				reject(err);
			}else{
				fs.writeFile(dest, res, (err) => {
					if (err) {reject(err);}
					else {resolve();}
				});
			}
		});
	});
}

let tasks = [
	renderScript(
		TEMPLATE_SERVER,
		{
			env: 'node'
		},
		OUTPUT_NODE_SERVER
	),
	renderScript(
		TEMPLATE_SERVER_CLIENT,
		{
			env: 'node'
		},
		OUTPUT_NODE_SERVER_CLIENT
	),
	renderScript(
		TEMPLATE_CLIENT,
		{
			env: 'node'
		},
		OUTPUT_NODE_CLIENT
	),
	renderScript(
		TEMPLATE_CLIENT,
		{
			env: 'browser'
		},
		OUTPUT_BROWSER_CLIENT
	),
	renderScript(
		TEMPLATE_LOG,
		{
			env: 'node'
		},
		OUTPUT_NODE_LOG
	),
	renderScript(
		TEMPLATE_LOG,
		{
			env: 'browser'
		},
		OUTPUT_BROWSER_LOG
	),
	renderScript(
		TEMPLATE_CONST,
		{
			env: 'node'
		},
		OUTPUT_NODE_CONST
	),
	renderScript(
		TEMPLATE_CONST,
		{
			env: 'browser'
		},
		OUTPUT_BROWSER_CONST
	),
	renderScript(
		TEMPLATE_MESSENGER,
		{
			env: 'node'
		},
		OUTPUT_NODE_MESSENGER
	),
	renderScript(
		TEMPLATE_MESSENGER,
		{
			env: 'browser'
		},
		OUTPUT_BROWSER_MESSENGER
	),
	renderScript(
		TEMPLATE_ROUTER,
		{
			env: 'node'
		},
		OUTPUT_NODE_ROUTER
	),
	renderScript(
		TEMPLATE_ROUTER,
		{
			env: 'browser'
		},
		OUTPUT_BROWSER_ROUTER
	),
	renderScript(
		TEMPLATE_UUIDV4,
		{
			env: 'browser'
		},
		OUTPUT_BROWSER_UUIDV4
	)
];

Promise.all(tasks)
	.then(()=>{
		console.log('not-ws rebuilded!');
	})
	.catch((e)=>{
		console.error(e);
		process.exit(1);
	});
