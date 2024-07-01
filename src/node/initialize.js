const merge = require("deepmerge");

const log = require("not-log")(module, "not-ws:initializer");
const config = require("not-config").createReader();

const Func = require("./func");
const notWSServer = require("./server");
const notWSClient = require("./client");
const notPath = require("not-path");

const DEFAULT_WS_SERVER_NAME = "main";

class initializer {
    //collected from *.ws.js files in various modules
    static ROUTES = { clients: {}, servers: {} };
    //from ./ws folder
    static OPTIONS = {};
    //from /config
    static CONFIG = {};
    //merged vesion of configs
    static FINAL_CONFIG = {};

    static initWSEnvironments() {
        if (config.get("wsPath")) {
            try {
                this.OPTIONS = require(config.get("wsPath"));
            } catch (e) {
                log.error("wsPath not valid");
            }
        } else {
            log.log("wsPath (derivating from path:ws) to ws options not set");
        }

        if (config.get("modules.ws")) {
            this.CONFIG = config.get("modules.ws");
        }
        //final config
        this.FINAL_CONFIG = merge(this.OPTIONS, this.CONFIG);
    }

    static run(notApp) {
        this.initWSEnvironments();
        //searching for *.ws.js files in routes of modules
        notApp.forEachMod((modName, mod) => {
            this.collectWSEndPoints(mod);
        });
        //expose Clients and Servers
        this.exposeWS(notApp);
    }

    static collectWSEndPoints(mod) {
        if (mod.getEndPoints) {
            let eps = mod.getEndPoints();
            if (eps) {
                for (let collectionType in eps) {
                    //{servers, clients}
                    for (let collectionName in eps[collectionType]) {
                        const collection = eps[collectionType][collectionName];
                        for (let messageType in collection) {
                            for (let messageName in collection[messageType]) {
                                this.addWSAction(
                                    collectionType,
                                    collectionName,
                                    messageType,
                                    messageName,
                                    collection[messageType][messageName]
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    static getWSEndPointServerName(endPoint) {
        return Func.ObjHas(endPoint, "serverName")
            ? endPoint.serverName
            : DEFAULT_WS_SERVER_NAME;
    }

    static addWSAction(
        collectionType,
        collectionName,
        messageType,
        messageName,
        endPoint
    ) {
        notPath.setValueByPath(
            this.ROUTES,
            [collectionType, collectionName, messageType, messageName].join(
                "."
            ), //servers.main.request.modelName//actionName
            endPoint
        );
    }

    static hasWSEndPoints(owner) {
        return Object.keys(owner).length;
    }

    static exposeWS(notApp) {
        //include only in case
        try {
            if (typeof this.FINAL_CONFIG !== "undefined") {
                if (this.hasWSEndPoints(this.ROUTES.servers)) {
                    if (Func.ObjHas(this.FINAL_CONFIG, "servers")) {
                        for (let serverName in this.FINAL_CONFIG.servers) {
                            this.initWSServer(
                                serverName,
                                this.FINAL_CONFIG.servers[serverName],
                                notApp
                            );
                        }
                    }
                }
                if (this.hasWSEndPoints(this.ROUTES.clients)) {
                    if (Func.ObjHas(this.FINAL_CONFIG, "clients")) {
                        for (let clientName in this.FINAL_CONFIG.clients) {
                            this.initWSClient(
                                clientName,
                                this.FINAL_CONFIG.clients[clientName],
                                notApp
                            );
                        }
                    }
                }
            } else {
                log.log("WS options is not defined");
            }
        } catch (e) {
            log.error(e);
        }
    }

    static initWSServer(serverName = DEFAULT_WS_SERVER_NAME, opts, notApp) {
        log.info(`Starting WSServer(${serverName})...`);
        try {
            if (!opts) {
                throw new Error(`No WS server(${serverName}) options`);
            }
            const WSServer = new notWSServer({
                ...opts,
                routes: this.getWSRoutes(serverName, "servers"),
            });
            notApp.addWSServer(serverName, WSServer);
            WSServer.start();
            log.info(
                `WS server(${serverName}) listening on port ` +
                    opts.connection.port
            );
        } catch (e) {
            log.error(`WS server(${serverName}) startup failure`);
            log.error(e);
        }
    }

    static initWSClient(clientName, opts, notApp) {
        log.info(`Starting WSClient(${clientName})...`);
        try {
            if (!opts) {
                throw new Error(`No WS client(${clientName}) options`);
            }
            const WSClient = new notWSClient(
                this.getWSClientOptions(clientName, opts)
            );
            notApp.addWSClient(clientName, WSClient);
            log.info(
                `WS client(${clientName}) connected to ` +
                    opts.connection.host +
                    ":" +
                    opts.connection.port
            );
        } catch (e) {
            log.error(`WS client(${clientName}) startup failure`);
            log.error(e);
        }
    }

    static getWSClientOptions(name, opts) {
        let res = {
            name,
        };
        if (Func.ObjHas(opts, "router")) {
            let routes = this.getWSRoutes(name, "clients");
            if (Func.ObjHas(opts.router, "routes")) {
                opts.router.routes = merge(opts.router.routes, routes);
            } else {
                opts.router.routes = routes;
            }
        }
        return Object.assign(res, opts);
    }

    static getWSRoutes(name, whose) {
        if (Func.ObjHas(this.ROUTES[whose], name)) {
            return this.ROUTES[whose][name];
        } else {
            return {};
        }
    }
}

function initWS(app) {
    log.log("initialize WS in notApp/notDomain");
    initializer.run(app);
}

module.exports = initWS;
