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

const argv = require("yargs").argv,
    fs = require("fs"),
    path = require("path"),
    ejs = require("ejs");

let defOpts = {
    "out-node": path.join(__dirname, "../src/node"),
    "out-browser": path.join(__dirname, "../src/browser"),
};

if (argv["out-node"] === true) {
    delete argv["out-node"];
}

if (argv["out-browser"] === true) {
    delete argv["out-browser"];
}

let opts = {
    "out-browser": argv["out-browser"] || defOpts["out-browser"],
    "out-node": argv["out-node"] || defOpts["out-node"],
};
/**
 *	SERVER - notWSServer class
 *	SERVER_CLIENT - notWSServerClient class
 *	CLIENT - notWSClient class
 */

const files = [
    {
        tmpl: path.join(__dirname, "../tmpl/server.ejs"),
        node: path.join(opts["out-node"], "server.js"),
    },
    {
        tmpl: path.join(__dirname, "../tmpl/client.ejs"),
        node: path.join(opts["out-node"], "client.mjs"),
        browser: path.join(opts["out-browser"], "client.js"),
    },
    /*	{
		tmpl: path.join(__dirname, '../tmpl/server.client.ejs'),
		node: path.join(opts['out-node'], 'server.client.js')
	},
	{
		tmpl: path.join(__dirname, '../tmpl/client.ejs'),
		node: path.join(opts['out-node'], 'client.js'),
		browser: path.join(opts['out-browser'], 'client.js')
	},*/
    {
        tmpl: path.join(__dirname, "../tmpl/func.ejs"),
        node: path.join(opts["out-node"], "func.js"),
        browser: path.join(opts["out-browser"], "func.mjs"),
    },
    {
        tmpl: path.join(__dirname, "../tmpl/const.ejs"),
        node: path.join(opts["out-node"], "const.js"),
        browser: path.join(opts["out-browser"], "const.mjs"),
    },
    {
        tmpl: path.join(__dirname, "../tmpl/messenger.ejs"),
        node: path.join(opts["out-node"], "messenger.js"),
        browser: path.join(opts["out-browser"], "messenger.mjs"),
    },
    {
        tmpl: path.join(__dirname, "../tmpl/router.ejs"),
        node: path.join(opts["out-node"], "router.js"),
        browser: path.join(opts["out-browser"], "router.mjs"),
    },
    {
        tmpl: path.join(__dirname, "../tmpl/connection.ejs"),
        node: path.join(opts["out-node"], "connection.js"),
        browser: path.join(opts["out-browser"], "connection.mjs"),
    },
];

function renderScript(input, options, dest) {
    return new Promise((resolve, reject) => {
        ejs.renderFile(input, options, (err, res) => {
            if (err) {
                reject(err);
            } else {
                fs.writeFile(dest, res, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
}

let tasks = [];
const outs = ["node", "browser"];

function createTask(file, type) {
    if (Object.prototype.hasOwnProperty.call(file, type)) {
        tasks.push(renderScript(file.tmpl, { env: type }, file[type]));
    }
}

files.forEach((file) => {
    outs.forEach((output) => createTask(file, output));
});

Promise.all(tasks)
    .then(() => {
        console.log("not-ws rebuilded!");
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
