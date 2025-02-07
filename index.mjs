// express und http Module importieren. Sie sind dazu da, die HTML-Dateien
// aus dem Ordner "public" zu veröffentlichen.


console.clear();

import { createRequire } from "module";
const require = createRequire(import.meta.url)

var express = require('express');
export var app = express();

export var https = require('https');
export var http = require('http');
export const fs = require("fs");
import fse from 'fs-extra';  // Use fs-extra for easy directory copying
export const path = require('path');
export const mysql = require("mysql2/promise")
export const sanitizeHtml = require("sanitize-html")
export const bcrypt = require('bcrypt');

// Depending on the SSL setting, this will switch.
// Localhost Implementation
export var server; // = require('http').createServer(app)


var FormData = require('form-data');
export const fetch = require('node-fetch')
const getSize = require('get-folder-size');

import { fileTypeFromBuffer } from 'file-type';
export var XMLHttpRequest = require('xhr2');

export const colors = require('colors');
export var request = require('request');

export var xssFilters = require('xss-filters');
const crypto = require('crypto');

import Logger from "./modules/functions/logger.mjs";


var checkedMediaCacheUrls = {};
export var usersocket = []
export var loginAttempts = [];
var userOldRoom = {}
var peopleInVC = {}
var showedOfflineMessage = [];
export var powVerifiedUsers = [];

var typingMembers = [];
var typingMembersTimeout = [];

export var ratelimit = [];
var socketToIP = [];

export var allowLogging = false;
export var debugmode = false;
export var versionCode = 419;


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
    getUserBadges
} from "./modules/functions/chat/helper.mjs";

import {
    getMediaUrlFromCache,
    cacheMediaUrl,
    checkMediaTypeAsync,
    isURL,
    deleteChatMessagesFromDb,
    getChatMessagesFromDb,
    decodeFromBase64,
    leaveAllRooms
} from "./modules/functions/mysql/helper.mjs"


import {
    checkAndCreateTable,
    queryDatabase
} from "./modules/functions/mysql/mysql.mjs";

import { fileURLToPath, pathToFileURL } from "url";
import { channel } from "diagnostics_channel";





/*
   Internally used files
*/
// Directory where handler files are located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainHandlersDir = path.join(__dirname, 'modules/sockets');

// Function to dynamically load and register socket event handlers
const registerSocketEvents = async (socket) => {
    const files = fs.readdirSync(mainHandlersDir);
    for (const file of files) {
        if (file.endsWith('.mjs')) {
            const filePath = path.join(mainHandlersDir, file);
            const fileUrl = pathToFileURL(filePath).href;
            const { default: handler } = await import(fileUrl);
            handler(socket);
        }
    }
};




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
export var io = require('socket.io')(server, {
    maxHttpBufferSize: 1e8,
    secure: true
});



// Star the app server
var port = process.env.PORT || serverconfig.serverinfo.port;
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

// === Ab hier folgt der Code für den Chat-Server

// Hier sagen wir Socket.io, dass wir informiert werden wollen,
// wenn sich etwas bei den Verbindungen ("connections") zu
// den Browsern tut.
io.on('connection', function (socket) {

    // Register internal socket event handlers
    registerSocketEvents(socket).catch(err => console.error(err));


    // For now to ignore proof of work
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

            Logger.Debug("Disconnected user because ip is blacklisted");
        }
        else if (Date.now() > serverconfig.ipblacklist[ip]) {
            unbanIp(socket);
        }
    }

    // Send a PoW challenge to the client
    socket.on('requestPow', () => {
        const challenge = crypto.randomBytes(16).toString('hex');
        socket.emit('powChallenge', { challenge, difficulty: powDifficulty });
    });

    // Verify the PoW solution
    socket.on('verifyPow', ({ challenge, solution }) => {
        if (isValidProof(challenge, solution)) {

            if (!powVerifiedUsers.includes(socket.id)) {
                powVerifiedUsers.push(socket.id);
            }

            console.log('Client authenticated');
            socket.emit('authSuccess', { message: 'Authenticated' });
        } else {
            console.log('Client failed to authenticate');
            socket.emit('authFailure', { message: 'Failed to authenticate' });
        }
    });

    function isValidProof(challenge, solution) {
        const hash = crypto.createHash('sha256').update(challenge + solution).digest('hex');
        return hash.substring(0, powDifficulty) === Array(powDifficulty + 1).join('0');
    }



    function getDateDayDifference(timestamp1, timestamp2, mode = null) {
        var difference = timestamp1 - timestamp2;
        var daysDifference = Math.round(difference / 1000 / 60 / 60 / 24);

        return daysDifference;
    }

    // WebRTC tests
    socket.on('join', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);

        socket.on('disconnect', () => {
            if (powVerifiedUsers.includes(socket.id)) {
                powVerifiedUsers.pop(socket.id);
            }

            socket.to(roomId).emit('user-disconnected', socket.id);
        });

        socket.on('leave', (roomId) => {
            socket.leave(roomId);
            socket.to(roomId).emit('user-disconnected', socket.id);
        });

        socket.on('offer', (data) => {
            io.to(data.target).emit('offer', {
                sender: socket.id,
                offer: data.offer
            });
        });

        socket.on('answer', (data) => {
            io.to(data.target).emit('answer', {
                sender: socket.id,
                answer: data.answer
            });
        });

        socket.on('candidate', (data) => {
            io.to(data.target).emit('candidate', {
                sender: socket.id,
                candidate: data.candidate
            });
        });

        socket.on('audio', (data) => {
            socket.to(roomId).emit('audio', data);
        });
    });


    socket.on('userConnected', async function (member, response) {


        member.id = xssFilters.inHTMLData(member.id)
        member.name = xssFilters.inHTMLData(member.name)
        member.loginName = xssFilters.inHTMLData(member.loginName)
        member.status = xssFilters.inHTMLData(member.status)
        member.aboutme = xssFilters.inHTMLData(member.aboutme)
        member.icon = xssFilters.inHTMLData(member.icon)
        member.banner = xssFilters.inHTMLData(member.banner)
        member.token = xssFilters.inHTMLData(member.token)
        member.onboarding = xssFilters.inHTMLData(member.onboarding) === "true";
        member.password = xssFilters.inHTMLData(member.password) || null;
        member.group = xssFilters.inHTMLData(member.group);
        member.category = xssFilters.inHTMLData(member.category);
        member.channel = xssFilters.inHTMLData(member.channel);
        member.room = xssFilters.inHTMLData(member.room);

        //var ip = socket.handshake.headers["x-real-ip"];
        //var port = socket.handshake.headers["x-real-port"];

        // check member ban
        let banResult = checkMemberBan(socket, member);
        let banText = "";
        if (banResult?.timestamp) {
            if (new Date(banResult.timestamp).getFullYear() == "9999") {
                banText = "banned permanently";
            }
            else {
                banText = `banned until <br>${formatDateTime(new Date(banResult.timestamp))}`
            }
        }

        if (banResult?.reason) {
            banText += `<br><br>Reason:<br>${banResult.reason}`
        }

        if (banResult.result == true) {
            response({ error: `You've been ${banText}`, type: "error", msg: `You've been ${banText}`, msgDisplayDuration: 1000 * 60 })
            socket.disconnect();
            return;
        }

        // call checkMemberMute so it unmutes automatically
        checkMemberMute(socket, member);

        Logger.debug(`Member connected. User: ${member.name} (${member.id} - ${socketToIP[socket]})`);

        // Check if member is in default role
        if (serverconfig.serverroles["0"].members.includes(member.id) == false) {
            serverconfig.serverroles["0"].members.push(member.id);
            saveConfig(serverconfig);
        }

        if (member.id.length == 12 && isNaN(member.id) == false) {
            usersocket[member.id] = socket.id;

            // if new member
            if (serverconfig.servermembers[member.id] == null) {
                // New Member joined the server

                // handle onboarding 
                if (member.onboarding === false) {
                    // cant proceed as the user needs to setup their account with a password
                    io.to(socket.id).emit("doAccountOnboarding");
                    response({
                        error: "Onboarding not completed",
                        finishedOnboarding: false,
                        msg: "Welcome!",
                        text: "Finish your account setup to continue",
                        type: "success"
                    })
                    return;
                }

                var userToken = generateId(48);

                // setup member
                serverconfig.servermembers[member.id] = JSON.parse(
                    `{
                              "id": ${member.id},
                              "token": "${userToken}",
                              "loginName": "${member.loginName}",
                              "name": "${member.name}",
                              "nickname": null,
                              "status": "${member.status}",
                              "aboutme": "${member.aboutme}",
                              "icon": "${member.icon}",
                              "banner": "${member.banner}",
                              "joined": ${new Date().getTime()},
                              "isOnline": 1,
                              "lastOnline": ${new Date().getTime()},
                              "isBanned": 0,
                              "isMuted": 0,
                              "password": "${await hashPassword(member.password)}"
                            }
                        `);
                saveConfig(serverconfig);

                try {
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Welcome ${serverconfig.servermembers[member.id].name} <3",
                        "message": "",
                        "buttons": {
                            "0": {
                                "text": "Saved!",
                                "events": "refreshValues()"
                            }
                        },
                        "action": "register",
                        "token": "${serverconfig.servermembers[member.id].token}",
                        "icon": "${serverconfig.servermembers[member.id].icon}",
                        "banner": "${serverconfig.servermembers[member.id].banner}",
                        "status": "${serverconfig.servermembers[member.id].status}",
                        "aboutme": "${serverconfig.servermembers[member.id].aboutme}",
                        "type": "success"
                    }`));
                }
                catch (e) {
                    consolas("Error on token message sending".red, "Debug");
                    consolas(e, "Debug");
                }

                // create copy of server member without token
                var castingMember = copyObject(serverconfig.servermembers[member.id]);
                delete castingMember.token;
                delete castingMember.password;

                // Save system message to the default channel
                castingMember.group = resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel);
                castingMember.category = resolveCategoryByChannelId(serverconfig.serverinfo.defaultChannel);
                castingMember.channel = serverconfig.serverinfo.defaultChannel;
                castingMember.room = `${resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel)}-${resolveCategoryByChannelId(serverconfig.serverinfo.defaultChannel)}-${serverconfig.serverinfo.defaultChannel}`;

                castingMember.timestamp = new Date().getTime();
                castingMember.messageId = generateId(12);
                castingMember.isSystemMsg = true;

                castingMember.message = `${member.name} joined the server!</label>`;
                saveChatMessage(castingMember);

                io.emit("updateMemberList");

                // Save System Message and emit join event
                io.emit("newMemberJoined", castingMember);

                response({ finishedOnboarding: true })
            }
            else {

                if (member.token == null || member.token.length != 48 ||
                    serverconfig.servermembers[member.id].token == null ||
                    serverconfig.servermembers[member.id].token != member.token) {


                    try {
                        response({ error: "Invalid login", title: "Invalid Login", msg: "Something went wrong with your login.<br><a onclick='UserManager.resetAccount();'>Reset Session</a><br>", type: "error", displayTime: 1000 * 60 * 60 })
                        return;
                    }
                    catch (e) {
                        consolas("Error on error message sending".red, "Debug");
                        consolas(e, "Debug");
                    }


                    consolas("User did not have a valid token.", "Debug");

                    response({ error: "Invalid Token", finishedOnboarding: true })
                    socket.disconnect();
                    return;
                }

                usersocket[member.id] = socket.id;

                serverconfig.servermembers[member.id].name = escapeHtml(member.name);
                serverconfig.servermembers[member.id].status = escapeHtml(member.status);
                serverconfig.servermembers[member.id].aboutme = escapeHtml(member.aboutme);
                serverconfig.servermembers[member.id].icon = escapeHtml(member.icon);
                serverconfig.servermembers[member.id].banner = escapeHtml(member.banner);
                serverconfig.servermembers[member.id].lastOnline = new Date().getTime();
                saveConfig(serverconfig);

                if (serverconfig.servermembers[member.id].isOnline == 0) {
                    // Member is back online
                    serverconfig.servermembers[member.id].isOnline = 1;

                    var lastOnline = serverconfig.servermembers[member.id].lastOnline / 1000;

                    var today = new Date().getTime() / 1000;
                    var diff = today - lastOnline;
                    var minutesPassed = Math.round(diff / 60);


                    if (minutesPassed > 5) {
                        io.emit("updateMemberList");
                        io.emit("memberOnline", member);
                    }
                }
                else {
                    io.emit("updateMemberList");
                    io.emit("memberPresent", member);
                }

                response({ finishedOnboarding: true })
            }
        }
        else {
            socket.disconnect();
            consolas("ID WAS WRONG ON USER JOIN ".red + member.id, "Debug");
        }
    });

    socket.on('userLogin', function (member, response) {
        member.id = xssFilters.inHTMLData(member.id)
        member.password = xssFilters.inHTMLData(member.password)
        member.name = xssFilters.inHTMLData(member.name)
        member.duration = 0.1;

        // Handling ip ban
        var ip = socket.handshake.address;
        if (serverconfig.ipblacklist.hasOwnProperty(ip)) {

            // if the ban has expired, unban them
            if (Date.now() > serverconfig.ipblacklist[ip]) {
                unbanIp(socket)
            }
        }

        // initiate login counter
        if (!loginAttempts.hasOwnProperty(ip)) {
            loginAttempts.push(ip);
            loginAttempts[ip] = 0;
        }

        // increase login counter
        loginAttempts[ip]++;

        // if count exceeded, temporarily ban ip and clean up
        if (loginAttempts[ip] > serverconfig.serverinfo.login.maxLoginAttempts) {
            banIp(socket, getNewDate(serverconfig.serverinfo.moderation.bans.ipBanDuration).getTime());
            delete loginAttempts[ip];

            response({ error: "You've been temporarily banned. Please try again later" })
            socket.disconnect();
            return;
        }
        console.log(loginAttempts[ip]);



        let loginCheck = findAndVerifyUser(member.loginName, member.password);

        if (loginCheck.result == true) {
            response({ error: null, member: loginCheck.member })

        }
        else if (loginCheck.result == false) {
            response({ error: "Invalid login" })
        }
        else {
            response({ error: "Account not found" })
        }
    });


    socket.on('joinedVC', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)
            member.lastActivity = xssFilters.inHTMLData(member.lastActivity)

            var memberTransmitObj = { id: member.id, name: serverconfig.servermembers[member.id].name, icon: serverconfig.servermembers[member.id].icon, room: member.room, lastActivity: member.lastActivity };

            if (peopleInVC[member.room] == null) peopleInVC[member.room] = {};
            peopleInVC[member.room][member.id] = memberTransmitObj;

            socket.to(member.room).emit("userJoinedVC", memberTransmitObj);
            socket.emit("userJoinedVC", memberTransmitObj);
        }
    });

    socket.on('leftVC', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)

            // User already left, so the room id wouldnt be correct anymore
            try { member.room = userOldRoom[member.id][0]; } catch { }


            try { delete peopleInVC[member.room][member.id] } catch (error) { }
            socket.to(member.room).emit("userLeftVC", { id: member.id, name: serverconfig.servermembers[member.id].name, icon: serverconfig.servermembers[member.id].icon, room: member.room });
        }
    });

    socket.on('getGroupStats', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            if (member.group == undefined || member.group == null) {
                response({ type: "error", msg: "No group id passed." })
                return;
            }

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)
            member.group = xssFilters.inHTMLData(member.group)


            let groupInfo = copyObject(serverconfig.groups[member.group]);


            const totalChannels = Object.keys(groupInfo.channels.categories).reduce((acc, category) => acc + Object.keys(groupInfo.channels.categories[category].channel).length, 0);

            groupInfo.channelCount = totalChannels;
            groupInfo.categoryCount = Object.keys(groupInfo.channels).length + 1;
            groupInfo.permissions = null;
            groupInfo.channels = null;

            // Get message count and username from database to show most active users;
            let totalGroupMessage = await queryDatabase(`SELECT authorId, COUNT(*) AS message_count
                                                            FROM messages
                                                            WHERE room LIKE '${member.group}-%'
                                                            GROUP BY authorId
                                                            ORDER BY message_count DESC
                                                            LIMIT 100;
                                                            `)

            // Add the user json object to the results so the client doesnt have to resolve each user
            for (let i = 0; i < totalGroupMessage.length; i++) {
                let serverMemberObj = serverconfig.servermembers[totalGroupMessage[i].authorId];
            
                if(serverMemberObj){
                    let userObj = copyObject(serverMemberObj); // Korrekt
                    userObj.token = null;
                    userObj.name = serverMemberObj.name;
                
                    totalGroupMessage[i].user = userObj;
                }
                else{
                    delete totalGroupMessage[i]
                }
            }
            response({ type: "success", msg: null, mostActiveUsers: totalGroupMessage, group: groupInfo })

        }
    });

    socket.on('checkMediaUrlCache', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (serverconfig.serverinfo.sql.enabled == false) {
                consolas(colors.yellow("Media Cache cannot be used when SQL is disabled!"), "Debug");
                consolas(colors.yellow("Consider setting up a mysql server to reduce server load and load time"), "Debug");
                response({ type: "success", isCached: false, mediaType: await checkMediaTypeAsync(member.url) });
                return;
            }

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            // Initialize the object
            if (!checkedMediaCacheUrls[member.url]) {
                checkedMediaCacheUrls[member.url] = {};
            }

            // if its not a url we dont want to process it
            if (!isURL(member.url)) {
                return;
            }


            if (checkedMediaCacheUrls[member.url].mediaType != null) {
                // Link was already sent in for check
                response({ type: "success", isCached: true, mediaType: checkedMediaCacheUrls[member.url].mediaType });
            }
            else {
                // check if link is cached
                let result = await getMediaUrlFromCache(member.url);

                if (result.length <= 0) {

                    // if its not cached, get media type by using a request
                    let urlMediaType = await checkMediaTypeAsync(member.url);

                    // if the media type isnt unknown
                    if (urlMediaType != "unkown" && urlMediaType != "error" && urlMediaType != null) {

                        // try to save the url in cache
                        let cacheResult = await cacheMediaUrl(member.url, urlMediaType);
                    }
                }
                else {
                    // Save in "internal" cache until program is restarted. 
                    // supposed to avoid multiple requests
                    checkedMediaCacheUrls[member.url].mediaType = result[0].media_type;
                    response({ type: "success", isCached: true, mediaType: result[0].media_type });
                }
            }



            response({ type: "error", isCached: false });
        }
    });

    socket.on('getVCMembers', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)

            Object.keys(peopleInVC[member.room]).forEach(function (memberId) {
                var user = peopleInVC[member.room][memberId];


                var lastOnline = user.lastActivity / 1000;

                var today = new Date().getTime() / 1000;
                var diff = today - lastOnline;
                var minutesPassed = Math.round(diff / 60);

                if (minutesPassed > 0) {
                    delete peopleInVC[member.room][memberId];
                }
            });


            response({ type: "success", vcMembers: peopleInVC[member.room] });
        }
    });

    socket.on('updateChannelTreeSorting', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.group = xssFilters.inHTMLData(member.group)
            member.data = xssFilters.inHTMLData(member.data)

            if (!hasPermission(member.id, "manageChannels")) {
                // secretly die cauz no need for error
                return;
            }

            let channelStructure = JSON.parse(member.data);


            //  categories are sorted numerically before assigning sortId
            let sortedCategories = Object.keys(serverconfig.groups[member.group].channels.categories)
                .map(id => parseInt(id))
                .sort((a, b) => a - b);

            // assign new sortId given by client
            sortedCategories.forEach((categoryId, index) => {

                if (serverconfig.groups[member.group].channels.categories[categoryId]) {
                    serverconfig.groups[member.group].channels.categories[categoryId].info.sortId = channelStructure[categoryId].info.sortId;
                } else {
                    Logger.error(`Category ${categoryId} not found in serverconfig`);
                }
            });

            saveConfig(serverconfig)

            Object.keys(channelStructure)
                .sort((a, b) => a - b) // ensure consistent sorting before assigning id
                .forEach((category, index) => {
                    let categoryChannels = channelStructure[category].channels;
                    let newCategoryId = category;

                    let totalChannels = categoryChannels.length;
                    categoryChannels.forEach((channelId, channelIndex) => {
                        let originalPath = findInJson(
                            serverconfig.groups[member.group].channels.categories,
                            "id",
                            parseInt(channelId),
                            true
                        );

                        let actualNewSortId = totalChannels - 1 - channelIndex; // reverse 

                        if (originalPath) {
                            let pathParts = originalPath.split(".");
                            let originalCategoryId = pathParts[0];

                            if (originalCategoryId !== newCategoryId) {
                                if (!serverconfig.groups[member.group].channels.categories[originalCategoryId]) {
                                    Logger.error(`Category ${originalCategoryId} does not exist!`);
                                    return;
                                }

                                let channelData = serverconfig.groups[member.group].channels.categories[originalCategoryId].channel[channelId];

                                if (channelData) {
                                    // remove from old category
                                    delete serverconfig.groups[member.group].channels.categories[originalCategoryId].channel[channelId];

                                    // ensure the new category has a `channel` object
                                    if (!serverconfig.groups[member.group].channels.categories[newCategoryId].channel) {
                                        serverconfig.groups[member.group].channels.categories[newCategoryId].channel = {};
                                    }

                                    // move the channel to the new category
                                    serverconfig.groups[member.group].channels.categories[newCategoryId].channel[channelId] = channelData;
                                } else {
                                    Logger.error(`Channel ${channelId} not found in category ${originalCategoryId}`);
                                    return;
                                }
                            }

                            //  Update sortId
                            serverconfig.groups[member.group].channels.categories[newCategoryId].channel[channelId].sortId = actualNewSortId;

                            saveConfig(serverconfig);
                        } else {
                            Logger.error(`Could not find original path for channel ${channelId}`);
                        }
                    });
                });

            io.emit("receiveChannelTree");

            response({ type: "success", error: null, msg: null });
        }
    });


    socket.on('messageSend', async function (memberOriginal) {
        checkRateLimit(socket);

        if (validateMemberId(memberOriginal.id, socket) == true
            && serverconfig.servermembers[memberOriginal.id].token == memberOriginal.token
        ) {

            // Remove token from cloned object so we dont broadcast it
            let member = copyObject(memberOriginal);

            // check member mute
            let muteResult = checkMemberMute(socket, member);
            let muteText = "";
            if (muteResult?.timestamp) {
                if (new Date(muteResult.timestamp).getFullYear() == "9999") {
                    muteText = "muted permanently";
                }
                else {
                    muteText = `muted until <br>${formatDateTime(new Date(muteResult.timestamp))}`
                }
            }
            if (muteResult?.reason) {
                muteText += `<br><br>Reason:<br>${muteResult.reason}`
            }
            if (muteResult.result == true) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                                    "title": "You have been ${muteText}",
                                    "message": "",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "error",
                                    "popup_type": "confirm"
                                }`));
                return;
            }

            if (isNaN(member.group) == true) {
                consolas("Group was not a number", "Debug");
                return;
            }
            if (isNaN(member.channel) == true) {
                consolas("Channel was not a number", "Debug");
                return;
            }
            if (isNaN(member.category) == true) {
                consolas("Category was not a number", "Debug");
                return;
            }
            if (member.message.length <= 0) {
                consolas("Message is shorter than 1 charachter", "Debug");
                return;
            }

            if (!hasPermission(member.id, ["sendMessages", "viewChannel"], member.channel)) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                                    "title": "You cant chat here",
                                    "message": "You cant send a message in this channel, sorry.",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "error",
                                    "popup_type": "confirm"
                                }`));

                return;
            }

            // Check if room exists
            try {
                if (serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel] != null) {

                    // bug
                    // editing message makes new id and timestamp
                    // fetch existing object and load it?
                    let messageid = generateId(12);
                    member.timestamp = new Date().getTime();
                    member.messageId = messageid;

                    member.icon = escapeHtml(member.icon);
                    member.name = escapeHtml(member.name);

                    member.message = sanitizeInput(member.message);
                    member.message = convertMention(member.message);

                    // replace empty lines
                    const regex = /<p\s+id="msg-\d+">\s*<br\s*\/?>\s*<\/p>/g;
                    member.message = member.message.replaceAll(regex, '').replaceAll(/<p\s+id="msg-\d+">\s*<\/p>/g, "<p id='msg-" + messageid + "'><br></p>")

                    if (member.message.replaceAll(" ", "") == null) {
                        consolas(colors.red("Message was null"))
                        return
                    }

                    var emptyMessageContent = member.message.replaceAll(" ", "").replaceAll("<p>", "").replaceAll("</p>", "").replaceAll(/^\uFEFF/g, '');

                    if (emptyMessageContent == "") {
                        console.log("Message was empty")
                        return;
                    }


                    // Get Emojis (only works with one)
                    //const emojiCode = getEmojiCode(member.message, ':', ':');
                    //console.log("Emoji Code was " + emojiCode)


                    /*
                    The following performs the same replace function with the only
                    difference to check if any text is left after converting the emojis.
                    If not, make the emoji bigger if no text is present.
                     */

                    var reg = /(:)\w+/ig;
                    var sendBigEmoji = "";
                    member.message.replace(reg, function (emoji) {
                        try {
                            var text = emptyMessageContent.replaceAll(emoji + ":", ``)

                            if (text.length == 0) {
                                sendBigEmoji = "big"
                            }
                        }
                        catch (err) {
                            consolas(colors.red("Emoji Convertion test error"));
                        }
                    });

                    /* DEPRECATED
                    try {
                        // Actually replaces the text with the emoji and displays it
                        member.message.replace(reg, function (emoji) {

                            var emojiName = findEmojiByID(emoji.replaceAll(":", "")).split("_")[2].split(".")[0];
                            member.message = member.message.replaceAll(emoji + ":", `<span><img title="${emojiName}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${findEmojiByID(emoji.replaceAll(":", ""))}"></span>`);
                        });
                    }
                    catch {

                    }*/

                    // Display role color of the highest role
                    var userRoleArr = [];
                    Object.keys(serverconfig.serverroles).forEach(function (role) {

                        if (serverconfig.serverroles[role].members.includes(member.id) &&
                            serverconfig.serverroles[role].info.displaySeperate == 1) {
                            userRoleArr.push(serverconfig.serverroles[role]);
                        }
                    });

                    // Show user color in highest role
                    userRoleArr = userRoleArr.sort((a, b) => {
                        if (a.info.sortId > b.info.sortId) {
                            return -1;
                        }
                    });
                    member.color = userRoleArr[0].info.color;


                    // If the message was edited
                    if (member.editedMsgId != null) {

                        // Get Original message
                        let room = `${member.group}-${member.category}-${member.channel}`
                        let originalMsg = await getChatMessagesFromDb(room, 1, member.editedMsgId);
                        let originalMsgObj = JSON.parse(decodeFromBase64(originalMsg[0].message));

                        // Check if the user who wants to edit the msg is even the original author lol
                        if (originalMsgObj.id != member.id) {
                            consolas(colors.red("Unauthorized user tried to edit another users message", "Debug"));
                            return;
                        }

                        // Update the data for editing
                        member.editedMsgId = member.editedMsgId.replaceAll("msg-", "")
                        member.lastEdited = new Date().toISOString();

                        // Update back to original values of the message timestamp etc
                        // Else "Created Timestamp" and "Edited" is always the same
                        member.timestamp = originalMsgObj.timestamp;
                        member.messageId = originalMsgObj.editedMsgId;
                    }

                    member = getCastingMemberObject(member);

                    // Save the Chat Message to file
                    saveChatMessage(member, member.editedMsgId);

                    // Remove user from typing
                    var username = serverconfig.servermembers[member.id].name;
                    if (typingMembers.includes(username) == true) {
                        typingMembers.pop(username);
                    }
                    io.in(member.room).emit("memberTyping", typingMembers);

                    // Send message or update old one
                    if (member.editedMsgId == null) {
                        // New message
                        io.in(member.room).emit("messageCreate", member);
                        io.emit("markChannelMessage", { group: member.group, category: member.category, channel: member.channel });
                    }
                    // emit edit event of msg
                    else {
                        io.in(member.room).emit("messageEdited", member);
                    }

                }
                else {
                    consolas("Couldnt find message channel", "Debug");

                    var msg = `We were unable to send the message because the 
                    channel wasnt found. Maybe it was deleted? Reselect a channel from the channel list`.replaceAll("\n", "");

                    sendMessageToUser(usersocket[member.id], JSON.parse(
                        `{
                        "title": "Channel not found",
                        "message": "${msg}",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "success",
                        "popup_type": "confirm"
                    }`));
                }
            }
            catch (err) {
                consolas("Couldnt send message because room didnt exist".yellow, "Debug");
                consolas(`Group was ${member.group}`.yellow, "Debug");
                consolas(`Category  was ${member.category}`.yellow, "Debug");
                consolas(`Channel was ${member.channel}`.yellow, "Debug");
                consolas("Error");
                console.log(err);


                var msg = `We were unable to send the message because the 
                channel wasnt found. Maybe it was deleted? Reselect a channel from the channel list`.replaceAll("\n", "");

                sendMessageToUser(usersocket[member.id], JSON.parse(
                    `{
                        "title": "Channel not found",
                        "message": "${msg}",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "success",
                        "popup_type": "confirm"
                    }`));
                return;
            }
        }
        else {
            consolas("Cant send message because member id wasnt valid".red, "Debug");
            consolas("ID: " + member.id, "Debug");
        }
    });

    socket.on('redeemKey', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.value = xssFilters.inHTMLData(member.value);

            consolas(`User ${serverconfig.servermembers[member.id].name} (${serverconfig.servermembers[member.id].id}) is trying to redeem a role using the following key:`, "Debug")
            consolas(`${member.value}`, "Debug")

            var roles = serverconfig.serverroles;
            var foundTokenInRole = false;
            var alreadyInRole = false;

            Object.keys(roles).forEach(function (roleId) {
                var role = roles[roleId];

                if (role.token.includes(member.value)) {

                    // If the member already is in that role we want to deny it
                    if (role.members.includes(member.id)) {
                        alreadyInRole = true;
                        return; // https://youtu.be/WUOtCLOXgm8?si=XRe4XUStDBm_D95O&t=39
                    }


                    try {
                        role.members.push(member.id)
                        role.token.pop(member.value);
                        saveConfig(serverconfig);

                        foundTokenInRole = true;

                        consolas(`User ${serverconfig.servermembers[member.id].name} (${serverconfig.servermembers[member.id].id}) redeemed the role ${role.info.name} (${roleId}) with the following key`, "Log")
                        consolas(`${member.value}`, "Log")

                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                            "title": "${role.info.name} redeemed!",
                            "message": "",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "closeModal();"
                                }
                            },
                            "type": "success",
                            "popup_type": "confirm"
                        }`));

                        io.emit("updateMemberList");
                    }
                    catch (e) {

                        console.log("Couldnt redeem key".red)
                        console.log(colors.red(e));

                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                        "title": "Couldnt redeem key",
                        "message": "A unkown error occured",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": "closePrompt();"
                            }
                        },
                        "popup_type": "confirm",
                        "type": "error"
                    }`));
                    }
                }
            });

            // Only show message if all loops failed
            if (foundTokenInRole == false) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Wrong key!",
                        "message": "The key you've entered was wrong",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "popup_type": "confirm",
                        "type": "error"
                    }`));
            }

            if (alreadyInRole) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "You cant use this key anymore.",
                            "message": "You are already part of this role!",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "closePrompt();"
                                }
                            },
                            "type": "success",
                            "popup_type": "confirm"
                        }`));
            }
        }
    });


    socket.on('getChannelTree', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.group = xssFilters.inHTMLData(member.group)

            if (!hasPermission(member.id, "viewGroup", member.group)) {
                return;
            }

            response({ type: "success", data: getChannelTree(member) });
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });

    socket.on('getUserFromId', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {
            response({ type: "success", user: getCastingMemberObject(serverconfig.servermembers[member.target]) });
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });

    socket.on('getAllRoles', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {
            if (!hasPermission(member.id, "manageRoles", member.group)) {
                return;
            }

            var highestRole = getMemberHighestRole(member.id);


            var roles = serverconfig.serverroles;
            var sortIndex = 0;
            var returnRole = [];

            let sortedRoles = Object.keys(roles).sort((a, b) => {
                return roles[b].info.sortId - roles[a].info.sortId
            });

            sortedRoles = sortedRoles.reverse().map((key) => roles[key]);



            // Only returns roles that are can be assigned
            Object.keys(sortedRoles).reverse().forEach(function (role) {
                //console.log(roles[role].info.name)

                if (sortedRoles[role].info.sortId < highestRole.info.sortId || hasPermission(member.id, "administrator", member.group)) {
                    sortIndex = sortedRoles[role].info.sortId;

                    if (sortedRoles[role].members.includes(member.targetUser)) {
                        sortedRoles[role].info.hasRole = 1;
                    }
                    else {
                        sortedRoles[role].info.hasRole = 0;
                    }

                    // Get Highest role of user doing it
                    var executer = getMemberHighestRole(member.id);

                    // Only let people show roles they can actually assign
                    if (sortedRoles[role].info.sortId < executer.info.sortId && role != 0 && role != 1) {
                        returnRole.push(sortedRoles[role]);
                    }
                }
            });



            io.emit("updateMemberList");
            response({ type: "success", data: returnRole });
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });







    socket.on('searchTenorGif', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.search = xssFilters.inHTMLData(member.search)

            if (serverconfig.serverinfo.tenor.enabled != 1) {
                response({ type: "error", msg: "GIFs are disabled on this server" });
            }
            else {
                response({ type: "success", msg: "Trying to search GIF" });
            }

            searchTenor(member.search, member.id);
            consolas("Searching for " + member.search)
        }
    });

    socket.on('deleteEmoji', function (member, response) {
        checkRateLimit(socket);

        member.id = xssFilters.inHTMLData(member.id)
        member.token = xssFilters.inHTMLData(member.token)
        member.emoji = xssFilters.inHTMLData(member.emoji)
        if (member.emoji.includes("..")) return;

        if (validateMemberId(member.id, socket) == true
        ) {

            if (hasPermission(member.id, "manageEmojis")) {
                try {

                    try {
                        if (member.emoji.includes("..")) return

                        fs.unlinkSync(`./public/emojis/${member.emoji}`);
                        response({ type: "success", msg: "Emoji deleted successfully" });

                    } catch (error) {
                        consolas("Coudlnt delete emoji", "Debug")
                        consolas(error, "Debug")

                        response({ type: "error", msg: "Cant Delete Emoji", error: error });
                    }
                }
                catch (e) {
                    consolas("Unable to resolve member".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "You dont have permissions to manage emojis" });
            }
        }
    });

    socket.on('resolveMember', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if (hasPermission(member.id, "resolveMembers")) {
                try {

                    var resolved = copyObject(serverconfig.servermembers[member.target]);
                    resolved.token = null;

                    response({ type: "success", msg: "User Data was resolved", data: resolved });
                }
                catch (e) {
                    consolas("Unable to resolve member".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('unmuteUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if (hasPermission(member.id, "muteUsers")) {

                if (serverconfig.mutelist.hasOwnProperty(member.target)) {
                    delete serverconfig.mutelist[member.target];
                    //response({type: "success", msg: `The user ${serverconfig.servermembers[member.target].name} has been unmuted` });
                }
                else {
                    //response({type: "error", msg: `The user ${serverconfig.servermembers[member.target].name} isnt muted` });
                }


                serverconfig.servermembers[member.target].isMuted = 0;
                saveConfig(serverconfig);

                io.emit("updateMemberList");
            }
            else {
                //response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('unbanUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.duration = xssFilters.inHTMLData(member.duration)

            if (hasPermission(member.id, "manageBans")) {
                try {

                    serverconfig.servermembers[member.target].isBanned = 0;
                    delete serverconfig.banlist[member.target];
                    saveConfig(serverconfig);

                    response({ type: "success", msg: `The user ${serverconfig.servermembers[member.target].name} has been unbanned` });
                }
                catch (e) {
                    response({ type: "error", msg: `User couldnt be unbanned` });
                    consolas("Unable to resolve member".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "You arent allowed to unban members" });
            }
        }
    });

    socket.on('addUserToRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.target = xssFilters.inHTMLData(member.target)

            if (hasPermission(member.id, "manageMembers")) {
                try {
                    //var highestUserRole = getMemberHighestRole(member.id);

                    // If user is not a admin they cant assign roles that are higher
                    //if(!hasPermission(member.id, "administrator")){
                    //    if(serverconfig.serverroles[member.role].info.sortId >= highestUserRole.info.sortId){
                    //        response({type: "error", msg: "You cant assign roles that are higher or equal then yours"});
                    //        return;
                    //    }
                    //}

                    var executer = getMemberHighestRole(member.id);
                    var targetRole = serverconfig.serverroles[member.role];

                    if (executer.info.sortId <= targetRole.info.sortId) {
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                    "title": "Error!",
                                    "message": "You cant assign this role because the role is higher or equal yours",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "success",
                                    "popup_type": "confirm"
                                }`));
                        return;
                    }

                    serverconfig.serverroles[member.role].members.push(member.target);
                    saveConfig(serverconfig);

                    io.emit("updateMemberList");
                    io.to(usersocket[member.target]).emit("updateMemberList");
                    response({ type: "success", msg: "Role assigned" });

                }
                catch (e) {
                    consolas("Unable to add member to group".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('removeUserFromRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.target = xssFilters.inHTMLData(member.target)

            if (hasPermission(member.id, "manageMembers")) {
                try {


                    // If user is not a admin they cant assign roles that are higher
                    if (serverconfig.serverroles[member.role].info.sortId >= highestUserRole.info.sortId) {
                        if (!hasPermission(member.id, "administrator")) {
                            response({ type: "error", msg: "You cant remove roles that are higher or equal then yours" });
                            return;
                        }
                    }


                    var executer = getMemberHighestRole(member.id);
                    var target = getMemberHighestRole(member.target);


                    if (executer.info.sortId <= target.info.sortId) {
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                    "title": "Error!",
                                    "message": "You cant remove this role because its higher or equal then yours",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "success",
                                    "popup_type": "confirm"
                                }`));
                        return;
                    }

                    // Default Roles
                    if (serverconfig.serverroles[member.role].info.id == 0 || serverconfig.serverroles[member.role] == 1) {
                        return;
                    }

                    serverconfig.serverroles[member.role].members.pop(member.target);
                    saveConfig(serverconfig);


                    io.emit("updateMemberList");
                    io.to(usersocket[member.target]).emit("updateMemberList");
                    response({ type: "success", msg: "Role removed" });
                }
                catch (e) {
                    consolas("Unable to remove member from group".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('saveRolePermissions', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.permissions = JSON.parse(xssFilters.inHTMLData(JSON.stringify(member.permissions)))

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    serverconfig.serverroles[member.role].permissions = member.permissions;
                    saveConfig(serverconfig);

                    io.emit("updateMemberList");
                    response({ type: "success", msg: "Role permissions have been updated" });
                }
                catch (e) {
                    consolas("Unable to update permissions from role".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('saveChannelPermissions', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if (hasPermission(member.id, "manageChannels")) {
                try {
                    //console.log(member.role);

                    var memberChannel = member.channel.replace("channel-", "");

                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role] = member.permission;
                    saveConfig(serverconfig);

                    io.emit("receiveChannelTree");
                    response({ type: "success", msg: "Channel permissions have been updated" });
                }
                catch (e) {
                    consolas("Unable to update channel permissions from role".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('removeRoleFromChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageChannels")) {
                try {

                    var memberChannel = member.channel.replace("channel-", "");

                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    delete serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role];
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was successfully removed from the channel" });
                }
                catch (e) {
                    consolas("Unable to remove role from channel".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('addRoleToChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageChannels")) {
                try {

                    var memberChannel = member.channel.replace("channel-", "");

                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role] = JSON.parse
                        (
                            `
                        {
                            "readMessages": 1,
                            "sendMessages": 1
                        }
                        `
                        );
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was successfully removed from the channel" });
                }
                catch (e) {
                    consolas("Unable to add role to channel".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('addRoleToGroup', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageGroups")) {
                try {


                    serverconfig.groups[member.group].permissions[member.role] = JSON.parse(
                        `
                        {
                            "viewGroup": 1
                        }
                        `
                    )
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was successfully added to the group" });
                }
                catch (e) {
                    consolas("Unable to add role to group".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('removeRoleFromGroup', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageGroups")) {
                try {


                    delete serverconfig.groups[member.group].permissions[member.role];
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was successfully removed from the group" });
                }
                catch (e) {
                    consolas("Unable to remove role to group".red);
                    console.log(colors.red(e));
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('updateRoleHierarchy', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    var sortedRoles = member.sorted.reverse();

                    for (let i = 0; i < sortedRoles.length; i++) {
                        var roleId = sortedRoles[i];
                        serverconfig.serverroles[roleId].info.sortId = i;
                    }

                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was updated successfully" });
                }
                catch (e) {
                    consolas("Unable to sort roles".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('updateRoleAppearance', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    serverconfig.serverroles[member.roleId].info.name = member.data.info.name;
                    serverconfig.serverroles[member.roleId].info.color = member.data.info.color;
                    serverconfig.serverroles[member.roleId].info.displaySeperate = member.data.info.displaySeperate;

                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was updated successfully" });

                    // Update to everyone and yourself
                    io.emit("updateMemberList");
                    io.to(usersocket[member.id]).emit("updateMemberList");
                }
                catch (e) {
                    consolas("Unable to sort roles".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on('createRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    var roleid = generateId(4);

                    serverconfig.serverroles[roleid] = JSON.parse(
                        `{
                                "info": {
                                    "id": ${roleid},
                                    "name": "New Role",
                                    "icon": null,
                                    "color": "#FFFFFF",
                                    "deletable": 1,
                                    "sortId": ${generateId(4)},
                                    "displaySeperate": 0
                                },
                                "permissions": {
                                    "readMessages": 1,
                                    "sendMessages": 1,
                                    "uploadFiles": 1
                                },
                                "members": [
                                ],
                                "token": []
                            }`
                    );

                    saveConfig(serverconfig);

                    response({ type: "success", msg: "The role has been successfully created" });
                }
                catch (e) {
                    consolas("Unable to create role".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", permission: "denied" });
            }


        }
        else {
            consolas("Token or ID incorrect");
        }
    });

    socket.on('deleteRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRoles")) {
                try {

                    if (serverconfig.serverroles[member.roleId].info.deletable == 1) {
                        delete serverconfig.serverroles[member.roleId];
                        saveConfig(serverconfig);

                        response({ type: "success", msg: "The role has been successfully deleted" });
                    }
                    else {
                        response({ type: "error", msg: "This role cant be deleted" });
                    }
                }
                catch (e) {
                    consolas("Unable to delete role".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }


        }
        else {
            consolas("Token or ID incorrect");
        }
    });

    socket.on('checkChannelPermission', function (member, response) {
        if (validateMemberId(member.id, socket) == true) {

            member.id = xssFilters.inHTMLData(member.id);
            member.token = xssFilters.inHTMLData(member.token);
            member.permission = xssFilters.inHTMLData(member.permission);
            member.channel = xssFilters.inHTMLData(member.channel);

            var userObj = getCastingMemberObject(serverconfig.servermembers[member.id]);

            if (Array.isArray(member.permission)) {

                //console.log("Checking for multiple permissions");

                var found = false;
                for (var i = 0; i < member.permission.length; i++) {

                    //console.log(member.permission[i])

                    if (hasPermission(member.id, member.permission[i], member.channel)) {
                        found = true;
                        response({ type: "success", permission: "granted", user: userObj });
                    }
                    else {
                        // Dont do anything as it still loops
                    }
                }

                if (found == false) {
                    response({ type: "success", permission: "denied", user: userObj });
                }

            }
            else { // Single permission check

                if (hasPermission(member.id, member.permission, member.channel)) {
                    response({ type: "success", permission: "granted", user: userObj });
                } else {
                    response({ type: "success", permission: "denied", user: userObj });
                }
            }
        }
    });

    socket.on('checkPermission', function (member, response) {
        if (validateMemberId(member.id, socket) == true) {

            var userObj = getCastingMemberObject(serverconfig.servermembers[member.id]);

            if (Array.isArray(member.permission)) {

                //console.log("Checking for multiple permissions");

                var found = false;
                for (var i = 0; i < member.permission.length; i++) {

                    //console.log(member.permission[i])

                    if (hasPermission(member.id, member.permission[i])) {
                        found = true;
                        response({ permission: "granted", user: userObj });
                    }
                    else {
                        // Dont do anything as it still loops
                    }
                }

                if (found == false) {
                    response({ permission: "denied", user: userObj });
                }

            }
            else { // Single permission check

                //console.log("Checking for single permissions");
                //console.log(member.permission + " - " + hasPermission(member.id, member.permission));
                //console.log(" ")

                if (hasPermission(member.id, member.permission)) {
                    response({ permission: "granted", user: userObj });
                } else {
                    response({ permission: "denied", user: userObj });
                }
            }
        }
    });

    socket.on('kickUser', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (member.id == member.target) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "You cant kick yourself!",
                        "message": "",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }
            else {
                if (hasPermission(member.id, "kickUsers") == false) {

                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Missing permission!",
                        "message": "You cant kick that person.",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "success",
                        "popup_type": "confirm"
                    }`));
                }
                else {

                    var kicker = getMemberHighestRole(member.id);
                    var kicking = getMemberHighestRole(member.target);


                    if (kicker.info.sortId <= kicking.info.sortId) {
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                    "title": "Error!",
                                    "message": "You cant kick that person because its role is higher then yours",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "success",
                                    "popup_type": "confirm"
                                }`));
                        return;
                    }

                    //try{
                    // Delete user from server
                    member.target = escapeHtml(member.target);

                    delete serverconfig.servermembers[member.target];
                    saveConfig(serverconfig);

                    // Notify Admins
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Kicked User!",
                        "message": "The user has been kicked.",
                        "buttons": {
                            "0": {
                                "text": "Nice",
                                "events": ""
                            }
                        },
                        "type": "success",
                        "popup_type": "confirm"
                    }`));

                    io.sockets.sockets.forEach((target) => {

                        if (target.id === usersocket[member.target]) {

                            var reasonText = " ";
                            member.reason = escapeHtml(member.reason);
                            if (member.reason != null && member.reason.length > 0) {
                                reasonText = `Reason: ${member.reason}`
                            }

                            sendMessageToUser(target.id, JSON.parse(
                                `{
                                    "title": "You have been kicked",
                                    "message": "${reasonText}",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": "closeModal()"
                                        }
                                    },
                                    "type": "success",
                                    "popup_type": "confirm"
                                }`));

                            target.disconnect(true);
                        }
                    });

                    // Update Memberlist
                    io.emit("updateMemberList");
                    //}
                    //catch(e){
                    //    consolas(`Unable to kick user: ${e}`.red);
                    //}
                }
            }



        }
    });




    socket.on('banUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (member.id == member.target) {
                response({ type: "error", msg: "You cant ban yourself!", error: "You cant ban yourself." });
                return;
            }
            else {
                if (hasPermission(member.id, "banUsers") == false) {

                    response({ type: "error", msg: "You dont have permissions to ban members", error: "Missing permission banUsers" });
                    return;
                }
                else {

                    var banner = getMemberHighestRole(member.id);
                    var banning = getMemberHighestRole(member.target);

                    if (banner.info.sortId <= banning.info.sortId) {
                        response({
                            type: "error",
                            msg: "User cant be banned because their role is higher or qual then yours",
                            error: "Cant ban user whos role is higher or qual yours"
                        });
                        return;
                    }

                    banUser(socket, member);

                    // Notify Admins
                    response({
                        type: "success",
                        msg: "User has been banned",
                        error: null
                    });

                    io.sockets.sockets.forEach((target) => {

                        // Check if the target's socket ID matches the user's socket ID
                        if (target.id === usersocket[member.target]) {
                            // Escape and process the reason text
                            const reason = member.reason ? escapeHtml(member.reason.trim()) : "";
                            const reasonText = reason ? `Reason: ${reason}` : "";

                            const bannedUntilDate = getNewDate(member.duration);
                            const banDuration = bannedUntilDate.getFullYear() === "9999" ? `permanently banned` : `banned until ${bannedUntilDate.toISOString()}`;

                            const payload = {
                                title: `You have been ${banDuration}`,
                                message: reasonText,
                                buttons: {
                                    0: {
                                        text: "Ok",
                                        events: ""
                                    }
                                },
                                type: "error",
                                popup_type: "confirm"
                            };

                            sendMessageToUser(target.id, payload);

                            // Disconnect user
                            target.disconnect(true);
                        }
                    });


                    // Update Memberlist
                    io.emit("updateMemberList");
                }
            }



        }
    });





    socket.on('muteUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (member.id == member.target) {
                response({ error: "Cant mute yourself", msg: "You cant mute yourself!", type: "error" })
                return;
            }
            else {
                member.time = xssFilters.inHTMLData(member.time);
                member.reason = xssFilters.inHTMLData(member.reason);

                if (hasPermission(member.id, "muteUsers") == false) {
                    response({ error: "Missing permission muteUsers", msg: "You cant mute others!", type: "error" })
                    return;
                }
                else {

                    var mod = getMemberHighestRole(member.id);
                    var userToMute = getMemberHighestRole(member.target);

                    if (mod.info.sortId <= userToMute.info.sortId) {
                        response({ error: "Cant mute user with higher or equal role", msg: "Cant mute user with higher or equal role", type: "error" })
                        return;
                    }

                    var muteResult = muteUser(member);
                    if (muteResult?.error) {
                        response({ error: "Error muting user", msg: "Unable to mute user", type: "error" })
                        console.log(muteResult.error)
                        return;
                    }

                    // Notify Admins
                    response({ error: null, msg: "User has been muted", type: "success" })
                    io.emit("updateMemberList");

                    var reasonText = ""
                    if (member.reason.length > 0)
                        reasonText = `##Reason:#${member.reason}`;


                    if (new Date(muteResult.duration).getFullYear() == "9999") {
                        // You have been muted
                        sendMessageToUser(usersocket[member.target], JSON.parse(
                            `{
                                    "title": "You have been muted",
                                    "message": "${reasonText}",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "success",
                                    "popup_type": "confirm"
                                }`));
                    }
                    else {
                        // You have been muted
                        sendMessageToUser(usersocket[member.target], JSON.parse(
                            `{
                                    "title": "You have been muted until ${new Date(muteResult.duration).toLocaleString()}",
                                    "message": "${reasonText}",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "success",
                                    "popup_type": "confirm"
                                }`));
                    }
                }
            }
        }
    });

    socket.on('setRoom', function (member) {
        if (validateMemberId(member.id, socket) == true

        ) {

            leaveAllRooms(socket);

            var room = member.room.split('-');
            var group = room[0];
            var category = room[1];
            var channel = room[2];

            // annoying
            if (channel == "null" || category == "null" || group == "null") return;

            if (!hasPermission(member.id, "viewChannel", channel)) {

                sendMessageToUser(socket.id, JSON.parse(
                    `{
                                    "title": "Access denied",
                                    "msg": "You dont have access to this channel.",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "error",
                                    "popup_type": "confirm"
                                }`));
                return;
            }

            try {
                // If the channel exists
                if (serverconfig.groups[group].channels.categories[category].channel[channel] != null) {

                    // If its a text channel
                    if (serverconfig.groups[group].channels.categories[category].channel[channel].type == "text") {

                        // Permission already checked above for text on default                        
                        socket.join(escapeHtml(member.room));
                        consolas(`User joined text room ${escapeHtml(member.room)}`.green, "Debug");
                    }
                    // If its a voice channel
                    else if (serverconfig.groups[group].channels.categories[category].channel[channel].type == "voice") {

                        // If user can use VC
                        if (!hasPermission(member.id, "useVOIP", channel)) {
                            sendMessageToUser(socket.id, JSON.parse(
                                `{
                                    "title": "Access denied",
                                    "message": "You're not allowed to talk in this channel",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "error",
                                    "popup_type": "confirm"
                                }`));
                            return;
                        }

                        socket.join(escapeHtml(member.room));
                        consolas(`User joined VC room ${escapeHtml(member.room)} from room ${userOldRoom[member.id]}`.green, "Debug");
                    }

                }
            }
            catch (error) {

                try {
                    socket.leave(escapeHtml(member.room));
                }
                catch (ww) {
                    console.log(ww)
                }

                consolas(`Couldnt find room ${member.room}`.yellow, "Debug");
                consolas(error, "Debug");

                /*
                sendMessageToUser(usersocket[member.id], JSON.parse(
                    `{
                                "title": "Couldnt find channel",
                                "message": "We were unable to find the channel you selected. Maybe it got deleted?",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": "onclick='closeModal()'"
                                    }
                                },
                                "type": "error"
                            }`));

                 */

                return;
            }

        }
        else {
            consolas(`Couldnt set room because token or id didnt match`.red, "Debug");
            consolas(`Server Id ${serverconfig.servermembers[member.id].id}`.yellow, "Debug");
            consolas(`User Id ${member.id}`.yellow, "Debug");
            consolas(`Server Token ${serverconfig.servermembers[member.id].token}`.yellow, "Debug");
            consolas(`User Token ${member.token}`.yellow, "Debug");


            sendMessageToUser(usersocket[member.id], JSON.parse(
                `{
                    "title": "Couldnt process channel join request",
                    "message": "User ID or Token does not match. Known issue, will be fixed.",
                    "buttons": {
                        "0": {
                            "text": "Ok",
                            "events": "window.location.reload()"
                        }
                    },
                    "type": "error",
                    "popup_type": "confirm"
                }`));
        }
    });

    socket.on('setUsername', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed username", "Debug");
            serverconfig.servermembers[member.id].name = escapeHtml(limitString(member.username, 30));
            saveConfig(serverconfig);

            io.emit("updateMemberList");
        }
    });

    socket.on('setDefaultChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (hasPermission(member.id, "manageServer")) {

                // Try to resolve channel first to see if it even exists
                let channel = resolveChannelById(member.value);

                // Couldnt find channel
                if (channel == null) {
                    consolas(colors.red(`Channel with ID '${member.value}' wasnt found`))
                    response({ type: "error", msg: `Channel with ID '${member.value}' wasnt found` });
                    return;
                }

                serverconfig.serverinfo.defaultChannel = escapeHtml(member.value);
                saveConfig(serverconfig);

                response({ type: "success", msg: "Default Channel was successfully set" });
            }
            else {
                response({ type: "error", msg: "You cant change the server name: Missing permissions" });
            }
        }
    });

    socket.on('updateServerName', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (hasPermission(member.id, "manageServerInfo")) {
                consolas(`Changing servername from ${serverconfig.serverinfo.name} to ${escapeHtml(limitString(member.value, 200))}`, "Debug");

                serverconfig.serverinfo.name = escapeHtml(limitString(member.value, 200));
                saveConfig(serverconfig);

                response({ type: "success", msg: "Server was successfully renamed" });
            }
            else {
                response({ type: "error", msg: "You cant change the server name: Missing permissions" });
            }
        }
    });

    socket.on('updateServerDesc', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (hasPermission(member.id, "manageServerInfo")) {
                consolas(`Changing server description from ${serverconfig.serverinfo.description} to ${escapeHtml(limitString(member.value, 500))}`, "Debug");

                serverconfig.serverinfo.description = escapeHtml(limitString(member.value, 500));
                saveConfig(serverconfig);

                response({ type: "success", msg: "Server description was successfully changed" });
            }
            else {
                response({ type: "error", msg: "You cant change the server description: Missing permissions" });
            }
        }
    });

    socket.on('setStatus', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed status", "Debug");
            serverconfig.servermembers[member.id].status = escapeHtml(limitString(member.status, 100));
            saveConfig(serverconfig);

            io.emit("updateMemberList");
        }
    });

    socket.on('setPFP', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed icon", "Debug");
            serverconfig.servermembers[member.id].icon = member.icon;
            saveConfig(serverconfig);

            io.emit("updateMemberList",);
        }
    });


    socket.on('getGroupList', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {
            io.to(usersocket[member.id]).emit("receiveGroupList", getGroupList(member));
        }
    });

    socket.on('getMemberList', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (!hasPermission(member.id, "viewGroup", member.group)) {
                response({ error: true, msg: "You arent allowed to view this group", type: "error" })
                return;
            }

            response({ data: getMemberList(member, member.channel) })
        }
    });


    socket.on('isTyping', function (member) {
        if (validateMemberId(member.id, socket, true) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            //consolas("Typing room: " + member.room);
            //consolas("Typing member id: " + member.id);

            // if user is muted dont do anything
            if (serverconfig.mutelist.hasOwnProperty(member.id)) {
                return;
            }

            var username = serverconfig.servermembers[member.id].name;

            if (typingMembers.includes(username) == false) {
                typingMembers.push(escapeHtml(username));
            }

            clearTimeout(typingMembersTimeout[username]);
            typingMembersTimeout[username] = setTimeout(() => {

                if (typingMembers.includes(username) == true) {
                    typingMembers.pop(escapeHtml(username));
                }

                io.in(member.room).emit("memberTyping", typingMembers);

            }, 4 * 1000);

            //console.log(typingMembersTimeout[username]);

            io.in(member.room).emit("memberTyping", typingMembers);
        }
    });

    socket.on('stoppedTyping', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            //consolas("Stopped room: " + member.room);
            //consolas("Stopped id: " + member.id);

            var username = serverconfig.servermembers[member.id].name;

            if (typingMembers.includes(username) == true) {
                typingMembers.pop(username);
            }

            io.in(member.room).emit("memberTyping", typingMembers);
        }
    });

    socket.on('getGroupBanner', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (!hasPermission(member.id, "viewGroup", member.group)) {
                return;
            }

            io.to(usersocket[member.id]).emit("receiveGroupBanner", serverconfig.groups[member.group].info.banner);
        }
    });

    socket.on('getChatlog', async function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("Trying to get chat log", "Debug");

            if (hasPermission(member.id, ["viewChannel", "viewChannelHistory"], member.channelId)) {
                io.to(usersocket[member.id]).emit("receiveChatlog", await getSavedChatMessage(member.groupId, member.categoryId, member.channelId, member.index));
            }
        }
    });

    socket.on('createCategory', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.group = xssFilters.inHTMLData(member.group)
            member.value = xssFilters.inHTMLData(member.value)

            if (!hasPermission(member.id, "manageChannels")) {
                response({ error: "Missing permissions: manageChannels", msg: "Cant create category because you dont have the permissions to manage channels", type: "error" })
                return;
            }

            if (!member.group) {
                response({ error: "Missing parameter: group", msg: "No group specified", type: "error" })
            }

            try {
                var catId = generateId(4);
                serverconfig.groups[member.group].channels.categories[catId] = JSON.parse(
                    `{
                        "info": {
                            "id": ${catId},
                            "name": "${escapeHtml(member.value)}",
                            "sortId": 0
                        },
                        "channel": {
                        }
                    }
                        `);
                saveConfig(serverconfig);
                response({ error: null, msg: "Category created!", type: "success" })

                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e) {
                consolas("Couldnt create category".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {
            console.log("Invalid token?")
        }
    });

    socket.on('updateGroupBanner', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to change the group banner",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }

            try {
                // Default Fallback Banner
                if (member.value == null || member.value.length <= 0) {
                    member.value = "https://t4.ftcdn.net/jpg/04/46/93/93/360_F_446939375_83iP0UYTg5F9vHl6icZwgrEBHXeXMVaU.jpg";
                }

                member.value = escapeHtml(member.value);
                serverconfig.groups[member.group].info.banner = member.value;
                saveConfig(serverconfig);


                io.emit("updateGroupList");
                //io.emit("receiveGroupBanner", member.value); // bug
            }
            catch (e) {
                consolas("Couldnt update group banner".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });

    socket.on('updateGroupName', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to change the group name",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }

            try {

                var groupName = escapeHtml(member.groupName);
                var groupDescription = escapeHtml(member.groupDescription);
                var groupId = escapeHtml(member.groupId);

                if (!groupDescription) {
                    groupDescription = null;
                }

                serverconfig.groups[groupId].info.name = groupName;
                serverconfig.groups[groupId].info.description = groupDescription;
                saveConfig(serverconfig);

                response({ type: "success", msg: "Group Name Updated" });

                io.emit("updateGroupList");
            }
            catch (e) {
                consolas("Couldnt update group name".red, "Debug");
                consolas(colors.red(e), "Debug");

                response({ type: "error", msg: "Unable to update group name" });
            }

        }
        else {

        }
    });

    socket.on('updateGroupPermissions', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to change the group permissions",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }

            try {

                var groupPerms = member.perms;
                var groupId = member.groupId;
                var role = member.roleId;
                serverconfig.groups[groupId].permissions[role] = groupPerms;
                saveConfig(serverconfig);


                io.emit("updateGroupList");
                response({ type: "success", msg: "Group Permissions Updated" });

            }
            catch (e) {
                consolas("Couldnt update group permissions".red, "Debug");
                consolas(colors.red(e), "Debug");

                response({ type: "error", msg: "Unable to update group permissions" });
            }

        }
        else {

        }
    });

    socket.on('updateGroupIcon', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to change the group icon",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }

            try {
                if (member.value == null || member.value.length <= 0) {
                    member.value = "https://wallpapers-clan.com/wp-content/uploads/2022/05/cute-pfp-25.jpg";
                }

                member.value = escapeHtml(member.value);
                serverconfig.groups[member.group].info.icon = member.value;
                saveConfig(serverconfig);

                io.emit("updateGroupList");
            }
            catch (e) {
                consolas("Couldnt update group icon".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });

    socket.on('createChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageChannels")) {
                response({ msg: "You are not allowed to create a channel", type: "error", error: "Missing permissions to create channel" })
                return;
            }

            try {
                consolas(`Trying to create channel in group ${member.group}, category ${member.category}`.yellow, "Debug");

                var channelId = generateId(4);
                serverconfig.groups[member.group].channels.categories[member.category].channel[channelId] = JSON.parse(
                    `{
                        "id": ${channelId},
                        "name": "${escapeHtml(member.value)}",
                        "type": "${member.type}",
                        "description": "Default Channel Description",
                        "sortId": 0,
                        "permissions": {
                            "0": {
                                "viewChannelHistory": 1,
                                "readMessages": 1,
                                "sendMessages": 1,
                                "viewChannel": 0
                            }
                        }
                    }
                `);

                saveConfig(serverconfig);
                io.emit("receiveChannelTree", getChannelTree(member));
                response({ msg: "Channel created successfully", type: "success" })
            }
            catch (e) {
                consolas("Couldnt create channel".red, "Debug");
                consolas(colors.red(e), "Debug");

            }

        }
        else {

        }
    });

    socket.on('createGroup', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to create groups",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }

            try {
                var groupId = generateId(4);
                var categoryId = generateId(4);
                var channelId = generateId(4);

                serverconfig.groups[groupId] = JSON.parse(
                    `{
                        "info": {
                            "id": ${groupId},
                            "name": "${escapeHtml(member.value)}",
                            "icon": "/img/default_icon.png",
                            "banner": "/img/default_banner.png",
                            "isDeletable": 1,
                            "sortId": 0,
                            "access": [
                            ]
                        },
                        "channels": {
                            "categories": {
                                "${categoryId}": {
                                    "info": {
                                        "id": ${categoryId},
                                        "name": "General"
                                    },
                                    "channel": {
                                        "${channelId}": {
                                            "id": ${channelId},
                                            "name": "chat",
                                            "type": "text",
                                            "description": "Default Channel Description",
                                            "sortId": 0,
                                            "permissions": {
                                                "0": {
                                                    "readMessages": 1,
                                                    "sendMessages": 1,
                                                    "viewChannel": 0
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "permissions": {
                            "0": {
                                "viewGroup": 0
                            }
                        }
                    }
                `);

                saveConfig(serverconfig);
                io.emit("updateGroupList");
            }
            catch (e) {
                consolas("Couldnt create category".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });

    socket.on('deleteGroup', function (member) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (serverconfig.groups[member.group].info.isDeletable == 0) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Error!",
                        "message": "This group cant be deleted.",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to delete groups",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                return;
            }


            try {
                delete serverconfig.groups[member.group];
                saveConfig(serverconfig);

                io.emit("updateGroupList");
            }
            catch (e) {
                consolas("Couldnt delete group ".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });

    socket.on('deleteChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageChannels")) {
                response({ msg: "You arent allowed to deleteChannels", type: "error", error: "Missing Permissions: manageChannels" })
                return;
            }

            try {
                var channelId = member.channelId.replace("channel-", "");
                var group = resolveGroupByChannelId(channelId);
                var category = resolveCategoryByChannelId(channelId);

                if (channelId == serverconfig.serverinfo.defaultChannel) {
                    response({ msg: "You cant delete the default channel", type: "error", error: "Cant delete default channel" })
                    return;
                }

                delete serverconfig.groups[group].channels.categories[category].channel[channelId];
                saveConfig(serverconfig);

                response({ msg: "Channel deleted", type: "success", error: null })
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e) {
                consolas("Couldnt delete channel".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });

    socket.on('deleteCategory', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageChannels")) {
                response({ msg: "You arent allowed to delete categories", type: "error", error: "Cant delete category, missing permission manageChannels" })
                return;
            }

            try {
                delete serverconfig.groups[member.group].channels.categories[member.category.replace("category-", "")];
                saveConfig(serverconfig);

                response({ msg: "Category deleted", type: "success", error: null })
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e) {
                consolas("Couldnt delete category".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {
            consolas("nope");
        }
    });

    socket.on('getCurrentChannel', function (member) {
        if (validateMemberId(member.id, socket) == true) {

            //consolas("Resolving Channel ID to Name", "Debug");
            //console.log(serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);

            try {
                if (hasPermission(member.id, "viewChannel", member.channel) == true) {
                    io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);
                }

            }
            catch {
                io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group]);
            }
        }
    });

    socket.on('deleteMessage', async function (member) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true && serverconfig.servermembers[member.id].token == member.token) {


            // mysql feature option
            if (serverconfig.serverinfo.sql.enabled == true) {
                try {
                    // Check if user has permission
                    let originalMessage = await getChatMessagesFromDb(null, -1, member.messageId);
                    originalMessage = originalMessage[0];

                    if (originalMessage.authorId == serverconfig.servermembers[member.id].id || hasPermission(member.id, "manageMessages")) {
                        await deleteChatMessagesFromDb(member.messageId);
                        io.emit("receiveDeleteMessage", member.messageId);
                    }
                }
                catch (error) {
                    consolas(`Couldnt delete message ${member.messageId} from database`, "Debug");
                    consolas(error, "Debug");
                }
            }
            else {
                try {
                    var message = JSON.parse(fs.readFileSync(`./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`));
                    if (message.id == member.id || hasPermission(member.id, "manageMessages")) {

                        let path = `${member.group}/${member.category}/${member.channel}/${member.messageId}`;
                        if (path.includes("..")) return

                        fs.unlinkSync(`./chats/${path}`);
                        io.emit("receiveDeleteMessage", message.messageId);
                    }
                }
                catch (error) {
                    consolas(`Couldnt delete file ./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`, "Debug");
                    consolas(error, "Debug");
                }
            }


            io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);
        }
    });

    socket.on('userDisconnected', function (member) {
        return;
        serverconfig.servermembers[member.id].isOnline = 0;
        serverconfig.servermembers[member.id].lastOnline = member.time;
        showedOfflineMessage[member.id] = false;

        setTimeout(() => {

            if (serverconfig.servermembers[member.id].isOnline == 0 &&
                showedOfflineMessage[member.id] == false) {
                showedOfflineMessage[member.id] = true;
                io.emit("memberOffline", serverconfig.servermembers[member.id].name);

                consolas(`Member ${member.id} is now offline`, "Debug");
            }
            else {
                //console.log(`Member ${member.id} is still online`);
            }

        }, 5 * 1000 * 60);


    });

    socket.on('getMemberProfile', async function (member) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {
                io.to(usersocket[escapeHtml(member.id)]).emit("receiveMemberProfile",
                    {
                        "code": await getMemberProfile(
                            escapeHtml(member.target)),
                        "top": member.posY,
                        "left": member.posX
                    }
                );
            }
            catch (e) {
                consolas("Couldnt get member profile".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {
            consolas("Member not allowed to get it");
        }
    });

    socket.on('getEmojis', async function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {

                /*
                if(!hasPermission(member.id, "manageEmojis")){
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to manage Emojis",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": "onclick='closeModal()'"
                                }
                            },
                            "type": "error"
                        }`));

                    response({type: "error", msg: "You dont have permissions to manage Emojis"});
                    return;
                }

                 */

                // Emoji List array
                var emojiList = [];

                // Get all local emojis sorted by creation date
                fs.readdirSync("./public/emojis").sort((a, b) => {
                    let aStat = fs.statSync(`./public/emojis/${a}`),
                        bStat = fs.statSync(`./public/emojis/${b}`);

                    return new Date(bStat.birthtime).getTime() - new Date(aStat.birthtime).getTime();
                }).forEach(file => {
                    //console.log(file);
                    emojiList.push(file);
                });

                if (emojiList.length > 0) {
                    response({ type: "success", data: emojiList, msg: "Successfully received emojis" })
                }
                else {
                    response({ type: "error", data: null, msg: "No Emojis found" })
                }


            }
            catch (e) {
                consolas("Couldnt get emojis".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });

    socket.on('getBans', async function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {


                if (!hasPermission(member.id, "manageBans")) {
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to manage Bans",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                        "popup_type": "confirm"
                        }`));

                    response({ type: "error", msg: "You dont have permissions to manage Bans" });
                    return;
                }

                let banDataObj = copyObject(serverconfig.banlist);

                Object.entries(banDataObj).forEach(([bannedUserId, banData]) => {
                    banData.bannedModObj = getCastingMemberObject(serverconfig.servermembers[banData.bannedBy]) || null;
                    banData.bannedUserObj = getCastingMemberObject(serverconfig.servermembers[bannedUserId]) || null;
                });


                response({ type: "success", data: banDataObj, msg: "Successfully received banlist" })


            }
            catch (e) {
                consolas("Couldnt get emojis".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });

    socket.on('updateEmoji', async function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {

                if (!hasPermission(member.id, "manageEmojis")) {
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to manage Emojis",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                        "popup_type": "confirm"
                        }`));

                    response({ type: "error", msg: "You dont have permissions to manage Emojis" });
                    return;
                }

                var oldEmoji = findEmojiByID(member.emojiId);
                var newEmoji = `emoji_${member.emojiId}_${member.emojiName}.${oldEmoji.split(".").pop()}`;

                //consolas("Updating Emoji".yellow, "Debug");
                //consolas("From: ".yellow + oldEmoji, "Debug");
                //consolas("To: ".yellow + newEmoji, "Debug");

                fs.rename('./public/emojis/' + oldEmoji, `./public/emojis/` + newEmoji, function (err) {
                    if (err) {
                        response({ type: "error", error: err, msg: "Couldnt update emoji" })
                    }
                    else {
                        response({ type: "success", msg: "Emoji successfully updated" })
                    }
                });
            }
            catch (e) {
                consolas("Couldnt get emojis".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else {

        }
    });


    const mimeTypesCache = new Map(); // Cache to store validated MIME types by file ID
    const fileSizeCache = new Map(); // Cache to track file sizes by file ID

    // Helper function to get the total size of files in a directory
    const getFolderSize = (folderPath) => {
        const files = fs.readdirSync(folderPath);
        return files.reduce((total, file) => {
            const { size } = fs.statSync(path.join(folderPath, file));
            return total + size;
        }, 0);
    };

    socket.on("fileUpload", async ({ chunk, metadata }, response) => {


        let { id, token, filename, type, totalChunks, chunkIndex, fileId } = metadata; // Expect fileId in metadata
        const sanitizedFilename = sanitizeFilename(filename);

        let localUploadPath;
        if (type === "emoji") {
            if (!hasPermission(id, "manageEmojis")) {
                response({ type: "error", msg: "You don't have permissions to manage Emojis" });
                return;
            }
            localUploadPath = "./public/emojis";
        } else {
            if (!hasPermission(id, "uploadFiles")) {
                response({ type: "error", msg: "You don't have permissions to upload files" });
                return;
            }
            localUploadPath = "./public/uploads";
        }

        var userRole = getMemberHighestRole(id);
        var userUpload = userRole.permissions.maxUpload;

        let maxFileSizeMB = userUpload;
        const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024; // Convert MB to bytes
        const maxStorageBytes = serverconfig.serverinfo.maxUploadStorage * 1024 * 1024; // Convert MB to bytes

        const finalFilename = `${type === "emoji" ? "emoji" : "upload"}_${fileId}_${sanitizedFilename}`;
        const tempFilePath = path.join(localUploadPath, finalFilename);

        // Check server storage limit on the first chunk only
        if (chunkIndex === 0) {
            const currentFolderSize = getFolderSize(localUploadPath);
            if (currentFolderSize >= maxStorageBytes) {
                response({ type: "error", msg: "Server's max storage limit reached." });
                return;
            }
        }

        // Track cumulative file size for this file upload
        const chunkSize = chunk.length;
        const currentFileSize = (fileSizeCache.get(fileId) || 0) + chunkSize;
        fileSizeCache.set(fileId, currentFileSize);

        if (currentFileSize > maxFileSizeBytes) {
            response({ type: "error", msg: `File exceeds max size of ${maxFileSizeMB} MB.` });

            // Schedule deletion of any partial file
            setTimeout(() => {
                fs.unlink(tempFilePath, (err) => {
                    if (err) {
                        console.error(`Error deleting file ${tempFilePath}:`, err);
                    } else {
                        //console.log(`File ${tempFilePath} deleted successfully.`);
                    }
                });
            }, 5000); // Delay deletion by 5 seconds

            return;
        }

        // Validate MIME type on the first chunk only
        if (chunkIndex === 0) {
            try {
                const { mime } = await fileTypeFromBuffer(chunk); // Check MIME type from the first chunk
                if (!mime || !serverconfig.serverinfo.uploadFileTypes.includes(mime)) {
                    response({ type: "error", msg: `File type ${mime} is not allowed on the server` });
                    return;
                }
                mimeTypesCache.set(fileId, mime); // Cache the MIME type after validation
                console.log(`File type validated for ${filename}: ${mime}`);
            } catch (error) {
                console.log("Error determining file type:", error);
                response({ type: "error", msg: "Unable to determine file type" });
                return;
            }
        } else {
            // For subsequent chunks, check if the MIME type was validated
            if (!mimeTypesCache.has(fileId)) {
                response({ type: "error", msg: "File type validation required on the first chunk" });
                return;
            }
        }

        // Append chunk to file
        try {
            fs.appendFileSync(tempFilePath, chunk, "binary");
            console.log(`Chunk ${chunkIndex + 1}/${totalChunks} appended to ${tempFilePath}`);
        } catch (error) {
            console.log("Error writing chunk to file:", error);
            response({ type: "error", msg: "Error writing file chunk" });
            return;
        }

        // Handle last chunk and finalize upload
        if (chunkIndex + 1 === totalChunks) {
            mimeTypesCache.delete(fileId); // Clean up cache after upload completes
            fileSizeCache.delete(fileId); // Clean up file size cache

            if (serverconfig.serverinfo.useCloudflareImageCDN === 1 && type !== "emoji") {
                console.log("Preparing to upload to Cloudflare...");
                const form = new FormData();
                const cloudname = `uploaded_${generateId(34)}`;
                form.append('file', fs.createReadStream(tempFilePath));
                form.append('id', cloudname);

                try {
                    const cloudflareResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${serverconfig.serverinfo.cfAccountId}/images/v1`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${serverconfig.serverinfo.cfAccountToken}` },
                        body: form
                    });

                    if (cloudflareResponse.status === 200) {
                        const cloudflareUrl = `https://imagedelivery.net/${serverconfig.serverinfo.cfHash}/${cloudname}/public`;
                        console.log("Uploaded to Cloudflare:", cloudflareUrl);
                        fs.unlinkSync(tempFilePath); // Remove local temp file
                        response({ type: "success", msg: cloudflareUrl });
                    } else {
                        response({ type: "error", msg: `Cloudflare upload failed with code: ${cloudflareResponse.status}` });
                    }
                } catch (error) {
                    console.log("Error uploading to Cloudflare:", error);
                    response({ type: "error", msg: "Error uploading to Cloudflare" });
                }
            } else {
                // Return local file URL
                const fileUrl = tempFilePath.replace(/\\/g, '/').replace("./public", "").replace("public", "");
                response({ type: "success", msg: fileUrl });
                console.log("File uploaded locally at", fileUrl);
            }
        } else {
            // Progress update for each chunk
            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            socket.emit("uploadProgress", { filename, progress });
            response({ type: "success", msg: "Chunk received" });
        }
    });



    socket.on("getServerInfo", function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            var serverInfoObj = {
                name: serverconfig.serverinfo.name,
                description: serverconfig.serverinfo.description,
                defaultChannel: serverconfig.serverinfo.defaultChannel,
                uploadFileTypes: serverconfig.serverinfo.uploadFileTypes,
                messageLoadLimit: serverconfig.serverinfo.messageLoadLimit,
                tenorEnabled: serverconfig.serverinfo.tenor.enabled,
                sqlEnabled: serverconfig.serverinfo.sql.enabled,
                registrationEnabled: serverconfig.serverinfo.registration.enabled

            };

            if (hasPermission(member.id, "manageServer")) {
                // add more objects here
                serverInfoObj.useCloudflareImageCDN = serverconfig.serverinfo.useCloudflareImageCDN,
                    serverInfoObj.cfAccountId = serverconfig.serverinfo.cfAccountId,
                    serverInfoObj.cfAccountToken = serverconfig.serverinfo.cfAccountToken,
                    serverInfoObj.cfHash = serverconfig.serverinfo.cfHash,
                    serverInfoObj.maxUploadStorage = serverconfig.serverinfo.maxUploadStorage,
                    serverInfoObj.rateLimit = serverconfig.serverinfo.rateLimit,
                    serverInfoObj.dropInterval = serverconfig.serverinfo.dropInterval,
                    serverInfoObj.messageLoadLimit = serverconfig.serverinfo.messageLoadLimit,

                    serverInfoObj.moderation = serverconfig.serverinfo.moderation,
                    serverInfoObj.registration = serverconfig.serverinfo.registration,
                    serverInfoObj.login = serverconfig.serverinfo.login
            }


            response(serverInfoObj);
        }
        else {
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getGroupInfo", function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageGroups")) {

                var groupObj = serverconfig.groups[member.group];
                response({ type: "success", msg: "Successfully resolved group", data: groupObj });
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage groups" })
            }
        }
        else {
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getChannelInfo", function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageChannels")) {

                var channelObj = resolveChannelById(member.channel.replace("channel-", ""));
                response({ type: "success", msg: "Successfully resolved channel", data: channelObj });
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage channels" })
            }
        }
        else {
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("updateChannelName", function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageChannels")) {

                var group = resolveGroupByChannelId(member.channel);
                var category = resolveCategoryByChannelId(member.channel);

                serverconfig.groups[group].channels.categories[category].channel[member.channel].name = member.name;
                saveConfig(serverconfig);

                response({ type: "success", msg: "Successfully updated channel name" });

                // Let everyone know about the update
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage channels" })
            }
        }
        else {
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getServerRoles", function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageRoles")) {
                response(serverconfig.serverroles);
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage server roles" })
            }
        }
        else {
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getGroupChannels", function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageChannels") ||
                hasPermission(member.id, "manageGroup") ||
                hasPermission(member.id, "manageGroups")) {

                response(serverconfig.groups);
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage group channels" })
            }
        }
        else {
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on('updateChannelHierarchy', function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageChannels") ||
                hasPermission(member.id, "manageGroup") ||
                hasPermission(member.id, "manageGroups")) {
                try {
                    serverconfig.groups = member.sorted;

                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Changes were successfully applied" });

                    // Update Channel Hierarchy for everyone
                    io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
                    io.emit("receiveChannelTree", getChannelTree(member));

                    // Update Group Hierarchy for everyone
                    io.emit("updateGroupList");
                }
                catch (e) {
                    consolas("Unable to sort roles".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });

    socket.on("saveMediaSettings", function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageUploads")) {
                try {

                    consolas("Server Media Settings are being changed!".yellow);
                    consolas(`Local Upload Limit: ${member.maxLocalUpload}`);
                    consolas(`Use Cloudflare: ${member.useCloudflare}`);
                    consolas(`CF Account ID: ${member.cloudflareAccountId}`);
                    consolas(`CF Account Token: ${member.cloudflareAccountToken}`);
                    consolas(`CF Account Hash: ${member.cloudflareHash}`);

                    serverconfig.serverinfo.maxUploadStorage = member.maxLocalUpload;
                    serverconfig.serverinfo.useCloudflareImageCDN = member.useCloudflare;
                    serverconfig.serverinfo.cfAccountId = member.cloudflareAccountId;
                    serverconfig.serverinfo.cfAccountToken = member.cloudflareAccountToken;
                    serverconfig.serverinfo.cfHash = member.cloudflareHash;
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Settings saved successfully, please try to upload a profile picture to see if it works." })
                }
                catch (error) {
                    response({ type: "error", msg: "Server couldnt save settings: " + error })
                }
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage the upload settings" })
            }

        }
    });

    socket.on("saveRateSettings", function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRateSettings")) {
                try {

                    /*
                    consolas("Server Rate Settings are being changed!".yellow);
                    consolas(`Rate Limit: ${member.newRateLimit}`);
                    consolas(`Drop Interval: ${member.newDropIntervaö}`);

                     */

                    serverconfig.serverinfo.rateLimit = member.newRateLimit;
                    serverconfig.serverinfo.dropInterval = member.newDropInterval;
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Settings saved successfully." })
                }
                catch (error) {
                    response({ type: "error", msg: "Server couldnt save rate settings: " + error })
                }
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage the rate settings" })
            }

        }
    });

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