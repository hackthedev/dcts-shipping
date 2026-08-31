import {syncDiscoveredHosts} from "./modules/functions/discovery.mjs";

import https from "https";
import http from "http";
import fs from "fs";
import fse from "fs-extra"; // Use fs-extra for easy directory copying
import yaml from 'js-yaml';
import path from "path";
import sanitizeHtml from "sanitize-html";
import bcrypt from "bcrypt";
import crypto from "crypto";

// dSync Libs
import dSyncAuth from "@hackthedev/dsync-auth";
//import dSyncAuth from "E:\\network-z-dev\\dSyncAuth\\index.mjs";

import {dSyncSign} from "@hackthedev/dsync-sign";
//import dSyncWeb from "E:\\network-z-dev\\dsync-web\\index.mjs";
import dSyncWeb from "@hackthedev/dsync-web";

import dSync from "@hackthedev/dsync";
//import dSync from "E:\\network-z-dev\\dSync\\index.mjs";

import dSyncInbox from "@hackthedev/dsync-inbox"
//import dSyncInbox from "/run/media/marcel/SSD/network-z-dev/dSyncInbox/index.mjs"

import dSyncFiles from "@hackthedev/dsync-files";

import Logger from "@hackthedev/terminal-logger"
import dSyncSql from "@hackthedev/dsync-sql"
import dSyncIPSec from "@hackthedev/dsync-ipsec"
import FrontendLibs from "@hackthedev/frontend-libs";

// Depending on the SSL setting, this will switch.
import {Server} from "socket.io";
import getSize from "get-folder-size";

import {fileTypeFromBuffer} from "file-type";
import XMLHttpRequest from "xhr2";

import colors from "colors";
import xssFilters from "xss-filters";


// Import functions etc from files (= better organisation)
// Special thanks to Kannustin <3
// Main functions for chat
import {
    checkVersionUpdate,
    checkConfigAdditions,
    handleTerminalCommands,
    validateMemberId,
    checkRateLimit,
    generateId,
    sendMessageToUser,
    removeFromArray,
    toSeconds,
    setLongInterval,
} from "./modules/functions/main.mjs";

// IO related functions
import {
    checkFile,
    checkServerDirectories,
} from "./modules/functions/io.mjs";

// Chat functions
import {
    formatDateTime,
    findInJson,
    changeKeyVerification,
    getSocketIp, hasPermission, getMemberFromKey,
} from "./modules/functions/chat/main.mjs";

import {
    queryDatabase,
} from "./modules/functions/mysql/mysql.mjs";

import {fileURLToPath, pathToFileURL} from "url";
import {registerTemplateMiddleware} from "./modules/functions/template.mjs";
import {
    powVerifiedUsers,
} from "./modules/sockets/pow.mjs";

import {
    loadMembersFromDB,
    saveMemberToDB,
} from "./modules/functions/mysql/helper.mjs";
import {
    checkMigrations
} from "./modules/functions/migrations/helper.mjs";
import JSONTools from "@hackthedev/json-tools";
import {getCache, setCache} from "./modules/functions/ip-cache.mjs";
import {emitErrorToTestingClient} from "./modules/sockets/onErrorTesting.mjs";
import {checkAndUnbanPublicKey, unbanIp} from "./modules/functions/ban-system/helpers.mjs";
import {getMessageObjectById} from "./modules/sockets/resolveMessage.mjs";
import {getMemberHighestUploadLimit} from "./modules/functions/chat/helper.mjs";
import {initPluginSystem} from "./modules/sockets/routes/plugins.mjs";

//import SetupWizard from "/mnt/SSD/network-z-dev/setup-wizard/index.mjs";
import SetupWizard from "@hackthedev/setup-wizard";


// define quite some important stuff
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const fetch = globalThis.fetch;
const FormData = globalThis.FormData;
const fileFrom = undefined;


// improved now
export {
    https,
    Server,
    xssFilters,
    http,
    fs,
    fse,
    path,
    sanitizeHtml,
    bcrypt,
    FormData,
    fileFrom,
    fetch,
    getSize,
    fileTypeFromBuffer,
    XMLHttpRequest,
    colors,
    crypto,
};


export let checkedMediaCacheUrls = {};
export let usersocket = [];
export let loginAttempts = [];
export let userOldRoom = {};
export let useridFromSocket = [];
export let peopleInVC = {};
export let showedOfflineMessage = [];

export let typingMembers = [];
export let typingMembersTimeout = [];

export let ratelimit = [];
export let socketToIP = [];

export let allowLogging = false;
export let debugmode = process.env.DEBUG || false;
export let configPath = "./configs/config.json";

export let ipsec;
export let io;

/*
    Holy Server config file.
    needs to be above the imports else serverconfig will be undefined
 */
export var serverconfig = fs.existsSync(configPath) ? JSONTools.tryParse(fs.readFileSync(configPath, {encoding: "utf-8"})) : {};
checkConfigAdditions();

// handle startup args
let nodeArgs = process.argv;

// make it so that tests cant clear console
if (process.env.NODE_ENV === "test") {
    console.clear = () => {};
    Logger.log = () => {};
}

// remove the first few arguments because fuck that lol
nodeArgs.shift();
nodeArgs.shift();

// if we use pterodactyl we dont wanna clear the console
// because otherwise debugging will be hell
if(!isPtero()){
    console.clear();
}
else{
    // this log is used for pterodactyl!
    console.log("Starting...");
}

// init web server
export let server; // = http.createServer(app);
import express from "express";
import {initLivekitEndpoints} from "./modules/sockets/routes/livekit.mjs";
export const app = express();

// check version file for update check
let versionPath = path.join(path.resolve(), "version");
if(!fs.existsSync(versionPath)) {
    Logger.error("Version path not found!!")
    process.exit(1);
}
export let versionCode = fs.readFileSync(versionPath).toString();

// config file saving
let fileHandle = null; // File handle for the config file
let isClosing = false; // Flag to prevent multiple close attempts

// toggle debug mode
if (nodeArgs.includes("--debug") || debugmode === true) {
    // enable debug logging
    Logger.logDebug = true;
    flipDebug();
}

// check if needed directories are setup
checkServerDirectories();

// check if config file exists
checkFile("./plugins/settings.json", true, "{}");

// accept env vars and if present save them in the config
let dbHost = process.env.DATABASE_HOST || process.env.DB_HOST;
let dbUser = process.env.DATABASE_USER || process.env.DB_USER;
let dbPass = process.env.DATABASE_PASSWORD || process.env.DB_PASS;
let dbName = process.env.DATABASE_NAME || process.env.DB_NAME;

if (dbHost) serverconfig.serverinfo.sql.host = dbHost;
if (dbUser) serverconfig.serverinfo.sql.username = dbUser;
if (dbPass) serverconfig.serverinfo.sql.password = dbPass;
if (dbName) serverconfig.serverinfo.sql.database = dbName;

// do not await this, else its gonna take a while
saveConfig(serverconfig);

// create sql pool
export let db = null;
export let dsw = null;

export let syncer = null;
export let signer = null;
export let auther = null;
export let inbox = null;
export let files = new dSyncFiles();

// Catch uncaught errors
process.on("uncaughtException", function (err) {
    // Handle the error safely
    Logger.error("UNEXPECTED ERROR");
    Logger.error(err.message);
    Logger.error("Details: ");
    Logger.error(err.stack);
    emitErrorToTestingClient(err)
});

process.on("unhandledRejection", (reason) => {
    Logger.error("UNHANDLED PROMISE REJECTION");
    Logger.error(reason?.stack || reason);
    emitErrorToTestingClient(reason)
});

signer = new dSyncSign("./configs/privatekey.json");

initSetupWizard();

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

async function waitForTable(table, interval = 1000) {
    while (true) {
        const result = await queryDatabase(
            `SELECT TABLE_NAME FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = ?`,
            [table]
        );

        if (result?.length) {
            return;
        }

        Logger.info(`${table} does not exist yet, retrying...`);
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

async function initIPSec(){
    ipsec = new dSyncIPSec({
        checkCache: async (ip) => {
            let ipInfoRow = await getCache(ip, "ip_cache");
            if(ipInfoRow?.length === 0){
                await setCache(ip, "ip_cache");
            }
        },
        setCache: async (ip, data) => {
            await setCache(ip, "ip_cache", JSON.stringify(data));
        }
    });
    ipsec.updateRule({
        blockBogon: serverconfig.serverinfo.moderation.ip.blockBogon,
        blockSatelite: serverconfig.serverinfo.moderation.ip.blockSatelite,
        blockCrawler: serverconfig.serverinfo.moderation.ip.blockCrawler,
        blockProxy: serverconfig.serverinfo.moderation.ip.blockProxy,
        blockVPN: serverconfig.serverinfo.moderation.ip.blockVPN,
        blockTor: serverconfig.serverinfo.moderation.ip.blockTor,
        blockAbuser: serverconfig.serverinfo.moderation.ip.blockAbuser,

        whitelistedUrls: serverconfig.serverinfo.moderation.ip.urlWhitelist,
        whitelistedIps: serverconfig.serverinfo.moderation.ip.whitelist,
        blacklistedIps: serverconfig.serverinfo.moderation.ip.blacklist,
        companyDomainWhitelist: serverconfig.serverinfo.moderation.ip.companyDomainWhitelist,
    });

    await ipsec.filterExpressTraffic(app)
}

export async function initDCTSServer(){
    await initLivekitEndpoints();

    try {
        let dbConnectionTest = await dSyncSql.testConnection({
            host: serverconfig.serverinfo.sql.host,
            port: serverconfig.serverinfo.sql.port,
            username: serverconfig.serverinfo.sql.username,
            password: serverconfig.serverinfo.sql.password,
            database: serverconfig.serverinfo.sql.database,
        })

        // if connection is invalid show it
        if(!dbConnectionTest){
            Logger.error("Database credentials are wrong!")
            Logger.error(serverconfig.serverinfo.sql)
            return;
        }

        // init database connection
        db = new dSyncSql({
            host: serverconfig.serverinfo.sql.host,
            port: serverconfig.serverinfo.sql.port,
            user: serverconfig.serverinfo.sql.username,
            password: serverconfig.serverinfo.sql.password,
            database: serverconfig.serverinfo.sql.database,
            waitForConnections: true,
            connectionLimit: serverconfig.serverinfo.sql.connectionLimit,
            queueLimit: 0,
        });

        await db.ready;

        Logger.info("Checking and waiting for database connection...");
        Logger.info("If it takes too long check the data inside the config.json file");
        Logger.info("and make sure the database is running and accessible.");
        await db.waitForConnection();
        Logger.success("Connection established!");
        Logger.space();

        // Create a connection pool if sql is enabled
        // SQL Database Structure needed
        // it will create everything if missing (except database)
        // +1 convenience
        const tables = [
            {
                name: "dm_rooms",
                columns: [

                    {name: "id", type: "int(20) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "roomId", type: "varchar(200) NOT NULL UNIQUE KEY"},
                    {name: "title", type: "varchar(204) NOT NULL DEFAULT 'New Chat'"},
                    {name: "creatorId", type: "varchar(20) NOT NULL"},
                    {name: "createdAt", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                ]
            },
            {
                name: "dm_reads",
                columns: [
                    {name: "id", type: "int(20) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "memberId", type: "varchar(204) NOT NULL"},
                    {name: "targetId", type: "varchar(100) NOT NULL"}, // roomId oder channelId
                    {name: "lastReadAt", type: "bigint NOT NULL DEFAULT 0"},
                ],
                keys: [
                    {name: "UNIQUE KEY", type: "unique_member_target (memberId, targetId)"},
                    {name: "KEY", type: "idx_memberId (memberId)"},
                ]
            },
            {
                name: "dm_room_participants",
                columns: [
                    {name: "id", type: "int(20) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "roomId", type: "varchar(200) NOT NULL"},
                    {name: "memberId", type: "varchar(204) NOT NULL"},
                    {name: "createdAt", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                ],
                keys: [
                    {name: "UNIQUE KEY", type: "unique_room_member (roomId, memberId)"},
                    {name: "KEY", type: "idx_memberId (memberId)"},
                    {name: "KEY", type: "idx_roomId (roomId)"},
                ]
            },
            {
                name: "dms",
                columns: [
                    {name: "id", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "authorId", type: "varchar(100) NOT NULL"},
                    {name: "roomId", type: "varchar(200) NOT NULL"},
                    {name: "messageId", type: "varchar(100) NOT NULL UNIQUE KEY"},
                    {name: "message", type: "longtext NOT NULL"},
                    {name: "createdAt", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "editedAt", type: "bigint NULL"},
                ]
            },
            {
                name: "messages",
                columns: [
                    {name: "authorId", type: "varchar(100) NOT NULL"},
                    {name: "messageId", type: "varchar(100) NOT NULL UNIQUE KEY"},
                    {name: "room", type: "varchar(200) NOT NULL"},
                    {name: "message", type: "longtext NOT NULL"},
                    {
                        name: "createdAt",
                        type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)",
                    },
                    {
                        name: "editedAt",
                        type: "bigint DEFAULT NULL",
                    },
                ]
            },
            {
                name: "message_reactions",
                columns: [
                    {name: "cid", type: "varchar(500) NOT NULL UNIQUE KEY"},
                    {name: "reactionId", type: "int(100) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "messageId", type: "varchar(100) NOT NULL"},
                    {name: "emojiHash", type: "longtext NOT NULL"},
                    {name: "memberId", type: "varchar(100) NOT NULL"},
                    {name: "react_timestamp", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"}
                ]
            },
            {
                name: "ip_cache",
                columns: [
                    {name: "ip", type: "varchar(100) NOT NULL UNIQUE KEY"},
                    {name: "data", type: "longtext NOT NULL"},
                    {name: "last_sync", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"}
                ]
            },
            {
                name: "cache",
                columns: [
                    {name: "rowId", type: "int(12) NOT NULL AUTO_INCREMENT PRIMARY KEY"},
                    {name: "identifier", type: "varchar(255) NOT NULL UNIQUE KEY"},
                    {name: "type", type: "varchar(255) NOT NULL"},
                    {name: "data", type: "longtext NOT NULL"},
                    {name: "last_update", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "created", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"}
                ]
            },
            {
                name: "migrations",
                columns: [
                    {name: "migration_name", type: "varchar(100) NOT NULL"},
                    {name: "done", type: "int(10) NOT NULL DEFAULT 0"},
                ],
                keys: [{name: "UNIQUE KEY", type: "migration_name (migration_name)"}],
            },
            {
                name: "message_logs",
                columns: [
                    {name: "id", type: "int(100) NOT NULL PRIMARY KEY UNIQUE KEY AUTO_INCREMENT"},
                    {name: "authorId", type: "varchar(100) NOT NULL"},
                    {name: "messageId", type: "varchar(100) NOT NULL"},
                    {name: "room", type: "text NOT NULL"},
                    {name: "message", type: "longtext NOT NULL"},
                ]
            },
            {
                name: "url_cache",
                columns: [
                    {name: "id", type: "int(11) NOT NULL PRIMARY KEY UNIQUE KEY AUTO_INCREMENT"},
                    {name: "url", type: "longtext NOT NULL UNIQUE KEY"},
                    {name: "media_type", type: "text NOT NULL"},
                ]
            },
            {
                name: "reports",
                columns: [
                    {name: "id", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT"},
                    {name: "reportCreator", type: "longtext NOT NULL"},
                    {name: "reportedUser", type: "longtext NOT NULL"},
                    {name: "reportType", type: "text NOT NULL"},
                    {name: "reportData", type: "longtext NULL"},
                    {name: "reportNotes", type: "longtext NULL"},
                    {name: "reportStatus", type: "varchar(100) NOT NULL DEFAULT 'pending'"},
                ],
            },
            {
                name: "auditlog",
                columns: [
                    {name: "text", type: "longtext NOT NULL"},
                    {name: "datetime", type: "datetime NOT NULL DEFAULT CURRENT_TIMESTAMP"},
                ],
            },
            {
                name: "members",
                columns: [
                    {name: "rowId", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT" },
                    {name: "id", type: "varchar(100) NOT NULL UNIQUE"},
                    {name: "token", type: "varchar(255)"},
                    {name: "onboarding", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "loginName", type: "varchar(100)"},
                    {name: "name", type: "varchar(100) NOT NULL DEFAULT 'User'"},
                    {name: "nickname", type: "varchar(100) DEFAULT NULL"},
                    {name: "country_code", type: "varchar(50) DEFAULT NULL"},
                    {name: "status", type: "text DEFAULT ''"},
                    {name: "aboutme", type: "text DEFAULT ''"},
                    {name: "icon", type: "longtext DEFAULT ''"},
                    {name: "banner", type: "longtext DEFAULT ''"},
                    {name: "card", type: "longtext DEFAULT ''"},
                    {name: "joined", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "isOnline", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "lastOnline", type: "bigint DEFAULT 0"},
                    {name: "isBanned", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "isMuted", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "password", type: "text DEFAULT NULL"},
                    {name: "publicKey", type: "text DEFAULT ''"},
                    {name: "type", type: "varchar(500) DEFAULT NULL"},
                    {name: "isVerifiedKey", type: "BOOLEAN DEFAULT FALSE"},
                    {name: "pow", type: "text DEFAULT ''"},
                ]
            },
            {
                name: "bans",
                columns: [
                    {name: "rowId", type: "int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT" },
                    {name: "memberId", type: "varchar(100) NOT NULL UNIQUE"},
                    {name: "publicKey", type: "text NULL UNIQUE"},
                    {name: "issuerId", type: "varchar(100) NOT NULL"},
                    {name: "ip", type: "varchar(100) DEFAULT NULL"},
                    {name: "reason", type: "varchar(500) DEFAULT NULL"},
                    {name: "created", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                    {name: "until", type: "bigint NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000)"},
                ]
            },
        ];

        const dbTasks = [
            {
                name: "Purge Old Message Logs",
                enabled: serverconfig.serverinfo.reports.enabled,
                interval: toSeconds("12 hours"),
                query: `
                    DELETE
                    ml
                        FROM message_logs ml
                        LEFT JOIN messages m
                        ON m.messageId = ml.messageId
                        LEFT JOIN reports r
                        ON JSON_UNQUOTE(JSON_EXTRACT(r.reportData, '$.messageId')) = ml.messageId
                        WHERE m.messageId IS NULL
                        AND r.id IS NULL;
                `,
            },
        ];

        // create missing database schema
        for (const table of tables) {
            await db.checkAndCreateTable(table);
        }
        
        // then wait for these tables to exist to avoid errors
        const criticalTables = ["members", "messages", "cache", "migrations", "message_logs", "reports"];
        for (const t of criticalTables) {
            await waitForTable(t);
        }

        // after the tables exist etc we will fire up our awesome new job(s)
        scheduleDbTasks(dbTasks);

        // load some data etc
        await loadMembersFromDB();
        await checkMigrations();

        auther = new dSyncAuth(app, signer, async function (data) {
            if (data.valid === true) {
                changeKeyVerification(data.publicKey, data.valid);
            }
        });

        // dsync web interface. currently unused and left for testing
        /*
        dsw = new dSyncWeb({
            express,
            app,
            db,
            dsa: dSyncAuth,
            canAccess: async (req) => {
                const { id, token } = req.body || {};
                if (!id || !token) return false;

                if(!await validateMemberId(id, null, token)) return false;
                return await hasPermission(id, "administrator");
            }
        });

        await dsw.setup();

        // server-to-server communication
        syncer = new dSync({
            prefix: "dcts",
            app,
            dSyncWeb: dsw,
            host: serverconfig.serverinfo.app.url?.length >= 7 ? serverconfig.serverinfo.app.url : null
        });
        */

        // upload handler
        await files.registerFileUploadHandle({
            app,
            urlPath: "/upload",
            uploadPath: "./public/uploads",
            limits: {
                getCorsHeaders: async (req) => ({
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*"
                }),

                getUploadPath: async (req) => {
                    let type = req.headers["x-upload-type"] ?? "upload";

                    if (type === "emoji") return "./public/emojis";

                    return "./public/uploads";
                },

                getMaxMB: async (req) => {
                    let memberId = req.headers["x-member-id"] ?? null;
                    let memberToken = req.headers["x-member-token"] ?? null;
                    let sessionId = req.headers["x-session-id"] ?? null;
                    let publicKey = req.headers["x-public-key"] ?? null;

                    let isDCTSUser = memberId && memberToken;
                    let isRemote = sessionId && publicKey && !isDCTSUser;

                    if(isDCTSUser && await validateMemberId(memberId, null, memberToken)){
                        return getMemberHighestUploadLimit(memberId);
                    }
                    else if(isRemote){
                        // validate session etc
                        let sessionResult = dSyncAuth.verifySession(auther.authSessions, sessionId, publicKey);

                        // if session is true we can try and see if the person connected to the server while using a client/app.
                        // this way the account becomes automatically linked, allowing for possibly bigger, individual limits.
                        if(sessionResult?.valid === true){

                            // check n see if a member exists
                            let memberObj = getMemberFromKey(publicKey);
                            if(memberObj?.id){
                                return getMemberHighestUploadLimit(memberObj.id);
                            }
                        }

                        return serverconfig.serverinfo.messenger.defaultFileUploadLimit ?? 0; // setting when
                    }

                    return 0;
                },

                getMaxFolderSizeMB: async (req) => {
                    // the max. folder size of the uploadPath folder. uploads will
                    // fail once reached.
                    return serverconfig.serverinfo.maxUploadStorage || 1024; // 1 GB
                },

                getAllowedMimes: async (req) => {
                    // the type of media that can be uploaded
                    return serverconfig.serverinfo.uploadFileTypes
                },

                canUpload: async (req) => {
                    // optional, must return a boolean.
                    // in this example, users that arent signed in cant upload.
                    // you could extend this for checking if a user is banned etc..
                    return true;
                },

                canAccessFiles: (req, res, next) => {
                    // optional, default will always allow access.
                    // you could implement some sort of file verification feature or
                    // paywall content uploaded by creators.

                    return true
                },

                onFileAccess: async (req) => {
                    let fileName = req.params.id;
                    // you can make a view system or add a rate limit
                },

                onFinish: async (req) => {
                    // optional.
                    //Logger.info("Upload finished", req.user?.id);
                }
            }
        });

    } catch (e) {
            Logger.error("Error while trying to connect to database!")
            Logger.error(e)
            process.exit(1)
    }

    let magentaBlinkColor = Logger.colors.blink + Logger.colors.bright + Logger.colors.fgMagenta

    Logger.success(`Welcome to DCTS`);
    Logger.success(`Checkout our subreddit at https://www.reddit.com/r/dcts/`);
    Logger.success( `The Official Github Repo: https://github.com/hackthedev/dcts-shipping/`);

    Logger.space();
    Logger.info(`♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥`, magentaBlinkColor);
    Logger.info(`Support the project » https://ko-fi.com/shydevil`, magentaBlinkColor);
    Logger.info(`♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥`, magentaBlinkColor);
    Logger.space();
    Logger.info(`You're running version ` + versionCode);

    // Check if new Version exists
    var checkVer = await checkVersionUpdate();
    if (checkVer != null) {
        Logger.space();
        Logger.info(
            `New version ${checkVer} is available!`,
            Logger.colors.blink + Logger.colors.fgCyan + Logger.colors.bright,
        );
        Logger.info(
            `Download » https://github.com/hackthedev/dcts-shipping/releases`,
            Logger.colors.blink + Logger.colors.fgCyan + Logger.colors.bright,
        );
        Logger.space();
    }

    // Check if SSL is used or not
    io = new Server(server, {
        maxHttpBufferSize: 1e8,
        secure: true,
        pingInterval: 25000,
        pingTimeout: 60000,
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: false,
        },
    });

    // Ability to enter "commands" into the terminal window
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", function (text) {
        var data = text.trim();

        var args = data.split(" ");
        var command = args[0];

        handleTerminalCommands(command, args);
    });


    initIPSec();
    app.use(express.static(__dirname + "/public"));

    app.use(
        "/docs",
        express.static("docs", {
            etag: false,
            lastModified: false,
            maxAge: 0,
        })
    );

    // check admin token and setup
    if (serverconfig.serverroles["1111"]?.token?.length === 0) {
        var adminToken = generateId(64);
        serverconfig.serverinfo.setup = 1;
        serverconfig.serverroles["1111"].token.push(adminToken);
        saveConfig(serverconfig);

        Logger.info(
            `To obtain the admin role in your server, copy the following token.`,
        );
        Logger.info(
            `You can use it if prompted or if you right click on the server icon and press "Redeem Key"`,
        );

        Logger.info(`Server Admin Token:`);
        Logger.info(adminToken);
    } else if (serverconfig.serverroles["1111"].token.length > 0) {
        Logger.info(
            `To obtain the admin role in your server, copy the following token.`,
        );
        Logger.info(
            `You can use it if prompted or if you right click on the server icon and press "Redeem Key"`,
        );

        Logger.info(colors.cyan(`Available Server Admin Token(s):`));

        serverconfig.serverroles["1111"].token.forEach((token) => {
            if (token) Logger.info(token);
        });
        allowLogging = true;
    }

    //initPaymentSystem(app)
    listenToIO();

    try{
        let libDir = path.join(path.resolve(), "public", "js", "libs");
        const results = await FrontendLibs.installMultiple([
            { package: '@hackthedev/file-manager@1.0.0', path: libDir },
            { package: '@hackthedev/element-loader@1.0.0', path: libDir },
            { package: '@hackthedev/rich-editor@latest', path: libDir },
            { package: '@hackthedev/chat-tools@1.0.1', path: libDir },
            { package: '@hackthedev/autocomplete@latest', path: libDir },
            { package: '@hackthedev/prompts@latest', path: libDir },
            { package: '@hackthedev/event-dispatcher@latest', path: libDir },
        ]);

        results.forEach((r) => {
            if(r?.success || r?.skipped){
                Logger.debug(r?.message)
            }
            else{
                Logger.error(r?.message)
            }
        });
    }
    catch(exc){
        Logger.error(exc);
    }

    syncDiscoveredHosts(true);

    try {
        await initPluginSystem();
        await initSocketHandlers()
    } catch (err) {
        console.error("Critical error loading socket handlers:", err);
    }

    initSocketHandlers();
}

async function initSetupWizard(){
    serverconfig.serverinfo.sql.enabled = true;

    let setupWizard = new SetupWizard({
        debug: debugmode,
        onCompleted: async () => {
            await finishSetup();
        }
    });

    // sql setup
    let setupDbPass = generateId(64);
    let setupDbUser = `dcts_${generateId(10)}`;
    let setupDbName = `dcts_${generateId(10)}`;

    // livekit config setup
    let setupLivekitKey = generateId(32);
    let setupLivekitSecret = generateId(64);

    let livekitConfigFilePath = path.join(__dirname, "livekit", "livekit.yaml");
    let livekitConfig = null;

    registerSetupPrerequisites();

    // first time setup
    if((serverconfig.serverinfo.setup === 0 || await checkPrerequisites() === false) && !skipSetup()){
        serverconfig.serverinfo.sql.password = setupDbPass;
        serverconfig.serverinfo.sql.username = setupDbUser;
        serverconfig.serverinfo.sql.database = setupDbName;

        // manipulate the livekit yaml file
        if(fs.existsSync(livekitConfigFilePath)){
            livekitConfig = JSONTools.parseYaml(fs.readFileSync(livekitConfigFilePath, "utf8"));
            // reset keys
            livekitConfig.keys = {};
            livekitConfig.keys[setupLivekitKey] = setupLivekitSecret;
            // then save it
            fs.writeFileSync(livekitConfigFilePath, JSONTools.toYaml(livekitConfig));
        }

        serverconfig.serverinfo.livekit.enabled = true;
        serverconfig.serverinfo.livekit.key = setupLivekitKey;
        serverconfig.serverinfo.livekit.secret = setupLivekitSecret;

        registerSetupSteps();
    }
    else{
        setupWizard.exitSetup();
        registerSetupPrerequisites();
        registerSetupSteps();
        await finishSetup();
    }

    function registerSetupPrerequisites(){
        setupWizard.addPrerequisites({
            "linux": [
                {
                    title: "Repository Update",
                    check: [
                        ["nuhuh", "non-existent"]
                    ],
                    install: [
                        "DEBIAN_FRONTEND=noninteractive apt-get update -y"
                    ],
                    execute: []
                },
                {
                    title: "Screen",
                    check: [
                        ["screen --version", "Screen version"]
                    ],
                    install: [
                        "DEBIAN_FRONTEND=noninteractive apt-get install -y screen"
                    ],
                    execute: []
                },
                {
                    title: "cURL",
                    check: [
                        ["curl", "curl:"]
                    ],
                    install: [
                        "DEBIAN_FRONTEND=noninteractive apt install curl -y"
                    ],
                    execute: []
                },
                {
                    title: "wget",
                    check: [
                        ["wget", "wget:"]
                    ],
                    install: [
                        "DEBIAN_FRONTEND=noninteractive apt install wget -y"
                    ],
                    execute: []
                },
                {
                    title: "LiveKit",
                    check: [
                        ["livekit-server --version", "livekit-server version"]
                    ],
                    install: [
                        "curl -sSL https://get.livekit.io | bash",
                    ],
                    execute: [
                        `screen -list | grep -q "dcts_livekit" || screen -dmS dcts_livekit livekit-server --config ${path.join(__dirname, "livekit", "livekit.yaml")}`
                    ]
                },
                {
                    title: "MariaDB",
                    check: [
                        ["mariadb --version", "mariadb from"]
                    ],
                    install: [
                        `DEBIAN_FRONTEND=noninteractive apt install mariadb-server mariadb-client -y`,
                        `service mariadb start`,
                        `mariadb -e "CREATE DATABASE IF NOT EXISTS ${setupDbName};"`,
                        `mariadb -e "CREATE USER IF NOT EXISTS '${setupDbUser}'@'localhost' IDENTIFIED BY '${setupDbPass}';"`,
                        `mariadb -e "GRANT ALL PRIVILEGES ON ${setupDbName}.* TO '${setupDbUser}'@'localhost'; FLUSH PRIVILEGES;"`
                    ],
                    execute: [
                        `systemctl is-active --quiet mariadb || service mariadb start`
                    ]
                },
                {
                    title: "Rider",
                    check: [
                        ["rider hello", "Rider is available"]
                    ],
                    install: [
                        "curl -fsSL https://dist.dcts.community/api/package/rider-cli/install.sh | bash"
                    ],
                    execute: []
                }
            ],
            "windows": []
        })
    }

    function registerSetupSteps(){
        // add the setup steps here
        setupWizard.addStep({
            id: "welcome",
            title: "Welcome!",
            description: "Lets check on the requirements! You can continue once they're done!",
            fields: []
        })

        setupWizard.addStep({
            id: "sql",
            title: "Database",
            subtitle: "Connection Info",
            description: "Please add your sql database credentials",
            fields: [
                {
                    id: "host",
                    text: "Host",
                    placeholder: null,
                    type: "text",
                    value: serverconfig?.serverinfo?.sql?.host ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "string";
                    }
                },
                {
                    id: "username",
                    text: "Username",
                    placeholder: null,
                    type: "text",
                    value: serverconfig?.serverinfo?.sql?.username ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "string";
                    }
                },
                {
                    id: "password",
                    text: "Password",
                    type: "text",
                    placeholder: null,
                    isSensitive: true,
                    value: serverconfig?.serverinfo?.sql?.password ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "string";
                    }
                },
                {
                    id: "database",
                    text: "Database Name",
                    type: "text",
                    placeholder: null,
                    value: serverconfig?.serverinfo?.sql?.database ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "string";
                    }
                },
                {
                    id: "port",
                    text: "Port",
                    placeholder: null,
                    type: "number",
                    value: serverconfig?.serverinfo?.sql?.port ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "number";
                    }
                }
            ],
            test: async(data) => {
                let dbTest = await dSyncSql.testConnection({...data})

                if(dbTest === true){
                    serverconfig.serverinfo.sql.host = data?.host;
                    serverconfig.serverinfo.sql.username = data?.username;
                    serverconfig.serverinfo.sql.password = data?.password;
                    serverconfig.serverinfo.sql.database = data?.database;
                    serverconfig.serverinfo.sql.port = data?.port;
                    await saveConfig(serverconfig);
                }

                return {
                    error: dbTest === false ? "Error connecting to database :/" : null
                };
            }
        })

        setupWizard.addStep({
            id: "livekit",
            title: "LiveKit VoIP",
            description: "Please add your livekit informations",
            fields: [
                {
                    id: "key",
                    text: "Key",
                    placeholder: null,
                    type: "text",
                    isSensitive: true,
                    value: serverconfig?.serverinfo?.livekit?.key ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "string";
                    }
                },
                {
                    id: "secret",
                    text: "Secret",
                    placeholder: null,
                    type: "text",
                    isSensitive: true,
                    value: serverconfig?.serverinfo?.livekit?.secret ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "string";
                    }
                },
                {
                    id: "url",
                    text: "Url",
                    placeholder: null,
                    type: "text",
                    value: serverconfig?.serverinfo?.livekit?.url ?? null,
                    test: async (value) => {
                        return !!value?.trim() && typeof value === "string";
                    }
                }
            ],
            test: async(data) => {
                let livekitResponse = await fetch(data.url, {
                    signal: AbortSignal.timeout(2500)
                });

               if(livekitResponse.status === 200) return {
                   error: null
               }

                return {
                    error: livekitResponse.status
                };
            },
        })
    }

    async function finishSetup(){
        serverconfig.serverinfo.setup = 1
        await saveConfig(serverconfig);
        await executePrerequisites();
        startWebServer()
        initDCTSServer();
    }

    async function executePrerequisites(){
        await doForEachSetupPrerequisite(async (prerequisite) => {
            // if there are startup commands after install etc
            if(prerequisite?.execute) {
                for(let command in prerequisite.execute){
                    await setupWizard.runCommand(command)
                }
            }
        })
    }

    async function checkPrerequisites(){
        let result = await doForEachSetupPrerequisite(async (prerequisite) => {
            // if there are startup commands after install etc
            let hadErrors = false;
            if(prerequisite?.check) {
                for(let command in prerequisite.check){
                    let runResult = await setupWizard.runCommand(command)
                    if(!runResult.success) hadErrors = true;
                }
            }

            return hadErrors;
        })

        let hadError = false;
        for(let res of result){
            if(res[1] === true) hadError = true;
        }

        // invert it so it makes more sense to use.
        // false = there was a eror
        return !hadError;
    }

    async function doForEachSetupPrerequisite(callback){
        if(!callback ||typeof callback !== "function") throw new Error("Missing setup callback");
        let prerequisites = setupWizard.prerequisites?.[setupWizard.getOSName()];
        let prereqLength = Object.keys(prerequisites).length;

        let results = new Map();
        for (let i = 0; i < prereqLength; i++) { // prerequisite index
            const prerequisite = prerequisites[i];
            let result = await callback(prerequisite)
            results.set(i, result);
        }

        return results;
    }
}

export async function startWebServer() {
    server = http.createServer(app)

    registerTemplateMiddleware(app, __dirname, fs, path, serverconfig);

    // important for api and everything
    app.use((req, res, next) => {
        const origin = req.headers.origin;

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Vary", "Origin");
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        res.header("Access-Control-Max-Age", "86400");
        res.set("Cache-Control", "no-store");

        if (req.method === "OPTIONS") {
            return res.sendStatus(204);
        }

        next();
    });

    // Start the app server
    let port = process.env.PORT || serverconfig.serverinfo.port;
    server.listen(port, "0.0.0.0", async function () {
        Logger.info("Web server is running on port " + port);
    });
}

export async function checkPow(socket) {
    if (powVerifiedUsers.includes(socket.id)) {
        socket.powValidated = true
        return
    }

    let difficulty = serverconfig.serverinfo.pow.difficulty
    let { challenge } = auther.createPowChallenge(difficulty)
    let { estimatedSeconds } = dSyncAuth.estimatePoWDuration(difficulty)
    let timeout = (estimatedSeconds * 2) + 600

    socket.emit("powChallenge", { challenge, difficulty })

    let pow = auther.waitForPow(challenge, difficulty, timeout)

    socket.on("verifyPow", (data, response) => {
        checkRateLimit(socket)
        let result = pow.verify(data.solution)
        response(result)
    })

    try {
        await pow
        powVerifiedUsers.push(socket.id)
        socket.emit("powAccepted")
    } catch (err) {
        sendMessageToUser(socket.id, {
            title: "PoW Timeout",
            message: "It took you too long to upgrade your identity...",
            buttons: {
                "0": {
                    text: "Ok",
                    events: "onclick='closeModal()'"
                }
            },
            type: "error",
            displayTime: 600000
        })
        socket.disconnect(true)
    }
}

async function listenToIO(){
    io.on("connection", async function (socket) {
        // socket ip
        var ip = getSocketIp(socket);
        if (serverconfig.banlist[ip]) {
            socket.disconnect(true);
        }

        registerSocketEvents(socket);

        socket.on("disconnect", async () => {
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
                let banListResult = findInJson(serverconfig?.banlist, "ip", ip);

                if (banListResult != null) {
                    let bannedUntilDate = new Date(banListResult.until);
                    bannedUntilDate.getFullYear() === "9999"
                        ? (detailText = "permanently banned")
                        : (detailText = `banned until: <br>${formatDateTime(bannedUntilDate)}`);
                    detailText +=
                        banListResult?.reason !== null
                            ? `<br><br>Reason:<br>${banListResult.reason}`
                            : "";
                }

                sendMessageToUser(
                    socket.id,
                    JSON.parse(
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
                        }`,
                    ),
                );

                socket.disconnect();

                Logger.debug("Disconnected user because ip is blacklisted");
            } else if (Date.now() > serverconfig.ipblacklist[ip]) {
                unbanIp(socket);
            }
        }
    });

    // init here cauz we need io
    inbox = new dSyncInbox({
        io,
        app,
        express,
        dSyncSign: signer,
        dSyncSql: db,
        dSyncAuth: auther,
        isValidated: async (req, res) => {
            const {inboxId, timestamp, customId} = req?.params;
            const { id, token, sessionId, publicKey } = req.body;

            // if public key is banned
            if(publicKey){
                let publicKeyCheckResult = await checkAndUnbanPublicKey(publicKey);
                if(publicKeyCheckResult?.result === true) return false;
            }

            if(serverconfig.servermembers[id]?.token === token && !sessionId) return true;

            if(sessionId){
                let sessionResult = dSyncAuth.verifySession(auther.authSessions, sessionId, publicKey);
                return sessionResult?.valid ?? false;
            }

            return false;
        },
        getIdentifier: async (req, res) => {
            const {inboxId, timestamp, customId} = req?.params;
            let { id, token, sessionId, publicKey } = req.body;

            if(!id && !token && publicKey){
                let member = await getMemberFromKey(publicKey);
                if (member){
                    id = member.id;
                    token = member.token;
                }
            }

            return id ?? null;
        },
        beforeReturn: async (req, res, inbox) => {
            if(Array.isArray(inbox) && inbox.length > 0){
                for(let item of inbox){
                    let itemType = item?.type;

                    // chat mentions
                    if(itemType === "mention"){
                        let messageId = item?.data?.messageId;
                        if(!messageId || messageId?.length !== 12) continue;

                        item.data = await getMessageObjectById(messageId);
                    }
                }
            }
        }
    })

    await inbox.init();
}

export async function saveConfig(config) {
    if (!config) return;

    // save members only to DB
    try {
        if (config.servermembers && Object.keys(config.servermembers).length > 0) {
            for (const [id, member] of Object.entries(config.servermembers)) {
                if (member && member.id) {
                    await saveMemberToDB(id, member);
                }
            }
        }
    } catch (exception) {
        Logger.error("error while trying to save config");
        Logger.error(exception);
    }

    // write config without members
    const fileContent = JSON.stringify(
        config,
        (k, v) => (k === "servermembers" ? undefined : v),
        4,
    );

    fs.writeFileSync(configPath, fileContent);
}

function closeConfigFile() {
    if (isClosing) return;
    isClosing = true;

    if (fileHandle) {
        try {
            fs.closeSync(fileHandle);
            console.log("Config file closed.");
        } catch (error) {
            console.error("Error closing config file:", error);
        }
    }

    process.exit();
}

// Automatically close the file on process exit
process.on("exit", closeConfigFile);
process.on("SIGINT", closeConfigFile); // Handle Ctrl+C
process.on("SIGTERM", closeConfigFile); // Handle termination

export async function reloadConfig() {
    return; // deprecated

    try {
        const json = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(json);

        for (const key of Object.keys(serverconfig)) delete serverconfig[key];
        Object.assign(serverconfig, parsed);

        const rows = await queryDatabase("SELECT * FROM members");
        serverconfig.servermembers = {};
        for (const row of rows) {
            serverconfig.servermembers[row.id] = row;
        }
    } catch (err) {
        serverconfig.servermembers = {};
    }
}

export function getFreshConfig() {
    // used for edge cases
    return JSON.parse(fs.readFileSync(configPath, {encoding: "utf-8"}));
}

export function setServer(content) {
    server = content;
}

export function setRatelimit(ip, value) {
    ratelimit[ip] = value;
}

export function flipDebug() {
    debugmode = !debugmode;
}

export function isPtero(){
    return nodeArgs?.includes("--ptero")
}

export function skipSetup(){
    return nodeArgs?.includes("--skip-setup")
}

export const socketHandlers = [];
const activeSockets = new Map();
async function initSocketHandlers(){
    await loadSocketHandlers(path.join(__dirname, "modules/sockets"), io);
}

const loadSocketHandlers = async (mainHandlersDir, io) => {
    const fileList = [];

    const scanDir = (dir) => {
        const files = fs.readdirSync(dir, {withFileTypes: true});
        for (const file of files) {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
                scanDir(filePath);
            } else if (file.name.endsWith(".mjs")) {
                fileList.push(filePath);
            }
        }
    };

    scanDir(mainHandlersDir);

    for (const filePath of fileList) {
        const fileUrl = pathToFileURL(filePath).href;
        try {
            const {default: handlerFactory} = await import(fileUrl);
            const handler = handlerFactory(io);

            if (typeof handler === "function") {
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

const registerSocketEvents = (socket) => {
    try {
        const attachedHandlers = [];

        for (const handler of socketHandlers) {
            const cleanup = handler(socket);
            if (typeof cleanup === "function") {
                attachedHandlers.push(cleanup);
            }
        }

        activeSockets.set(socket.id, attachedHandlers);
    } catch (err) {
        console.error("Error registering socket events:", err);
    }
};