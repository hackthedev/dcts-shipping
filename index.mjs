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

// Depending on the SSL setting, this will switch.
export let server; // = http.createServer(app);
import { Server } from 'socket.io';

import FormData from 'form-data';
import fetch from 'node-fetch';
import getSize from 'get-folder-size';

import { fileTypeFromBuffer } from 'file-type';
import XMLHttpRequest from 'xhr2';

import colors from 'colors';
import request from 'request';
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
    fetch,
    getSize,
    fileTypeFromBuffer,
    XMLHttpRequest,
    colors,
    request
};

import Logger from "./modules/functions/logger.mjs";


export let checkedMediaCacheUrls = {};
export let usersocket = []
export let loginAttempts = [];
export let userOldRoom = {}
export let peopleInVC = {}
export let showedOfflineMessage = [];
export let powVerifiedUsers = [];

export let typingMembers = [];
export let typingMembersTimeout = [];

export let ratelimit = [];
export let socketToIP = [];

export let allowLogging = false;
export let debugmode = false;
export let versionCode = 419;


// config file saving
let fileHandle = null; // File handle for the config file
let savedState = null; // In-memory config state
let writeQueue = Promise.resolve(); // Queue for write operations
let isClosing = false; // Flag to prevent multiple close attempts


// PoW difficulty
let powDifficulty = 7;


// check if needed directories are setup
checkServerDirectories()

// check if config file exists
checkConfigFile()
/*
    Holy Server config file.
    needs to be above the imports else serverconfig will be undefined
 */
export var serverconfig = JSON.parse(fs.readFileSync("./config.json", { encoding: "utf-8" }));
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
    moveJson
} from "./modules/functions/main.mjs"

// IO related functions
import {
    checkConfigFile,
    checkServerDirectories,
    consolas,
    getSavedChatMessage,
    saveChatMessage
} from "./modules/functions/io.mjs"

import { checkSSL } from "./modules/functions/http.mjs"

// Chat functions
import {
    hasPermission,
    getChannelTree,
    resolveGroupByChannelId,
    muteUser,
    resolveCategoryByChannelId,
    banUser,
    resolveChannelById,
    resolveRolesByUserId,
    getMemberLastOnlineTime,
    getMemberProfile,
    getMemberList,
    getGroupList,
    banIp,
    unbanIp,
    getNewDate,
    formatDateTime,
    findInJson
} from "./modules/functions/chat/main.mjs";

import {
    getMemberHighestRole,
    convertMention,
    findEmojiByID,
} from "./modules/functions/chat/helper.mjs";

import {
    deleteChatMessagesFromDb,
    getChatMessagesFromDb,
    decodeFromBase64,
    leaveAllRooms
} from "./modules/functions/mysql/helper.mjs"


import {
    checkAndCreateTable,
} from "./modules/functions/mysql/mysql.mjs";

import { fileURLToPath, pathToFileURL } from "url";







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
            const { default: handler } = await import(fileUrl);
            handler(socket);
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
    await fse.copy(pluginWebDir, destinationDir, { overwrite: true });
};

// Iterate over each plugin and process it
const processPlugins = async () => {
    const pluginDirs = fs.readdirSync(pluginsDir);

    for (const pluginName of pluginDirs) {
        const pluginDir = path.join(pluginsDir, pluginName);
        const pluginFunctionsDir = path.join(pluginDir, 'functions');
        const pluginSocketsDir = path.join(pluginDir, 'sockets');
        const pluginWebDir = path.join(pluginDir, 'web');

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
                { name: 'authorId', type: 'varchar(100) NOT NULL' },
                { name: 'messageId', type: 'varchar(100) NOT NULL' },
                { name: 'room', type: 'text NOT NULL' },
                { name: 'message', type: 'longtext NOT NULL' }
            ],
            keys: [
                { name: 'UNIQUE KEY', type: 'messageId (messageId)' }
            ]
        },
        {
            name: 'url_cache',
            columns: [
                { name: 'id', type: 'int(11) NOT NULL' },
                { name: 'url', type: 'longtext NOT NULL' },
                { name: 'media_type', type: 'text NOT NULL' }
            ],
            keys: [
                { name: 'PRIMARY KEY', type: '(id)' },
                { name: 'UNIQUE KEY', type: 'id (id)' },
                { name: 'UNIQUE KEY', type: 'url (url) USING HASH' }
            ],
            autoIncrement: 'id int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55'
        },
        {
            name: "reports",
            columns: [
                { "name": "id", "type": "int(11) NOT NULL" },
                { "name": "reportCreator", "type": "longtext NOT NULL" },
                { "name": "reportedUser", "type": "longtext NOT NULL" },
                { "name": "reportType", "type": "text NOT NULL" },
                { "name": "reportData", "type": "longtext NULL" },
                { "name": "reportNotes", "type": "longtext NULL" },
                { "name": "reportStatus", "type": "varchar(100) NOT NULL DEFAULT 'pending'" }
            ],
            keys: [
                { "name": "PRIMARY KEY", "type": "(id)" }
            ],
            autoIncrement: "id int(11) NOT NULL AUTO_INCREMENT"
        }
    ];

    (async () => {
        for (const table of tables) {
            await checkAndCreateTable(table);
        }
    })();
}




Logger.success(`Welcome to DCTS`);
Logger.success(`Checkout our subreddit at https://www.reddit.com/r/dcts/`);
Logger.success(`The Official Github Repo: https://github.com/hackthedev/dcts-shipping/`);
Logger.success(`Support the project at https://ko-fi.com/shydevil`, Logger.colors.blink);
Logger.info(`You're running version ` + versionCode);

// Check if new Version exists
var checkVer = await checkVersionUpdate()
if (checkVer != null) {
    Logger.info(`New version ${checkVer} is available!`, Logger.colors.fgCyan + Logger.colors.bright);
    Logger.info(`Download: https://github.com/hackthedev/dcts-shipping/releases`, Logger.colors.fgCyan + Logger.colors.bright);
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

    // Create the log file
    fs.writeFile("./logs/error_" + date + ".txt", err.message + "\n" + err.stack, function (err) {
        if (err) {
            return console.log(err);
        }
        Logger.debug("The log file ./logs/error_" + date + ".txt was saved!");
    });


    // Create the config backup file
    fs.writeFile("./config_backups/config_" + date + ".txt", JSON.stringify(serverconfig, false, 4), function (err) {
        if (err) {
            return console.log(err);
        }
        Logger.debug("The config file ./logs/error_" + date + ".txt was saved!");
    });
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
    secure: true
});

// Star the app server
var port = serverconfig.serverinfo.port;
server.listen(port, function () {
    // Wir geben einen Hinweis aus, dass der Webserer läuft.

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
    }
    else if (serverconfig.serverroles["1111"].token.length > 0) {
        Logger.info(`To obtain the admin role in your server, copy the following token.`);
        Logger.info(`You can use it if prompted or if you right click on the server icon and press "Redeem Key"`);

        Logger.info(colors.cyan(`Available Server Admin Token(s):`));

        serverconfig.serverroles["1111"].token.forEach(token => {
            if (token) Logger.info(token)
        })
        allowLogging = true;
    }

});

app.use(express.urlencoded({ extended: true })); // Parses URL-encoded data
app.use(express.json()); // Parses JSON bodies

// stupid bs
/*
app.get('*', (req, res) => {
    const { group, category, channel } = req.query;

    // Determine the file path
    let filePath = path.join(__dirname, 'public', req.path);

    // Default to index.html for the root path or requests without extensions
    if (req.path === '/' || path.extname(req.path) === '') {
        filePath = path.join(__dirname, 'public', 'index.html');
    }

    // Check if the request is for the main HTML template
    if (filePath.endsWith('index.html')) {
        // Proceed only if at least one query parameter is present
        if (!group && !category && !channel) {
            console.log("No relevant query parameters found. Ignoring request.");
        }


        // Define placeholders and their replacements
        const placeholders = [
            ["meta.page.title", () => getMetaTitle(group, category, channel)],
            ["category", () => category || "No Category Provided"],
            ["channel", () => channel || "No Channel Provided"],
        ];

        // Template rendering function
        function renderTemplate(template) {
            return template.replace(/{{\s*([^{}\s]+)\s*}}/g, (match, key) => {
                const placeholder = placeholders.find(([name]) => name === key);
                return placeholder ? placeholder[1]() : ""; // Replace with function result or empty string
            });
        }

        // Read and render the index.html template
        return fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err.message);
                return res.status(404).send('File not found');
            }

            const renderedContent = renderTemplate(data);
            res.send(renderedContent);
        });
    }

    // Serve other static files (CSS, JS, images, etc.)
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error("Error serving file:", err.message);
            return res.status(404).send('File not found');
        }

        // Set the appropriate content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            // Text files
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.csv': 'text/csv',
        
            // Image files
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.ico': 'image/x-icon',
        
            // Font files
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.otf': 'font/otf',
            '.eot': 'application/vnd.ms-fontobject',
        
            // Audio files
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
        
            // Video files
            '.mp4': 'video/mp4',
            '.mkv': 'video/x-matroska',
            '.webm': 'video/webm',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
        
            // Document files
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        
            // Archive files
            '.zip': 'application/zip',
            '.rar': 'application/vnd.rar',
            '.7z': 'application/x-7z-compressed',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip',
        
            // Other
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.yaml': 'text/yaml',
            '.yml': 'text/yaml',
            '.bin': 'application/octet-stream',
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.send(data);
    });
});


function getMetaTitle(groupId, categoryId, channelId){
    if(groupId && categoryId && channelId){
        return `Chat in #${serverconfig.groups[groupId].channels.categories[categoryId].channel[channelId].name}`
    }
}
*/

app.use(express.static(__dirname + '/public'));


// Process plugins at server start
processPlugins().catch(err => console.error(err));







/* Modular Socket events */
const socketHandlers = [];
const activeSockets = new Map(); // Track socket handlers by socket ID

// **Load Handlers Once at Startup**
const loadSocketHandlers = async (mainHandlersDir) => {
    try {
        const scanDir = (dir) => {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                const filePath = path.join(dir, file.name);
                if (file.isDirectory()) {
                    scanDir(filePath); // Recursive call for subdirectories
                } else if (file.name.endsWith('.mjs')) {
                    fileList.push(filePath);
                }
            }
        };

        const fileList = [];
        scanDir(mainHandlersDir);

        for (const filePath of fileList) {
            const fileUrl = pathToFileURL(filePath).href;
            try {
                const { default: handler } = await import(fileUrl);
                socketHandlers.push(handler);
                Logger.debug(`Preloaded socket handler: ${fileUrl}`);
            } catch (err) {
                Logger.error(`Error importing socket handler: ${fileUrl}`);
                Logger.error(err)
            }
        }
    } catch (err) {
        Logger.error("Error loading socket handlers:");
        Logger.error(err)
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
        await loadSocketHandlers(path.join(__dirname, 'modules/sockets'));
    } catch (err) {
        console.error("Critical error loading socket handlers:", err);
    }
})();



// === Ab hier folgt der Code für den Chat-Server

// Hier sagen wir Socket.io, dass wir informiert werden wollen,
// wenn sich etwas bei den Verbindungen ("connections") zu
// den Browsern tut.
io.on('connection', function (socket) {

    /*
        Improved socket handler
        Old one caused memory leak
    */
    //Logger.info(`New socket connected: ${socket.id}`);
    registerSocketEvents(socket);

    socket.on('disconnect', () => {
        //Logger.info(`Socket ${socket.id} disconnected, cleaning up handlers...`);
        if (activeSockets.has(socket.id)) {
            activeSockets.get(socket.id).forEach((cleanup) => cleanup());
            activeSockets.delete(socket.id); // Remove socket entry
        }
    });

    // For now to ignore proof of work, is buggy    
    powVerifiedUsers.push(socket.id);

    // Check if user ip is blacklisted
    var ip = socket.handshake.address;
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
        }
        else if (Date.now() > serverconfig.ipblacklist[ip]) {
            unbanIp(socket);
        }
    }

});

// Function to initialize and read the file into memory
function initConfig(filePath) {
    try {
        // Open the file in read-write mode
        fileHandle = fs.openSync(filePath, "r+");
        const fileContent = fs.readFileSync(filePath, { encoding: "utf-8" });
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
    serverconfig = JSON.parse(fs.readFileSync("./config.json", { encoding: "utf-8" }));
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