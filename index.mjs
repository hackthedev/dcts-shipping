import {syncDiscoveredHosts} from "./modules/functions/discovery.mjs";

console.clear();
import express from 'express';

export const app = express();

import https from 'https';
import http from 'http';
import fs from 'fs';
import fse from 'fs-extra'; // Use fs-extra for easy directory copying
import path from 'path';
import mysql from 'mysql2/promise';
import sanitizeHtml from 'sanitize-html';
import bcrypt from 'bcrypt';
import crypto from 'crypto';


// Depending on the SSL setting, this will switch.
export let server; // = http.createServer(app);
import {Server} from 'socket.io';

import nodefetch from "node-fetch";
const { FormData, fileFrom } = nodefetch;
const fetch = nodefetch.default;

import getSize from 'get-folder-size';

import {fileTypeFromBuffer} from 'file-type';
import XMLHttpRequest from 'xhr2';

import colors from 'colors';
import xssFilters from 'xss-filters';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);



// improved now
export {
    https,
    Server,
    xssFilters,
    http,
    fs,
    fse,
    path,
    mysql,
    sanitizeHtml,
    bcrypt,
    FormData,
    fileFrom,
    fetch,
    getSize,
    fileTypeFromBuffer,
    XMLHttpRequest,
    colors,
    crypto
};

import Logger from "./modules/functions/logger.mjs";

export let checkedMediaCacheUrls = {};
export let usersocket = []
export let loginAttempts = [];
export let userOldRoom = {}
export let useridFromSocket = [];
export let peopleInVC = {}
export let showedOfflineMessage = [];

export let typingMembers = [];
export let typingMembersTimeout = [];

export let ratelimit = [];
export let socketToIP = [];

export let allowLogging = false;
export let debugmode = false;
export let versionCode = 721;

// dSync Libs
import dSyncAuth from '@hackthedev/dsync-auth';
//import dSyncAuth from '../../../dSyncAuth/index.mjs';
import { dSyncSign } from "@hackthedev/dsync-sign";
//import { dSyncSign } from "../dSyncSign/index.mjs"
import dSync from "@hackthedev/dsync";

export let syncer = new dSync("dcts", app)
export const signer = new dSyncSign();
export const auther = new dSyncAuth(app, signer, async function(data) {
    if(data.valid === true){
        changeKeyVerification(data.publicKey, data.valid);
    }
});


// config file saving
let fileHandle = null; // File handle for the config file
let savedState = null; // In-memory config state
let writeQueue = Promise.resolve(); // Queue for write operations
let isClosing = false; // Flag to prevent multiple close attempts

// handle startup args
let nodeArgs = process.argv;

// remove the first few arguments because fuck that lol
nodeArgs.shift()
nodeArgs.shift()

if (nodeArgs.includes("--debug")) {
    // enable debug logging
    Logger.logDebug = true;
}


// check if needed directories are setup
checkServerDirectories()

// check if config file exists
checkFile("./plugins/settings.json", true, "{}")
checkConfigFile()
/*
    Holy Server config file.
    needs to be above the imports else serverconfig will be undefined
 */
export var serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));
initConfig("./config.json");

checkConfigAdditions();

// Import functions etc from files (= better organisation)
// Special thanks to Kannustin <3

// Main functions for chat
import {
    checkVersionUpdate,
    checkConfigAdditions,
    handleTerminalCommands,
    validateMemberId,
    checkRateLimit,
    limitString,
    generateId,
    escapeHtml,
    addMinutesToDate,
    searchTenor,
    sendMessageToUser,
    tenorCallback_search,
    httpGetAsync,
    sanitizeInput,
    copyObject,
    sanitizeFilename,
    checkMemberBan,
    hashPassword,
    getCastingMemberObject,
    findAndVerifyUser,
    checkMemberMute,
    moveJson,
    removeFromArray,
    toSeconds,
    setLongInterval
} from "./modules/functions/main.mjs"

// IO related functions
import {
    checkConfigFile, checkFile,
    checkServerDirectories,
    consolas,
    getSavedChatMessage,
    saveChatMessage
} from "./modules/functions/io.mjs"

import {checkSSL} from "./modules/functions/http.mjs"

// Chat functions
import {
    unbanIp,
    formatDateTime,
    findInJson, changeKeyVerification
} from "./modules/functions/chat/main.mjs";

import {
    checkAndCreateTable,
    queryDatabase,
} from "./modules/functions/mysql/mysql.mjs";

import {fileURLToPath, pathToFileURL} from "url";
import {offload} from './modules/functions/offload.mjs';
import {registerTemplateMiddleware} from './modules/functions/template.mjs';
import {listenToPow, powVerifiedUsers, sendPow, waitForPowSolution} from './modules/sockets/pow.mjs';
import {Addon} from "./modules/functions/addon.mjs";


/*
    Files for the plugin system
*/
// Directories where plugin files are located
const pluginsDir = path.join(__dirname, 'plugins');
const publicPluginsDir = path.join(__dirname, 'public', 'plugins');

// Function to dynamically load and register socket event handlers
const registerPluginSocketEvents = async (socket, pluginSocketsDir) => {
    const files = fs.readdirSync(pluginSocketsDir);
    for (const file of files) {
        if (file.endsWith('.mjs')) {
            const filePath = path.join(pluginSocketsDir, file);
            const fileUrl = pathToFileURL(filePath).href;
            const {default: handler} = await import(fileUrl);

            try{
                handler(socket);
            }
            catch(e){
                Logger.error(fileUrl)
                Logger.error(e)
            }
        }
    }
};

// Function to dynamically load and execute plugin functions
const loadAndExecutePluginFunctions = async (pluginFunctionsDir) => {
    const files = fs.readdirSync(pluginFunctionsDir);
    for (const file of files) {
        if (file.endsWith('.mjs')) {
            const filePath = path.join(pluginFunctionsDir, file);
            const fileUrl = pathToFileURL(filePath).href;
            const module = await import(fileUrl);

            // Iterate over all exports in the module
            for (const [name, func] of Object.entries(module)) {
                // Check if the export is a function and its name includes 'onLoad'
                if (typeof func === 'function' && name.includes('onLoad')) {
                    func();
                }
            }
        }
    }
};

// Function to move web folders to the public directory
const moveWebFolders = async (pluginWebDir, pluginName) => {
    const destinationDir = path.join(publicPluginsDir, pluginName);
    await fse.ensureDir(destinationDir); // Ensure the destination directory exists
    await fse.copy(pluginWebDir, destinationDir, {overwrite: true});
};

// Iterate over each plugin and process it
const processPlugins = async () => {
    const pluginDirs = fs.readdirSync(pluginsDir);

    for (const pluginName of pluginDirs) {

        // ignore files
        if(fs.lstatSync(path.join(pluginsDir, pluginName)).isFile() === true) continue;

        const pluginDir = path.join(pluginsDir, pluginName);
        const pluginFunctionsDir = path.join(pluginDir, 'functions');
        const pluginSocketsDir = path.join(pluginDir, 'sockets');
        const pluginWebDir = path.join(pluginDir, 'web');

        let pluginConfigPath = path.join(pluginDir, 'config.json');
        let pluginConfig = null;

        if(fs.existsSync(pluginConfigPath)) {
            pluginConfig = JSON.parse(fs.readFileSync(pluginConfigPath));
        }

        // some plugin meta
        let pluginTitle = pluginConfig?.title || false;
        let pluginEnabled = pluginConfig?.enabled || false;
        let pluginAuthor = pluginConfig?.author || "";
        let pluginVersion = pluginConfig?.version || 0;

        // skip disabled plugin
        if(pluginEnabled !== true) {
            Logger.warn(`Skipped loading plugin ${pluginTitle} (${pluginName}) because its not enabled`)
            continue;
        }


        // Load and execute plugin functions
        if (fs.existsSync(pluginFunctionsDir)) {
            await loadAndExecutePluginFunctions(pluginFunctionsDir);
        }

        // Register socket events
        if (fs.existsSync(pluginSocketsDir)) {
            io.on('connection', (socket) => {
                registerPluginSocketEvents(socket, pluginSocketsDir).catch(err => console.error(err));
            });
        }

        // Move web folders to the public directory
        if (fs.existsSync(pluginWebDir)) {
            await moveWebFolders(pluginWebDir, pluginName);
        }

        consolas(colors.yellow(`Loaded plugin ${colors.white(pluginName)}`))
    }
};

// Create a connection pool if sql is enabled
export let pool = null;
if (serverconfig.serverinfo.sql.enabled == true) {

    pool = mysql.createPool({
        host: serverconfig.serverinfo.sql.host,
        user: serverconfig.serverinfo.sql.username,
        password: serverconfig.serverinfo.sql.password,
        database: serverconfig.serverinfo.sql.database,
        waitForConnections: true,
        connectionLimit: serverconfig.serverinfo.sql.connectionLimit,
        queueLimit: 0
    });

    // SQL Database Structure needed
    // it will create everything if missing (except database)
    // +1 convenience
    const tables = [
        {
            name: 'messages',
            columns: [
                {name: 'authorId', type: 'varchar(100) NOT NULL'},
                {name: 'messageId', type: 'varchar(100) NOT NULL'},
                {name: 'room', type: 'text NOT NULL'},
                {name: 'message', type: 'longtext NOT NULL'}
            ],
            keys: [
                {name: 'UNIQUE KEY', type: 'messageId (messageId)'}
            ]
        },
        {
            name: 'message_logs',
            columns: [
                {name: 'id', type: 'int(100) NOT NULL'},
                {name: 'authorId', type: 'varchar(100) NOT NULL'},
                {name: 'messageId', type: 'varchar(100) NOT NULL'},
                {name: 'room', type: 'text NOT NULL'},
                {name: 'message', type: 'longtext NOT NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'},
                {name: 'UNIQUE KEY', type: 'id (id)'},
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55'
        },
        {
            name: 'url_cache',
            columns: [
                {name: 'id', type: 'int(11) NOT NULL'},
                {name: 'url', type: 'longtext NOT NULL'},
                {name: 'media_type', type: 'text NOT NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'},
                {name: 'UNIQUE KEY', type: 'id (id)'},
                {name: 'UNIQUE KEY', type: 'url (url) USING HASH'}
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55'
        },
        {
            name: "reports",
            columns: [
                {"name": "id", "type": "int(11) NOT NULL"},
                {"name": "reportCreator", "type": "longtext NOT NULL"},
                {"name": "reportedUser", "type": "longtext NOT NULL"},
                {"name": "reportType", "type": "text NOT NULL"},
                {"name": "reportData", "type": "longtext NULL"},
                {"name": "reportNotes", "type": "longtext NULL"},
                {"name": "reportStatus", "type": "varchar(100) NOT NULL DEFAULT 'pending'"}
            ],
            keys: [
                {"name": "PRIMARY KEY", "type": "(id)"}
            ],
            autoIncrement: "id int(11) NOT NULL AUTO_INCREMENT"
        }, // home section stuff
        {
            name: 'dms_threads',
            columns: [
                {name: 'threadId', type: 'varchar(100) NOT NULL'},
                {name: 'type', type: 'varchar(50) NOT NULL'},
                {name: 'title', type: 'text NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(threadId)'}
            ]
        },
        {
            name: 'dms_participants',
            columns: [
                {name: 'threadId', type: 'varchar(100) NOT NULL'},
                {name: 'memberId', type: 'varchar(100) NOT NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(threadId, memberId)'},
                {name: 'KEY', type: 'memberId (memberId)'} // <— neu
            ]
        },
        {
            name: 'dms_message_logs',
            columns: [
                {name: 'id', type: 'int(11) NOT NULL'},
                {name: 'messageId', type: 'varchar(100) NOT NULL'},
                {name: 'threadId', type: 'varchar(100) NOT NULL'},
                {name: 'authorId', type: 'varchar(100) NOT NULL'},
                {name: 'message', type: 'longtext NOT NULL'},
                {name: 'loggedAt', type: 'datetime NOT NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'},
                {name: 'UNIQUE KEY', type: 'id (id)'}
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT'
        },
        {
            name: 'dms_messages',
            columns: [
                {name: 'messageId', type: 'varchar(100) NOT NULL'},
                {name: 'threadId', type: 'varchar(100) NOT NULL'},
                {name: 'authorId', type: 'varchar(100) NOT NULL'},
                {name: 'message', type: 'longtext NOT NULL'},
                {name: 'createdAt', type: 'datetime NOT NULL'},

                {name: 'supportIdentity', type: "varchar(20) NOT NULL DEFAULT 'self'"}, // 'self' | 'support_tagged' | 'support_anon'
                {name: 'displayName', type: 'text NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(messageId)'},
                {name: 'KEY', type: 'threadId (threadId)'}
            ]
        },
        {
            name: 'tickets',
            columns: [
                {name: 'threadId', type: 'varchar(100) NOT NULL'},
                {name: 'creatorId', type: 'varchar(100) NOT NULL'},
                {name: 'status', type: "varchar(20) NOT NULL DEFAULT 'open'"},
                {name: 'createdAt', type: 'datetime NOT NULL DEFAULT CURRENT_TIMESTAMP'},
                {name: 'updatedAt', type: 'datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(threadId)'},
                {name: 'KEY', type: 'status (status)'},
                {name: 'KEY', type: 'creatorId (creatorId)'}
            ]
        },

        {
            name: 'posts',
            columns: [
                {name: 'id', type: 'int(11) NOT NULL'},
                {name: 'title', type: 'text NOT NULL'},
                {name: 'body', type: 'longtext NOT NULL'},
                {name: 'authorId', type: 'varchar(100) NOT NULL'},
                {name: 'tag', type: 'varchar(100) NULL'},
                {name: 'pinned', type: 'tinyint(1) NOT NULL DEFAULT 0'},
                {name: 'createdAt', type: 'datetime NOT NULL DEFAULT CURRENT_TIMESTAMP'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'}
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT'
        },
        {
            name: 'news',
            columns: [
                {name: 'id', type: 'int(11) NOT NULL'},
                {name: 'title', type: 'text NOT NULL'},
                {name: 'body', type: 'longtext NOT NULL'},
                {name: 'authorId', type: 'varchar(100) NOT NULL'},
                {name: 'pinned', type: 'tinyint(1) NOT NULL DEFAULT 0'},
                {name: 'createdAt', type: 'datetime NOT NULL DEFAULT CURRENT_TIMESTAMP'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'}
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT'
        },
        {
            name: 'help',
            columns: [
                {name: 'id', type: 'int(11) NOT NULL'},
                {name: 'slug', type: 'varchar(120) NOT NULL'},
                {name: 'title', type: 'text NOT NULL'},
                {name: 'body', type: 'longtext NOT NULL'},
                {name: 'authorId', type: 'varchar(100) NOT NULL'},
                {name: 'pinned', type: 'tinyint(1) NOT NULL DEFAULT 0'},
                {name: 'createdAt', type: 'datetime NOT NULL DEFAULT CURRENT_TIMESTAMP'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'},
                {name: 'UNIQUE KEY', type: 'slug (slug)'}
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT'
        },
        {
            name: 'dms_reads',
            columns: [
                {name: 'threadId', type: 'varchar(100) NOT NULL'},
                {name: 'memberId', type: 'varchar(100) NOT NULL'},
                {name: 'last_read_at', type: 'text NOT NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(threadId, memberId)'},
                {name: 'KEY', type: 'threadId (threadId)'},
                {name: 'KEY', type: 'memberId (memberId)'}
            ]
        },
        {
            name: 'content_reads',
            columns: [
                {name: 'id', type: 'bigint NOT NULL'},
                {name: 'contentType', type: 'varchar(32) NOT NULL'},
                {name: 'contentId', type: 'bigint NOT NULL'},
                {name: 'userId', type: 'varchar(128) NOT NULL'},
                {name: 'readAt', type: 'datetime NULL'},
                {name: 'createdAt', type: 'datetime NOT NULL DEFAULT CURRENT_TIMESTAMP'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'},
                {name: 'UNIQUE KEY uq_content_user', type: '(contentType, contentId, userId)'},
                {name: 'INDEX idx_user_unread', type: '(userId, readAt)'},
                {name: 'INDEX idx_content', type: '(contentType, contentId)'}
            ],
            autoIncrement: 'id BIGINT NOT NULL AUTO_INCREMENT'
        },
        {
            name: 'network_servers',
            columns: [
                {name: 'id', type: 'int(11) NOT NULL'},
                {name: 'address', type: 'varchar(255) NOT NULL'},
                {name: 'status', type: 'varchar(255) NOT NULL'},
                {name: 'data', type: 'longtext'},
                {name: 'last_sync', type: 'datetime NULL'}
            ],
            keys: [
                {name: 'PRIMARY KEY', type: '(id)'},
                {name: 'UNIQUE KEY', type: 'address (address)'}
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT'
        }

    ];

    const dbTasks = [
        {
            name: "Purge Old Message Logs",
            enabled: serverconfig.serverinfo.reports.enabled,
            interval: toSeconds("12 hours"),
            query: `
                DELETE ml
                FROM message_logs ml
                LEFT JOIN messages m
                  ON m.messageId = ml.messageId
                LEFT JOIN reports r
                  ON JSON_UNQUOTE(JSON_EXTRACT(r.reportData, '$.messageId')) = ml.messageId
                WHERE m.messageId IS NULL
                  AND r.id IS NULL;
            `
        }
    ];

    async function runDbTask(task) {
        if (task.enabled !== true) return;

        try {
            Logger.log("DB TASK", `[${task.name}] starting...`, Logger.colors.fgCyan);
            await queryDatabase(task?.query);
            Logger.log("DB TASK", `[${task.name}] done.`, Logger.colors.fgGreen);
        } catch (err) {
            Logger.log("DB TASK", `[${task.name}] error:`, Logger.colors.fgRed);
            Logger.log("DB TASK", err, Logger.colors.fgRed);
        }
    }

    function scheduleDbTasks(tasks) {
        for (const task of tasks) {
            const ms = task.interval * 1000; // second to ms
            setLongInterval(() => runDbTask(task), ms);
        }
    }

    (async () => {
        for (const table of tables) {
            await checkAndCreateTable(table);
        }

        // after the tables exist etc we will fire up our awesome new job(s)
        scheduleDbTasks(dbTasks);
    })();
}


Logger.success(`Welcome to DCTS`);
Logger.success(`Checkout our subreddit at https://www.reddit.com/r/dcts/`);
Logger.success(`The Official Github Repo: https://github.com/hackthedev/dcts-shipping/`);

Logger.space();
Logger.info(`♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥`, Logger.colors.blink + Logger.colors.bright + Logger.colors.fgMagenta);
Logger.info(`Support the project » https://ko-fi.com/shydevil`, Logger.colors.blink + Logger.colors.bright + Logger.colors.fgMagenta);
Logger.info(`♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥`, Logger.colors.blink + Logger.colors.bright + Logger.colors.fgMagenta);
Logger.space();
Logger.space();
Logger.info(`You're running version ` + versionCode);

// Check if new Version exists
var checkVer = await checkVersionUpdate()
if (checkVer != null) {
    Logger.space();
    Logger.info(`New version ${checkVer} is available!`, Logger.colors.blink + Logger.colors.fgCyan + Logger.colors.bright);
    Logger.info(`Download » https://github.com/hackthedev/dcts-shipping/releases`, Logger.colors.blink + Logger.colors.fgCyan + Logger.colors.bright);
    Logger.space();
}

// Check if SSL is used or not
checkSSL();

// Catch uncaught errors
process.on('uncaughtException', function (err) {

    // Handle the error safely
    Logger.error("UNEXPECTED ERROR");
    Logger.error(err.message);
    Logger.error("Details: ");
    Logger.error(err.stack);

    // Log Error To File
    var date = new Date().toLocaleString();
    date = date.replace(", ", "_");
    date = date.replaceAll(":", "-");
    date = date.replaceAll(".", "-");
})


// Ability to enter "commands" into the terminal window
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (text) {
    var data = text.trim();

    var args = data.split(" ");
    var command = args[0];

    handleTerminalCommands(command, args);
});


// Setup socket.io
export const io = new Server(server, {
    maxHttpBufferSize: 1e8,
    secure: true,
    pingInterval: 25000,
    pingTimeout: 60000,
});

// Start the app server
var port = serverconfig.serverinfo.port;
server.listen(port, function () {

    Logger.info('Server is running on port ' + port);

    if (serverconfig.serverinfo.setup == 0) {

        var adminToken = generateId(64);
        serverconfig.serverinfo.setup = 1;
        serverconfig.serverroles["1111"].token.push(adminToken);
        saveConfig(serverconfig);


        Logger.info(`To obtain the admin role in your server, copy the following token.`);
        Logger.info(`You can use it if prompted or if you right click on the server icon and press "Redeem Key"`);

        Logger.info(`Server Admin Token:`);
        Logger.info(adminToken);
    } else if (serverconfig.serverroles["1111"].token.length > 0) {
        Logger.info(`To obtain the admin role in your server, copy the following token.`);
        Logger.info(`You can use it if prompted or if you right click on the server icon and press "Redeem Key"`);

        Logger.info(colors.cyan(`Available Server Admin Token(s):`));

        serverconfig.serverroles["1111"].token.forEach(token => {
            if (token) Logger.info(token)
        })
        allowLogging = true;
    }

    syncDiscoveredHosts(true)
});

app.use(express.urlencoded({extended: true})); // Parses URL-encoded data
app.use(express.json()); // Parses JSON bodies

registerTemplateMiddleware(app, __dirname, fs, path, serverconfig);

app.use(express.static(__dirname + '/public'));


// Process plugins at server start
processPlugins().catch(err => console.error(err));

/* Modular Socket events */
const socketHandlers = [];
const activeSockets = new Map(); // Track socket handlers by socket ID

// **Load Handlers Once at Startup**
const loadSocketHandlers = async (mainHandlersDir, io) => {
    const fileList = [];

    const scanDir = (dir) => {
        const files = fs.readdirSync(dir, {withFileTypes: true});
        for (const file of files) {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
                scanDir(filePath);
            } else if (file.name.endsWith('.mjs')) {
                fileList.push(filePath);
            }
        }
    };

    scanDir(mainHandlersDir);

    for (const filePath of fileList) {
        const fileUrl = pathToFileURL(filePath).href;
        try {
            const {default: handlerFactory} = await import(fileUrl);

            // NEU: handlerFactory(io) erzeugt den eigentlichen Socket-Handler
            const handler = handlerFactory(io);

            if (typeof handler === 'function') {
                socketHandlers.push(handler);
                Logger.debug(`Preloaded socket handler: ${filePath}`);
            } else {
                Logger.warn(`Ignored invalid socket handler in ${filePath}`);
            }
        } catch (err) {
            Logger.error(`Error importing socket handler: ${fileUrl}`);
            Logger.error(err);
        }
    }
};


// **Register Handlers for Each Connection Using `socket.id`**
const registerSocketEvents = (socket) => {
    try {
        const attachedHandlers = [];

        for (const handler of socketHandlers) {
            const cleanup = handler(socket); // Store cleanup function if provided
            if (typeof cleanup === "function") {
                attachedHandlers.push(cleanup);
            }
        }

        // Store cleanup handlers using `socket.id`
        activeSockets.set(socket.id, attachedHandlers);
    } catch (err) {
        console.error("Error registering socket events:", err);
    }
};

(async () => {
    try {
        await loadSocketHandlers(path.join(__dirname, 'modules/sockets'), io);
    } catch (err) {
        console.error("Critical error loading socket handlers:", err);
    }
})();

export async function checkPow(socket){
    if (powVerifiedUsers.includes(socket.id)) {
        socket.powValidated = true;
        return;
    }

    listenToPow(socket);
    sendPow(socket);

    let powResult = await waitForPowSolution(socket);
    if (!powResult) {
        // send error to user?
        sendMessageToUser(socket.id, JSON.parse(
            `{
                        "title": "PoW Timeout",
                        "message": "It took you too long to upgrade your identity...",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": "onclick='closeModal()'"
                            }
                        },
                        "type": "error",
                        "displayTime": 600000
                    }`));

        socket.disconnect(true);
    } else {
        // let client know pow was successful.
        socket.emit("powAccepted");
    }
}

io.on('connection', async function (socket) {

    // socket ip
    var ip = socket.handshake.address;

    registerSocketEvents(socket);

    socket.on('disconnect', () => {
        //Logger.info(`Socket ${socket.id} disconnected, cleaning up handlers...`);
        if (activeSockets.has(socket.id)) {
            activeSockets.get(socket.id).forEach((cleanup) => cleanup());
            activeSockets.delete(socket.id); // Remove socket entry
        }

        // clean up stuff
        try {
            removeFromArray(powVerifiedUsers, socket.id);
        } catch (cleanupError) {
            Logger.error(cleanupError);
        }
    });

    // Check if user ip is blacklisted
    socketToIP[socket] = ip;
    if (serverconfig.ipblacklist.hasOwnProperty(ip)) {


        if (Date.now() <= serverconfig.ipblacklist[ip]) {

            let detailText = "";
            let banListResult = findInJson(serverconfig.banlist, "ip", ip);
            if (banListResult != null) {
                let bannedUntilDate = new Date(banListResult.until);
                bannedUntilDate.getFullYear() == "9999" ? detailText = "permanently banned" : detailText = `banned until: <br>${formatDateTime(bannedUntilDate)}`
                detailText += banListResult?.reason !== null ? `<br><br>Reason:<br>${banListResult.reason}` : ""
            }

            sendMessageToUser(socket.id, JSON.parse(
                `{
                            "title": "IP Blacklisted ${ip}",
                            "message": "Your IP Address was ${detailText || "banned"}",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "onclick='closeModal()'"
                                }
                            },
                            "type": "error",
                            "displayTime": 60000
                        }`));


            socket.disconnect();

            Logger.debug("Disconnected user because ip is blacklisted");
        } else if (Date.now() > serverconfig.ipblacklist[ip]) {
            unbanIp(socket);
        }
    }
});

// Function to initialize and read the file into memory
function initConfig(filePath) {
    try {
        // Open the file in read-write mode
        fileHandle = fs.openSync(filePath, "r+");
        const fileContent = fs.readFileSync(filePath, {encoding: "utf-8"});
        savedState = JSON.parse(fileContent);
        //console.log("Config initialized and loaded into memory.");
    } catch (error) {
        console.error("Failed to initialize config file:", error);
        throw error;
    }
}

// Function to compare and find changes between two objects
function getChanges(original, updated) {
    const changes = {};

    // Check for keys in the updated object
    Object.keys(updated).forEach((key) => {
        if (typeof updated[key] === "object" && updated[key] !== null) {
            if (!original[key] || typeof original[key] !== "object") {
                changes[key] = updated[key];
            } else {
                const nestedChanges = getChanges(original[key], updated[key]);
                if (Object.keys(nestedChanges).length > 0) {
                    changes[key] = nestedChanges;
                }
            }
        } else if (original[key] !== updated[key]) {
            changes[key] = updated[key];
        }
    });

    // Check for keys removed in the updated object
    Object.keys(original).forEach((key) => {
        if (!(key in updated)) {
            changes[key] = "__DELETE__"; // Mark for deletion
        }
    });

    return changes;
}

// Function to apply changes to the saved state
function applyChanges(target, changes) {
    Object.keys(changes).forEach((key) => {
        if (changes[key] === "__DELETE__") {
            delete target[key]; // Remove the key entirely
        } else if (typeof changes[key] === "object" && changes[key] !== null) {
            if (!target[key] || typeof target[key] !== "object") {
                target[key] = changes[key];
            } else {
                applyChanges(target[key], changes[key]);
            }
        } else {
            target[key] = changes[key];
        }
    });
}


// Function to save changes to the file
export function saveConfig(config) {
    if (!config) {
        console.error("No Config Content passed");
        return;
    }

    // Compare the current in-memory state with the new config
    const changes = getChanges(savedState, config);

    if (Object.keys(changes).length === 0) {
        return;
    }

    // Add the write operation to the queue
    writeQueue = writeQueue.then(() => {
        return new Promise((resolve, reject) => {
            try {

                // Apply changes to the in-memory buffer
                applyChanges(savedState, changes);

                // Update only the changed parts in the file
                const fileContent = JSON.stringify(savedState, null, 4);

                // Write the updated content to the file
                fs.ftruncateSync(fileHandle); // Clear the file
                fs.writeSync(fileHandle, fileContent, 0); // Write updated content
                reloadConfig()
                resolve();
            } catch (error) {
                console.error("Error saving config:", error);
                reject(error);
            }
        });
    });
}

// Close the file descriptor when the application exits
function closeConfigFile() {
    if (isClosing) return; // Prevent multiple calls
    isClosing = true;

    if (fileHandle) {
        try {
            fs.closeSync(fileHandle);
            console.log("Config file closed.");
        } catch (error) {
            console.error("Error closing config file:", error);
        }
    }

    process.exit()
}


// Automatically close the file on process exit
process.on("exit", closeConfigFile);
process.on("SIGINT", closeConfigFile); // Handle Ctrl+C
process.on("SIGTERM", closeConfigFile); // Handle termination

export function reloadConfig() {
    // reread config (update in program)
    serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));
}

export function getFreshConfig() {
    // used for edge cases
    return JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));
}

export function setServer(content) {
    server = content
}

export function setRatelimit(ip, value) {
    ratelimit[ip] = value
}

export function flipDebug() {
    debugmode = !debugmode;
}


const SECRET = serverconfig.serverinfo.turn.secret     // = static-auth-secret
const TURN_HOST = serverconfig.serverinfo.turn.host; // oder DNS
const TURN_PORT = serverconfig.serverinfo.turn.port;
const TTL = 300;

// --- /ice Endpoint ---
function makeCreds(userId = "web") {
    const exp = Math.floor(Date.now() / 1000) + TTL;
    const username = `${exp}:${userId}`;
    const credential = crypto.createHmac("sha1", SECRET).update(username).digest("base64");
    return {
        iceServers: [{
            urls: [
                `turn:${TURN_HOST}:${TURN_PORT}?transport=udp`,
                //`turn:${TURN_HOST}:${TURN_PORT}?transport=tcp`,
                //`turns:${TURN_HOST}:5349?transport=tcp`
            ],
            username,
            credential
        }]
    };
}

app.get("/ice", /* requireLogin, rateLimit maybe */(req, res) => {
    const userId = (req.user?.id) || (req.query.u || "web"); // setup quota per user on turn server!
    Logger.debug("ICE User is " + userId);
    res.set("Cache-Control", "no-store");

    if (serverconfig.serverinfo.turn.enabled != true) {
        res.json({
            iceServers: [{
                urls: [],
                username: "",
                credential: ""
            }]
        })

        Logger.warn("[VOIP ICE] Turn Server used for voice chat and screen sharing is not enabled or configurated!");
        Logger.warn("[VOIP ICE] Users behind firewalls and or strict NATs may not be able to talk or listen.");
        Logger.warn("[VOIP ICE] Checkout /docs/network/ folder on how to setup a turn server");

        return;
    }

    res.json(makeCreds(userId));
});