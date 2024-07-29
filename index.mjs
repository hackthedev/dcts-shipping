// express und http Module importieren. Sie sind dazu da, die HTML-Dateien
// aus dem Ordner "public" zu veröffentlichen.


console.clear();

import {createRequire} from "module";
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

// Depending on the SSL setting, this will switch.
// Localhost Implementation
export var server; // = require('http').createServer(app)


var FormData = require('form-data');
export const fetch = require('node-fetch')
const getSize = require('get-folder-size');

import {fileTypeFromBuffer} from 'file-type';
export var XMLHttpRequest = require('xhr2');

export const colors = require('colors');
export var request = require('request');

export var xssFilters = require('xss-filters');
const crypto = require('crypto');


var checkedMediaCacheUrls = {};
export var usersocket = []
var userOldRoom = {}
var peopleInVC = {}
var showedOfflineMessage = [];
export var powVerifiedUsers = [];

var typingMembers = [];
var typingMembersTimeout = [];

export var ratelimit = [];
var socketToIP = [];

export var debugmode = false;
export var versionCode = 346;

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
export var serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));
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
    copyObject
} from "./modules/functions/main.mjs"

// IO related functions
import {
    checkConfigFile,
    checkServerDirectories, 
    consolas, 
    getSavedChatMessage, 
    saveChatMessage
} from "./modules/functions/io.mjs"

import {checkSSL} from "./modules/functions/http.mjs"

// Chat functions
import {
    checkUserChannelPermission, 
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
    getGroupList
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
    decodeFromBase64
 } from "./modules/functions/mysql/helper.mjs"


 import {
    checkAndCreateTable
 } from "./modules/functions/mysql/mysql.mjs";

 import { fileURLToPath, pathToFileURL } from "url";





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



// Check if new version is available
checkVersionUpdate();

 // Create a connection pool if sql is enabled
 export let pool = null;
 if(serverconfig.serverinfo.sql.enabled == true){

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




consolas(" ", );
consolas(" ", );
consolas(" ", );
consolas(" ", );

consolas(colors.brightGreen(`Welcome to DCTS`));
consolas(colors.brightGreen(`Stay up-to-date at https://dcts.chat`));
consolas(" ");
consolas(colors.cyan(`You're running version ` + versionCode));

// Check if new Version exists
var checkVer = await checkVersionUpdate()
if(checkVer != null){
    consolas(colors.cyan.underline(`New version ${checkVer} is available!`));
    consolas(colors.cyan(`Download: https://github.com/hackthedev/dcts-shipping/releases`));
}

consolas(" " );
consolas(" ");

// Check if SSL is used or not
checkSSL();

// Catch uncaught errors
process.on('uncaughtException', function(err) {

    // Handle the error safely
    consolas("");
    consolas("");
    consolas("UNEXPECTED ERROR".red);
    consolas(" ");
    consolas(colors.red(err.message));

    console.log(" ");
    console.log("Details: ".red);
    console.log(colors.grey(err).italic);

    // Log Error To File
    var date = new Date().toLocaleString();
    date = date.replace(", ", "_");
    date = date.replaceAll(":", "-");
    date = date.replaceAll(".", "-");

    // Create the log file
    fs.writeFile("./logs/error_" + date + ".txt", err.message + "\n" + err.stack, function(err) {
        if(err) {
            return console.log(err);
        }
        consolas("The log file ".cyan + colors.white("./logs/error_" + date + ".txt") + " was saved!".cyan, "Debug");
    });


    // Create the config backup file
    fs.writeFile("./config_backups/config_" + date + ".txt", JSON.stringify(serverconfig, false, 4), function(err) {
        if(err) {
            return console.log(err);
        }
        consolas("The config file ".cyan + colors.white("./logs/error_" + date + ".txt") + " was saved!".cyan, "Debug");
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

    consolas(colors.brightGreen('Server is running on port ' + port));

    if(serverconfig.serverinfo.setup == 0){

        var adminToken = generateId(64);
        serverconfig.serverinfo.setup = 1;
        serverconfig.serverroles["1111"].token.push(adminToken);
        saveConfig(serverconfig);


        consolas(colors.brightGreen(`To obtain the admin role in your server, copy the following token.`));
        consolas(colors.brightGreen(`You can use it if prompted or if you right click on the server icon and press "Redeem Key"`));
        consolas(colors.brightGreen(` `));

        consolas(colors.brightGreen(`Server Admin Token:`));
        consolas(colors.brightGreen(adminToken));
        consolas(colors.brightGreen(` `));
        consolas(colors.brightGreen(` `));
    }
    else if(serverconfig.serverroles["1111"].token.length > 0){
        consolas(colors.brightGreen(` `));
        consolas(colors.brightGreen(` `));
        consolas(colors.brightGreen(`Welcome to DCTS`));
        consolas(colors.brightGreen(`To obtain the admin role in your server, copy the following token.`));
        consolas(colors.brightGreen(`You can use it if prompted or if you right click on the server icon and press "Redeem Key"`));
        consolas(colors.brightGreen(` `));

        consolas(colors.cyan(`Available Server Admin Token(s):`));

        serverconfig.serverroles["1111"].token.forEach(token =>{
            consolas(colors.cyan(token))
        })

        consolas(colors.brightGreen(` `));
        consolas(colors.brightGreen(` `));
    }

});



// Hier teilen wir express mit, dass die öffentlichen HTML-Dateien
// im Ordner "public" zu finden sind.
app.use(express.static('./public'));


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
    if(serverconfig.ipblacklist.includes(ip)){


        sendMessageToUser(socket.id, JSON.parse(
            `{
                        "title": "IP Blacklisted ${ip}",
                        "message": "Your IP Address was blacklisted. Reach out to the server admin if you think this is an error",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": "onclick='closeModal()'"
                            }
                        },
                        "type": "error"
                    }`));



        socket.disconnect();

        consolas("Disconnected user because ip is blacklisted", "Debug");
    }

    // Send a PoW challenge to the client
    socket.on('requestPow', () => {
        const challenge = crypto.randomBytes(16).toString('hex');
        socket.emit('powChallenge', { challenge, difficulty: powDifficulty });
    });

    // Verify the PoW solution
    socket.on('verifyPow', ({ challenge, solution }) => {
        if (isValidProof(challenge, solution)) {

            if(!powVerifiedUsers.includes(socket.id)){
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
        var daysDifference = Math.round(difference/1000/60/60/24);

        return daysDifference;
    }

    // WebRTC tests
    socket.on('join', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);
    
        socket.on('disconnect', () => {
            if(powVerifiedUsers.includes(socket.id)){
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


    socket.on('userConnected', function (member) {


        member.id = xssFilters.inHTMLData(member.id)
        member.name = xssFilters.inHTMLData(member.name)
        member.status = xssFilters.inHTMLData(member.status)
        member.aboutme = xssFilters.inHTMLData(member.aboutme)
        member.icon = xssFilters.inHTMLData(member.icon)
        member.banner = xssFilters.inHTMLData(member.banner)
        member.token = xssFilters.inHTMLData(member.token)
        //member.message = xssFilters.inHTMLData(member.message)

        //var ip = socket.handshake.headers["x-real-ip"];
        //var port = socket.handshake.headers["x-real-port"];

        try{
            if(serverconfig.banlist[member.id] != null){

                var durationStamp = serverconfig.banlist[member.id].until;
                var banReason = serverconfig.banlist[member.id].reason;
                var bannedInDays = "";

                var bannedDate = durationStamp;
                var currentDate = new Date().getTime();
                var title = "";

                if(durationStamp == null || durationStamp <= 0 ){
                    title = "You've been permanently banned";
                }
                else{
                    if(currentDate > bannedDate){
                        // unban user

                        serverconfig.servermembers[member.id].isBanned = 0;
                        delete serverconfig.banlist[member.id];
                        saveConfig(serverconfig);

                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                        "title": "You've been unbanned!",
                        "message": "Please reload the page.",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": "onclick='window.location.reload()'"
                            }
                        },
                        "type": "success"
                    }`));

                        consolas(colors.yellow("Automatically unbanned user " + member.name + ` (${member.id})`));
                        return;
                    }
                    else{
                        bannedInDays = getDateDayDifference(durationStamp, currentDate);

                        var bannedInMiliSeconds = durationStamp - currentDate;
                        var bannedInSeconds = bannedInMiliSeconds / 1000;
                        var bannedInMinutes = bannedInSeconds / 60;
                        var bannedInHours = bannedInMinutes / 24;
                        var bannedDays = bannedInHours / 30;
                        var bannedMonths = bannedDays / 30;
                        var bannedYears = bannedMonths / 12;

                        title = `You've been banned for ${bannedInDays} day(s)`;
                        if(banReason.length > 0){
                            title += "##Reason: #" + banReason;
                        }

                        /*
                        title = `You've been banned for ##${Math.round(bannedYears)} year(s),#
                                                        ${Math.round(bannedMonths % 12)} months(s).#
                                                        ${Math.round(bannedDays % 30)} days(s).#
                                                        ${Math.round(bannedInHours % 24)} hours(s).#
                                                        ${Math.round(bannedInMinutes % 60)} minutes(s) and#
                                                        ${Math.round(bannedInSeconds % 60)} seconds(s)`;

                         */
                    }

                }

                title = title.replaceAll("\n", "");
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "${title}",
                        "message": "",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": "onclick='closeModal()'"
                            }
                        },
                        "type": "success"
                    }`));

                checkRateLimit(socket);

                socket.disconnect();
                return;
            }
        }
        catch{

        }

        consolas(`Member connected. User: ${member.name} (${member.id} - ${socketToIP[socket]})`, "Debug");

        // Check if member is in default role
        if(serverconfig.serverroles["0"].members.includes(member.id) == false){
            serverconfig.serverroles["0"].members.push(member.id);
            saveConfig(serverconfig);
        }

        if(member.id.length == 12 && isNaN(member.id) == false){
            usersocket[member.id] = socket.id;

            member.id = xssFilters.inHTMLData(member.id);
            member.token = xssFilters.inHTMLData(member.token);
            member.group = xssFilters.inHTMLData(member.group);
            member.category = xssFilters.inHTMLData(member.category);
            member.channel = xssFilters.inHTMLData(member.channel);
            member.room = xssFilters.inHTMLData(member.room);

            // if new member
            if(serverconfig.servermembers[member.id] == null) {
                // New Member joined the server

                var userToken = generateId(48);
                io.to(usersocket[member.id]).emit("receiveToken", userToken);

                // setup member
                serverconfig.servermembers[member.id] = JSON.parse(
                    `{
                              "id": ${member.id},
                              "token": "${userToken}",
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
                              "isMuted": 0
                            }
                        `);
                saveConfig(serverconfig);

                try{
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Save your token!",
                        "message": "Save the following token! #Without it you cant access your account on this server. Back it up now! ##Token: ${serverconfig.servermembers[member.id].token}",
                        "buttons": {
                            "0": {
                                "text": "Saved!",
                                "events": "refreshValues();"
                            }
                        },
                        "token": "${serverconfig.servermembers[member.id].token}",
                        "type": "success"
                    }`));
                }
                catch (e){
                    consolas("Error on token message sending".red, "Debug");
                    consolas(e, "Debug");
                }

                // create copy of server member without token
                var castingMember = copyObject(serverconfig.servermembers[member.id]);
                castingMember.token = null;

                // Save system message to the default channel
                castingMember.group = resolveGroupByChannelId(serverconfig.serverinfo.defaultChannel);
                castingMember.category = resolveCategoryByChannelId(serverconfig.serverinfo.defaultChannel);
                castingMember.channel = serverconfig.serverinfo.defaultChannel;
                castingMember.room = `${member.group}-${member.category}-${member.channel}`;

                castingMember.timestamp = new Date().getTime();
                castingMember.messageId = generateId(12);
                castingMember.isSystemMsg = true;

                castingMember.message = `${member.name} joined the server!</label>`;
                saveChatMessage(castingMember);

                io.emit("updateMemberList");

                // Save System Message and emit join event
                io.emit("newMemberJoined", castingMember);
            }
            else{

                if(member.token == null || member.token.length != 48 ||
                    serverconfig.servermembers[member.id].token == null ||
                    serverconfig.servermembers[member.id].token != member.token){

                    //console.log(serverconfig.servermembers[member.id]);

                    try{
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                        "title": "Invalid Token",
                        "message": "Your Auth Token was incorrect or not set. You can contact the server admin to get your token or reset your account entirely.",
                        "buttons": {
                            "0": {
                                "text": "Import Token",
                                "events": "importToken()"
                            },
                            "1": {
                                "text": "Reset Account",
                                "events": "resetAccount()"
                            }
                        },
                        "type": "error"
                    }`));
                    }
                    catch (e){
                        consolas("Error on error message sending".red, "Debug");
                        consolas(e, "Debug");
                    }


                    consolas("User did not have a valid token.", "Debug");
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

                if(serverconfig.servermembers[member.id].isOnline == 0){
                    // Member is back online
                    serverconfig.servermembers[member.id].isOnline = 1;

                    var lastOnline = serverconfig.servermembers[member.id].lastOnline / 1000;

                    var today = new Date().getTime() / 1000;
                    var diff = today - lastOnline;
                    var minutesPassed = Math.round(diff / 60);


                    if(minutesPassed > 5){
                        io.emit("updateMemberList");
                        io.emit("memberOnline", member);
                    }
                }
                else{
                    io.emit("updateMemberList");
                    io.emit("memberPresent", member);
                }
            }
        }
        else{
            socket.disconnect();
            consolas("ID WAS WRONG ON USER JOIN ".red + member.id, "Debug");
        }
    });

    socket.on('joinedVC', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)
            member.lastActivity = xssFilters.inHTMLData(member.lastActivity)

            var memberTransmitObj = {id: member.id, name: serverconfig.servermembers[member.id].name, icon: serverconfig.servermembers[member.id].icon, room: member.room, lastActivity: member.lastActivity};

            if(peopleInVC[member.room] == null) peopleInVC[member.room] = {};
            peopleInVC[member.room][member.id] = memberTransmitObj;

            socket.to(member.room).emit("userJoinedVC", memberTransmitObj);
            socket.emit("userJoinedVC", memberTransmitObj);
        }
    });

    socket.on('leftVC', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)

            // User already left, so the room id wouldnt be correct anymore
            try { member.room = userOldRoom[member.id][0]; } catch{}


            try{ delete peopleInVC[member.room][member.id] } catch (error) {  }
            socket.to(member.room).emit("userLeftVC", {id: member.id, name: serverconfig.servermembers[member.id].name, icon: serverconfig.servermembers[member.id].icon, room: member.room});
        }
    });

    socket.on('checkMediaUrlCache', async function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(serverconfig.serverinfo.sql.enabled == false){
                consolas(colors.yellow("Media Cache cannot be used when SQL is disabled!"), "Debug");
                consolas(colors.yellow("Consider setting up a mysql server to reduce server load and load time"), "Debug");
                response({type: "success", isCached: false, mediaType: await checkMediaTypeAsync(member.url)});
                return;
            }

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            // Initialize the object
            if (!checkedMediaCacheUrls[member.url]) {
                checkedMediaCacheUrls[member.url] = {}; 
              }

            // if its not a url we dont want to process it
            if(!isURL(member.url)){
                return;
            }


            if(checkedMediaCacheUrls[member.url].mediaType != null){
                // Link was already sent in for check
                response({type: "success", isCached: true, mediaType: checkedMediaCacheUrls[member.url].mediaType});
            }
            else{
                // check if link is cached
                let result = await getMediaUrlFromCache(member.url);

                if(result.length <= 0){

                    // if its not cached, get media type by using a request
                    let urlMediaType = await checkMediaTypeAsync(member.url);

                    // if the media type isnt unknown
                    if(urlMediaType != "unkown" && urlMediaType != "error" && urlMediaType != null){            
                        
                        // try to save the url in cache
                        let cacheResult = await cacheMediaUrl(member.url, urlMediaType);
                    }
                }
                else{
                    // Save in "internal" cache until program is restarted. 
                    // supposed to avoid multiple requests
                    checkedMediaCacheUrls[member.url].mediaType = result[0].media_type;
                    response({type: "success", isCached: true, mediaType: result[0].media_type});
                }
            }

            

            response({type: "error", isCached: false});
        }
    });

    socket.on('getVCMembers', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)

            Object.keys(peopleInVC[member.room]).forEach(function(memberId) {
                var user = peopleInVC[member.room][memberId];


                var lastOnline = user.lastActivity / 1000;

                var today = new Date().getTime() / 1000;
                var diff = today - lastOnline;
                var minutesPassed = Math.round(diff / 60);

                if(minutesPassed > 0){
                    delete peopleInVC[member.room][memberId];
                }
            });


            response({type: "success", vcMembers: peopleInVC[member.room]});
        }
    });


    socket.on('messageSend', async function (memberOriginal) {
        checkRateLimit(socket);

        if(validateMemberId(memberOriginal.id, socket) == true
            && serverconfig.servermembers[memberOriginal.id].token == memberOriginal.token
        ) {

            // Remove token from cloned object so we dont broadcast it
            let member = copyObject(memberOriginal);
            //member.token = null;

            if(isNaN(member.group) == true){
                consolas("Group was not a number", "Debug");
                return;
            }
            if(isNaN(member.channel) == true){
                consolas("Channel was not a number", "Debug");
                return;
            }
            if(isNaN(member.category) == true){
                consolas("Category was not a number", "Debug");
                return;
            }
            if(member.message.length <= 0){
                consolas("Message is shorter than 1 charachter", "Debug");
                return;
            }

            if(!hasPermission(member.id, "sendMessages")){
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
            try{
                if(serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel] != null){

                    if(!checkUserChannelPermission(member.channel, member.id, "sendMessages")){

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
                                    "type": "error",
                                    "popup_type": "confirm"
                                }`));

                        return;
                    }

                    if(!checkUserChannelPermission(member.channel, member.id, "viewChannel")){

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
                    member.message = member.message.replaceAll(regex, '').replaceAll(/<p\s+id="msg-\d+">\s*<\/p>/g, "<p id='msg-"+ messageid + "'><br></p>")

                    if(member.message.replaceAll(" ", "") == null){
                        consolas(colors.red("Message was null"))
                        return
                    }

                    var emptyMessageContent = member.message.replaceAll(" ", "").replaceAll("<p>", "").replaceAll("</p>",  "");
                    
                    if(emptyMessageContent == ""){
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
                        try{
                            var text = emptyMessageContent.replaceAll(emoji + ":", ``)

                            if(text.length == 0){
                                sendBigEmoji = "big"
                            }
                        }
                        catch (err){
                            consolas(colors.red("Emoji Convertion test error"));
                        }
                    });

                    try{
                        // Actually replaces the text with the emoji and displays it
                        member.message.replace(reg, function (emoji) {
                            
                                var emojiName = findEmojiByID(emoji.replaceAll(":", "")).split("_")[2].split(".")[0];
                                member.message = member.message.replaceAll(emoji + ":", `<span><img title="${emojiName}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${findEmojiByID(emoji.replaceAll(":", ""))}"></span>`);
                        });
                    }
                    catch{

                    }

                    // important
                    member.token = null;

                    // Display role color of the highest role
                    var userRoleArr = [];
                    Object.keys(serverconfig.serverroles).forEach(function(role) {

                        if(serverconfig.serverroles[role].members.includes(member.id) &&
                            serverconfig.serverroles[role].info.displaySeperate == 1){
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
                    if(member.editedMsgId != null){

                        // Get Original message
                        let room = `${member.group}-${member.category}-${member.channel}`
                        let originalMsg = await getChatMessagesFromDb(room, 1, member.editedMsgId);
                        let originalMsgObj = JSON.parse(decodeFromBase64(originalMsg[0].message));

                        // Check if the user who wants to edit the msg is even the original author lol
                        if(originalMsgObj.id != member.id){
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

                    // Save the Chat Message to file
                    saveChatMessage(member, member.editedMsgId);

                    // Remove user from typing
                    var username = serverconfig.servermembers[member.id].name;
                    if(typingMembers.includes(username) == true){
                        typingMembers.pop(username);
                    }
                    io.in(member.room).emit("memberTyping", typingMembers);

                    // Send message or update old one
                    if(member.editedMsgId == null){
                        // New message
                        io.in(member.room).emit("messageCreate", member);
                        io.emit("markChannelMessage", {group: member.group, category: member.category, channel: member.channel});
                    }
                    // emit edit event of msg
                    else{                        
                        io.in(member.room).emit("messageEdited", member);
                    }

                }
                else{
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
            catch(err){
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
        else{
            consolas("Cant send message because member id wasnt valid".red, "Debug");
            consolas("ID: " + member.id, "Debug");
        }
    });

    socket.on('redeemKey', function (member) {
        if(validateMemberId(member.id, socket) == true
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

            Object.keys(roles).forEach(function(roleId) {
                var role = roles[roleId];

                if(role.token.includes(member.value)){

                    // If the member already is in that role we want to deny it
                    if(role.members.includes(member.id)){
                        alreadyInRole = true;
                        return; // https://youtu.be/WUOtCLOXgm8?si=XRe4XUStDBm_D95O&t=39
                    }


                    try{
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
                    catch(e){

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
            if(foundTokenInRole == false){
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

            if(alreadyInRole){
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
        if(validateMemberId(member.id, socket) == true
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.group = xssFilters.inHTMLData(member.group)

            if(!hasPermission(member.id, "viewGroup", member.group)){
                return;
            }

            response({type: "success", data: getChannelTree(member)});
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });

    socket.on('getUserFromId', function (member, response) {
        if(validateMemberId(member.id, socket) == true
        ) {
            response({type: "success", user: serverconfig.servermembers[member.target]});
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });

    socket.on('getAllRoles', function (member, response) {
        if(validateMemberId(member.id, socket) == true
        ) {
            if(!hasPermission(member.id, "manageRoles", member.group)){
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
            Object.keys(sortedRoles).reverse().forEach(function(role) {
                //console.log(roles[role].info.name)

                if(sortedRoles[role].info.sortId < highestRole.info.sortId || hasPermission(member.id, "administrator", member.group)){
                    sortIndex = sortedRoles[role].info.sortId;

                    if(sortedRoles[role].members.includes(member.targetUser)){
                        sortedRoles[role].info.hasRole = 1;
                    }
                    else{
                        sortedRoles[role].info.hasRole = 0;
                    }

                    // Get Highest role of user doing it
                    var executer = getMemberHighestRole(member.id);

                    // Only let people show roles they can actually assign
                    if(sortedRoles[role].info.sortId < executer.info.sortId && role != 0 && role != 1){
                        returnRole.push(sortedRoles[role]);
                    }
                }
            });



            io.emit("updateMemberList");
            response({type: "success", data: returnRole});
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });







    socket.on('searchTenorGif', function (member, response) {
        if(validateMemberId(member.id, socket) == true
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.search = xssFilters.inHTMLData(member.search)

            if(serverconfig.serverinfo.tenor.enabled != 1){
                response({type: "error", msg: "GIFs are disabled on this server"});
            }
            else{
                response({type: "success", msg: "Trying to search GIF"});
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
        if(member.emoji.includes("..")) return;

        if(validateMemberId(member.id, socket) == true
        ) {

            if(hasPermission(member.id, "manageEmojis")){
                try{

                    try {
                        if(member.emoji.includes("..")) return

                        fs.unlinkSync(`./public/emojis/${member.emoji}`);
                        response({type: "success", msg: "Emoji deleted successfully"});

                    } catch (error) {
                        consolas("Coudlnt delete emoji", "Debug")
                        consolas(error, "Debug")

                        response({type: "error", msg: "Cant Delete Emoji", error: error});
                    }
                }
                catch(e){
                    consolas("Unable to resolve member".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", msg: "You dont have permissions to manage emojis"});
            }
        }
    });

    socket.on('resolveMember', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if(hasPermission(member.id, "resolveMembers")){
                try{

                    var resolved = copyObject(serverconfig.servermembers[member.target]);
                    resolved.token = null;

                    response({type: "success", msg: "User Data was resolved", data: resolved });
                }
                catch(e){
                    consolas("Unable to resolve member".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('unmuteUser', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if(hasPermission(member.id, "muteUsers")){

                if(serverconfig.mutelist.hasOwnProperty(member.target)){
                    delete serverconfig.mutelist[member.target];
                    //response({type: "success", msg: `The user ${serverconfig.servermembers[member.target].name} has been unmuted` });
                }
                else{
                    //response({type: "error", msg: `The user ${serverconfig.servermembers[member.target].name} isnt muted` });
                }


                serverconfig.servermembers[member.target].isMuted = 0;
                saveConfig(serverconfig);

                io.emit("updateMemberList");
            }
            else{
                //response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('unbanUser', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if(hasPermission(member.id, "manageBans")){
                try{

                    serverconfig.servermembers[member.target].isBanned = 0;
                    delete serverconfig.banlist[member.target];
                    saveConfig(serverconfig);

                    response({type: "success", msg: `The user ${serverconfig.servermembers[member.target].name} has been unbanned` });
                }
                catch(e){
                    response({type: "error", msg: `User couldnt be unbanned`});
                    consolas("Unable to resolve member".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('addUserToRole', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.target = xssFilters.inHTMLData(member.target)

            if(hasPermission(member.id, "manageMembers")){
                try{
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

                    console.log(executer);
                    console.log(targetRole)

                    if(executer.info.sortId <= targetRole.info.sortId){
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
                    response({type: "success", msg: "Role assigned"});

                }
                catch(e){
                    consolas("Unable to add member to group".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('removeUserFromRole', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.target = xssFilters.inHTMLData(member.target)

            if(hasPermission(member.id, "manageMembers")){
                try{

                    // If user is not a admin they cant assign roles that are higher
                    if(!hasPermission(member.id, "administrator")){
                        if(serverconfig.serverroles[member.role].info.sortId >= highestUserRole.info.sortId){
                            response({type: "error", msg: "You cant remove roles that are higher or equal then yours"});
                            return;
                        }
                    }

                    var executer = getMemberHighestRole(member.id);
                    var target = getMemberHighestRole(member.target);


                    if(executer.info.sortId <= target.info.sortId){
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
                    if(serverconfig.serverroles[member.role].info.id == 0 || serverconfig.serverroles[member.role] == 1){
                        return;
                    }

                    serverconfig.serverroles[member.role].members.pop(member.target);
                    saveConfig(serverconfig);


                    io.emit("updateMemberList");
                    io.to(usersocket[member.target]).emit("updateMemberList");
                    response({type: "success", msg: "Role removed"});
                }
                catch(e){
                    consolas("Unable to remove member from group".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('saveRolePermissions', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.permissions = xssFilters.inHTMLData(member.permissions)

            if(hasPermission(member.id, "manageRoles")){
                try{
                    serverconfig.serverroles[member.role].permissions = member.permissions;
                    saveConfig(serverconfig);

                    io.emit("updateMemberList");
                    response({type: "success", msg: "Role permissions have been updated"});
                }
                catch(e){
                    consolas("Unable to update permissions from role".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('saveChannelPermissions', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if(hasPermission(member.id, "manageChannels")){
                try{
                    //console.log(member.role);

                    var memberChannel = member.channel.replace("channel-", "");

                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role] = member.permission;
                    saveConfig(serverconfig);

                    io.emit("receiveChannelTree");
                    response({type: "success", msg: "Channel permissions have been updated"});
                }
                catch(e){
                    consolas("Unable to update channel permissions from role".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('removeRoleFromChannel', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageChannels")){
                try{

                    var memberChannel = member.channel.replace("channel-", "");

                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    delete serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role];
                    saveConfig(serverconfig);

                    response({type: "success", msg: "Role was successfully removed from the channel"});
                }
                catch(e){
                    consolas("Unable to remove role from channel".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('addRoleToChannel', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageChannels")){
                try{

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

                    response({type: "success", msg: "Role was successfully removed from the channel"});
                }
                catch(e){
                    consolas("Unable to add role to channel".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('addRoleToGroup', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageGroups")){
                try{


                    serverconfig.groups[member.group].permissions[member.role] = JSON.parse(
                        `
                        {
                            "viewGroup": 1
                        }
                        `
                    )
                    saveConfig(serverconfig);

                    response({type: "success", msg: "Role was successfully added to the group"});
                }
                catch(e){
                    consolas("Unable to add role to group".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('removeRoleFromGroup', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageGroups")){
                try{


                    delete serverconfig.groups[member.group].permissions[member.role];
                    saveConfig(serverconfig);

                    response({type: "success", msg: "Role was successfully removed from the group"});
                }
                catch(e){
                    consolas("Unable to remove role to group".red);
                    console.log(colors.red(e));
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('updateRoleHierarchy', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageRoles")){
                try{
                    var sortedRoles = member.sorted.reverse();

                    for(let i = 0; i < sortedRoles.length; i++){
                        var roleId = sortedRoles[i];
                        serverconfig.serverroles[roleId].info.sortId = i;
                    }

                    saveConfig(serverconfig);

                    response({type: "success", msg: "Role was updated successfully"});
                }
                catch(e){
                    consolas("Unable to sort roles".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('updateRoleAppearance', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageRoles")){
                try{
                    serverconfig.serverroles[member.roleId].info.name = member.data.info.name;
                    serverconfig.serverroles[member.roleId].info.color = member.data.info.color;
                    serverconfig.serverroles[member.roleId].info.displaySeperate = member.data.info.displaySeperate;

                    saveConfig(serverconfig);

                    response({type: "success", msg: "Role was updated successfully"});

                    // Update to everyone and yourself
                    io.emit("updateMemberList");
                    io.to(usersocket[member.id]).emit("updateMemberList");
                }
                catch(e){
                    consolas("Unable to sort roles".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on('createRole', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageRoles")){
                try{
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

                    response({type: "success", msg: "The role has been successfully created"});
                }
                catch(e){
                    consolas("Unable to create role".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", permission: "denied"});
            }


        }
        else{
            consolas("Token or ID incorrect");
        }
    });

    socket.on('deleteRole', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageRoles")){
                try{

                    if(serverconfig.serverroles[member.roleId].info.deletable == 1){
                        delete serverconfig.serverroles[member.roleId];
                        saveConfig(serverconfig);

                        response({type: "success", msg: "The role has been successfully deleted"});
                    }
                    else{
                        response({type: "error", msg: "This role cant be deleted"});
                    }
                }
                catch(e){
                    consolas("Unable to delete role".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }


        }
        else{
            consolas("Token or ID incorrect");
        }
    });

    socket.on('checkChannelPermission', function (member, response) {
        if(validateMemberId(member.id, socket) == true) {

            member.id = xssFilters.inHTMLData(member.id);
            member.token = xssFilters.inHTMLData(member.token);
            member.permission = xssFilters.inHTMLData(member.permission);
            member.channel = xssFilters.inHTMLData(member.channel);

            var userObj = copyObject(serverconfig.servermembers[member.id]);

            if(Array.isArray(member.permission)){

                //console.log("Checking for multiple permissions");

                var found = false;
                for (var i = 0; i < member.permission.length; i++) {

                    //console.log(member.permission[i])

                    if(checkUserChannelPermission(member.channel, member.id, member.permission[i])){
                        found = true;
                        userObj.token = null;
                        response({type: "success", permission: "granted", user: userObj});
                    }
                    else{
                        // Dont do anything as it still loops
                    }
                }

                if(found == false){
                    userObj.token = null;
                    response({type: "success", permission: "denied", user: userObj});
                }

            }
            else{ // Single permission check

                if (checkUserChannelPermission(member.channel, member.id, member.permission)) {
                    userObj.token = null;
                    response({type: "success", permission: "granted", user: userObj});
                } else {
                    userObj.token = null;
                    response({type: "success", permission: "denied", user: userObj});
                }
            }
        }
    });

    socket.on('checkPermission', function (member, response) {
        if(validateMemberId(member.id, socket) == true) {


            var userObj = copyObject(serverconfig.servermembers[member.id]);
            userObj.token = null;

            if(Array.isArray(member.permission)){

                //console.log("Checking for multiple permissions");

                var found = false;
                for (var i = 0; i < member.permission.length; i++) {

                    //console.log(member.permission[i])

                    if(hasPermission(member.id, member.permission[i])){
                        found = true;
                        response({type: "success", permission: "granted", user: userObj});
                    }
                    else{
                        // Dont do anything as it still loops
                    }
                }

                if(found == false){
                    response({type: "success", permission: "denied", user: userObj});
                }

            }
            else{ // Single permission check

                //console.log("Checking for single permissions");
                //console.log(member.permission + " - " + hasPermission(member.id, member.permission));
                //console.log(" ")

                if (hasPermission(member.id, member.permission)) {
                    response({type: "success", permission: "granted", user: userObj});
                } else {
                    response({type: "success", permission: "denied", user: userObj});
                }
            }
        }
    });

    socket.on('kickUser', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(member.id == member.target){
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
            else{
                if(hasPermission(member.id, "kickUsers") == false){

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


                    if(kicker.info.sortId <= kicking.info.sortId){
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




    socket.on('banUser', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(member.id == member.target){
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "You cant ban yourself!",
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
            else{
                if(hasPermission(member.id, "banUsers") == false){

                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Missing permission!",
                        "message": "You cant ban that person.",
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

                    var banner = getMemberHighestRole(member.id);
                    var banning = getMemberHighestRole(member.target);

                    if(banner.info.sortId <= banning.info.sortId){
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                    "title": "Error!",
                                    "message": "You cant ban that person because its role is higher then yours",
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

                    if(banUser(member) == false){
                        return;
                    }

                    // Delete user from server
                    //member.target = escapeHtml(member.target);
                    //delete serverconfig.servermembers[member.target];
                    //saveConfig();

                    // Notify Admins
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Banned User!",
                        "message": "The user has been banned.",
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

                                if(member.reason.replaceAll(" ", "").length > 0){
                                    reasonText = `Reason: ${member.reason}`
                                }
                                else{
                                    reasonText = ` `;
                                }
                            }

                            sendMessageToUser(target.id, JSON.parse(
                                `{
                                    "title": "You have been banned",
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





    socket.on('muteUser', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(member.id == member.target){
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "You cant mute yourself!",
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
            else{
                if(hasPermission(member.id, "muteUsers") == false){

                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Missing permission!",
                        "message": "You cant mute that person.",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));
                }
                else {

                    var mod = getMemberHighestRole(member.id);
                    var userToMute = getMemberHighestRole(member.target);

                    if(mod.info.sortId <= userToMute.info.sortId){
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                    "title": "Error!",
                                    "message": "You cant mute that person because its role is higher then yours",
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

                    var mutedUntil = null;
                    var mutedStatus = muteUser(member);
                    if(mutedStatus == false){
                        return;
                    }
                    else{
                        mutedUntil = mutedStatus;
                    }

                    // Delete user from server
                    //member.target = escapeHtml(member.target);
                    //delete serverconfig.servermembers[member.target];
                    //saveConfig();

                    // Notify Admins
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                        "title": "Muted User!",
                        "message": "The user has been muted.",
                        "buttons": {
                            "0": {
                                "text": "Nice",
                                "events": ""
                            }
                        },
                        "type": "success",
                        "popup_type": "confirm"
                    }`));

                    io.emit("updateMemberList");

                    var reasonText = ""
                    if(member.reason.length > 0)
                        reasonText = `##Reason:#${member.reason}`;


                    if(member.time.length == 0){
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
                                    "title": "You have been muted until ${new Date(mutedStatus).toLocaleString()}",
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
        if(validateMemberId(member.id, socket) == true

        ) {

            var room = member.room.split('-');
            var group = room[0];
            var category = room[1];
            var channel = room[2];

            if(!checkUserChannelPermission(channel, member.id, "viewChannel")){

                sendMessageToUser(socket.id, JSON.parse(
                    `{
                                    "title": "Access denied",
                                    "message": "You dont have access to this channel.",
                                    "buttons": {
                                        "0": {
                                            "text": "Ok",
                                            "events": ""
                                        }
                                    },
                                    "type": "error",
                                    "popup_type": "confirm"
                                }`));

                if(userOldRoom.hasOwnProperty(member.id)){
                    socket.leave(userOldRoom[member.id])
                }

                socket.join(0);
                userOldRoom[member.id] = 0;
                return;
            }

            try{
                // If the channel exists
                if(serverconfig.groups[group].channels.categories[category].channel[channel] != null){

                    // If its a text channel
                    if(serverconfig.groups[group].channels.categories[category].channel[channel].type == "text"){

                        // Permission already checked above for text on default

                        // Update Room and save previous one
                        if(userOldRoom.hasOwnProperty(member.id)){
                            socket.leave(userOldRoom[member.id])
                        }
                        else{
                            userOldRoom[member.id] = [];
                        }
                        socket.join(escapeHtml(member.room));

                        userOldRoom[member.id].push(member.room);

                        // Check if the array has more than 2 entries
                        if (userOldRoom[member.id].length > 8) {
                            // Remove the oldest entry (the first element)
                            userOldRoom[member.id].shift();
                        }  

                        consolas(`User joined text room ${escapeHtml(member.room)}`.green, "Debug");
                    }
                    // If its a voice channel
                    else if(serverconfig.groups[group].channels.categories[category].channel[channel].type == "voice") {

                        // If user can use VC
                        if (!checkUserChannelPermission(channel, member.id, "useVOIP")) {
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

                            // Update Room and save previous one
                            if (userOldRoom.hasOwnProperty(member.id)) {
                                socket.leave(userOldRoom[member.id])
                            }

                            socket.join(0);
                            userOldRoom[member.id] = 0;
                            return;
                        }
                        
                        // Update Room and save previous one
                        if(userOldRoom.hasOwnProperty(member.id)){
                            socket.leave(userOldRoom[member.id])
                        }
                        else{
                            userOldRoom[member.id] = [];
                        }
                        
                        socket.join(escapeHtml(member.room));
                        userOldRoom[member.id].push(member.room);

                        // Check if the array has more than 2 entries
                        if (userOldRoom[member.id].length > 8) {
                            // Remove the oldest entry (the first element)
                            userOldRoom[member.id].shift();
                        }                        

                        consolas(`User joined VC room ${escapeHtml(member.room)} from room ${userOldRoom[member.id]}`.green, "Debug");
                    }

                }
            }
            catch(error){

                try{
                    socket.leave(escapeHtml(member.room));
                }
                catch (ww)
                {
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
        else{
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
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed username", "Debug");
            serverconfig.servermembers[member.id].name = escapeHtml(limitString(member.username, 30));
            saveConfig(serverconfig);

            io.emit("updateMemberList");
        }
    });

    socket.on('setDefaultChannel', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(hasPermission(member.id, "manageServer")){

                // Try to resolve channel first to see if it even exists
                let channel = resolveChannelById(member.value);

                // Couldnt find channel
                if(channel == null){
                    consolas(colors.red(`Channel with ID '${member.value}' wasnt found`))
                    response({type: "error", msg: `Channel with ID '${member.value}' wasnt found`});
                    return;
                }

                serverconfig.serverinfo.defaultChannel = escapeHtml(member.value);
                saveConfig(serverconfig);

                response({type: "success", msg: "Default Channel was successfully set"});
            }
            else{
                response({type: "error", msg: "You cant change the server name: Missing permissions"});
            }
        }
    });

    socket.on('updateServerName', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(hasPermission(member.id, "manageServerInfo")){
                consolas(`Changing servername from ${serverconfig.serverinfo.name} to ${escapeHtml(limitString(member.value, 200))}`, "Debug");

                serverconfig.serverinfo.name = escapeHtml(limitString(member.value, 200));
                saveConfig(serverconfig);

                response({type: "success", msg: "Server was successfully renamed"});
            }
            else{
                response({type: "error", msg: "You cant change the server name: Missing permissions"});
            }
        }
    });

    socket.on('updateServerDesc', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(hasPermission(member.id, "manageServerInfo")){
                consolas(`Changing server description from ${serverconfig.serverinfo.description} to ${escapeHtml(limitString(member.value, 500))}`, "Debug");

                serverconfig.serverinfo.description = escapeHtml(limitString(member.value, 500));
                saveConfig(serverconfig);

                response({type: "success", msg: "Server description was successfully changed"});
            }
            else{
                response({type: "error", msg: "You cant change the server description: Missing permissions"});
            }
        }
    });

    socket.on('setStatus', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed status", "Debug");
            serverconfig.servermembers[member.id].status = escapeHtml(limitString(member.status, 100));
            saveConfig(serverconfig);

            io.emit("updateMemberList");
        }
    });

    socket.on('setPFP', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed icon", "Debug");
            serverconfig.servermembers[member.id].icon = member.icon;
            saveConfig(serverconfig);

            io.emit("updateMemberList", );
        }
    });


    socket.on('getGroupList', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {
            io.to(usersocket[member.id]).emit("receiveGroupList", getGroupList(member));
        }
    });

    socket.on('getMemberList', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(!hasPermission(member.id, "viewGroup", member.group)){
                return;
            }

            io.to(usersocket[member.id]).emit("receiveMemberList", getMemberList(member, member.channel));
        }
    });


    socket.on('isTyping', function (member) {
        if(validateMemberId(member.id, socket, true) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            //consolas("Typing room: " + member.room);
            //consolas("Typing member id: " + member.id);

            // if user is muted dont do anything
            if(serverconfig.mutelist.hasOwnProperty(member.id)){
                return;
            }

            var username = serverconfig.servermembers[member.id].name;

            if(typingMembers.includes(username) == false){
                typingMembers.push(escapeHtml(username));
            }

            clearTimeout(typingMembersTimeout[username]);
            typingMembersTimeout[username] = setTimeout(() => {

                if(typingMembers.includes(username) == true){
                    typingMembers.pop(escapeHtml(username));
                }

                io.in(member.room).emit("memberTyping", typingMembers);

            }, 4 * 1000);

            //console.log(typingMembersTimeout[username]);

            io.in(member.room).emit("memberTyping", typingMembers);
        }
    });

    socket.on('stoppedTyping', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            //consolas("Stopped room: " + member.room);
            //consolas("Stopped id: " + member.id);

            var username = serverconfig.servermembers[member.id].name;

            if(typingMembers.includes(username) == true){
                typingMembers.pop(username);
            }

            io.in(member.room).emit("memberTyping", typingMembers);
        }
    });

    socket.on('getGroupBanner', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(!hasPermission(member.id, "viewGroup", member.group)){
                return;
            }

            io.to(usersocket[member.id]).emit("receiveGroupBanner", serverconfig.groups[member.group].info.banner);
        }
    });

    socket.on('getChatlog', async function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("Trying to get chat log", "Debug");
            var channel = member.channel;

            if(checkUserChannelPermission(channel, member.id, "viewChannelHistory") == true){
                io.to(usersocket[member.id]).emit("receiveChatlog", await getSavedChatMessage(member.group, member.category, member.channel, member.index));
            }
        }
    });

    socket.on('createCategory', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageChannels")){
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to create categories",
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

            try{
                var catId = generateId(4);
                serverconfig.groups[member.group].channels.categories[catId] = JSON.parse(
                    `{
                        "info": {
                            "id": ${catId},
                            "name": "${escapeHtml(member.value)}"
                        },
                        "channel": {
                        }
                    }
                        `);
                saveConfig(serverconfig);
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e){
                consolas("Couldnt create category".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{
            console.log("Invalid token?")
        }
    });

    socket.on('updateGroupBanner', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageGroups")){
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

            try{
                // Default Fallback Banner
                if(member.value == null || member.value.length <= 0){
                    member.value = "https://t4.ftcdn.net/jpg/04/46/93/93/360_F_446939375_83iP0UYTg5F9vHl6icZwgrEBHXeXMVaU.jpg";
                }

                member.value = escapeHtml(member.value);
                serverconfig.groups[member.group].info.banner = member.value;
                saveConfig(serverconfig);


                io.emit("updateGroupList");
                //io.emit("receiveGroupBanner", member.value); // bug
            }
            catch (e){
                consolas("Couldnt update group banner".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('updateGroupName', function (member, response) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageGroups")){
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

            try{

                var groupName = escapeHtml(member.groupName);
                var groupId = member.groupId;
                serverconfig.groups[groupId].info.name = groupName;
                saveConfig(serverconfig);

                response({type: "success", msg: "Group Name Updated"});

                io.emit("updateGroupList");
            }
            catch (e){
                consolas("Couldnt update group name".red, "Debug");
                consolas(colors.red(e), "Debug");

                response({type: "error", msg: "Unable to update group name"});
            }

        }
        else{

        }
    });

    socket.on('updateGroupPermissions', function (member, response) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageGroups")){
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

            try{

                var groupPerms = member.perms;
                var groupId = member.groupId;
                var role = member.roleId;
                serverconfig.groups[groupId].permissions[role] = groupPerms;
                saveConfig(serverconfig);


                io.emit("updateGroupList");
                response({type: "success", msg: "Group Permissions Updated"});

            }
            catch (e){
                consolas("Couldnt update group permissions".red, "Debug");
                consolas(colors.red(e), "Debug");

                response({type: "error", msg: "Unable to update group permissions"});
            }

        }
        else{

        }
    });

    socket.on('updateGroupIcon', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageGroups")){
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

            try{
                if(member.value == null || member.value.length <= 0){
                    member.value = "https://wallpapers-clan.com/wp-content/uploads/2022/05/cute-pfp-25.jpg";
                }

                member.value = escapeHtml(member.value);
                serverconfig.groups[member.group].info.icon = member.value;
                saveConfig(serverconfig);

                io.emit("updateGroupList");
            }
            catch (e){
                consolas("Couldnt update group icon".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('createChannel', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageChannels")){
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to create channels",
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

            try{
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
            }
            catch (e){
                consolas("Couldnt create channel".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('createGroup', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageGroups")){
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

            try{
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
                                                    "viewChannel": 1
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
            catch (e){
                consolas("Couldnt create category".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('deleteGroup', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ){
            if(serverconfig.groups[member.group].info.isDeletable == 0){
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

            if(!hasPermission(member.id, "manageGroups")){
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


            try{
                delete serverconfig.groups[member.group];
                saveConfig(serverconfig);

                io.emit("updateGroupList");
            }
            catch (e){
                consolas("Couldnt delete group ".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('deleteChannel', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageChannels")){
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to delete channels",
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

            try{
                var channelId = member.channelId.replace("channel-", "");
                var group = resolveGroupByChannelId(channelId);
                var category = resolveCategoryByChannelId(channelId);

                delete serverconfig.groups[group].channels.categories[category].channel[channelId];
                saveConfig(serverconfig);

                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e){
                consolas("Couldnt delete channel".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('deleteCategory', function (member) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(!hasPermission(member.id, "manageChannels")){
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                        "title": "Missing permissions!",
                        "message": "You arent allowed to delete categories",
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

            try{
                delete serverconfig.groups[member.group].channels.categories[member.category.replace("category-", "")];
                saveConfig(serverconfig);

                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e){
                consolas("Couldnt delete category".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{
            consolas("nope");
        }
    });

    socket.on('getCurrentChannel', function (member) {
        if(validateMemberId(member.id, socket) == true) {

            //consolas("Resolving Channel ID to Name", "Debug");
            //console.log(serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);

            try{
                if(checkUserChannelPermission(member.channel, member.id, "viewChannel") == true){
                    io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);
                }

            }
            catch{
                io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group]);
            }
        }
    });

    socket.on('deleteMessage', async function (member) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true && serverconfig.servermembers[member.id].token == member.token) {

            try{

                // mysql feature option
                if(serverconfig.serverinfo.sql.enabled == true){
                    await deleteChatMessagesFromDb(member.messageId);
                    io.emit("receiveDeleteMessage", member.messageId);
                    return;
                }


                var message = JSON.parse(fs.readFileSync(`./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`));

                if(message.id == member.id || hasPermission(member.id, "manageMessages")){

                    let path = `${member.group}/${member.category}/${member.channel}/${member.messageId}`;
                    if(path.includes("..")) return

                    fs.unlinkSync(`./chats/${path}`);
                    io.emit("receiveDeleteMessage", message.messageId);
                }
            }
            catch(error){
                consolas(`Couldnt delete file ./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`, "Debug");
                consolas(error, "Debug");
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

            if(serverconfig.servermembers[member.id].isOnline == 0 &&
                showedOfflineMessage[member.id] == false){
                showedOfflineMessage[member.id] = true;
                io.emit("memberOffline", serverconfig.servermembers[member.id].name);

                consolas(`Member ${member.id} is now offline`, "Debug");
            }
            else{
                //console.log(`Member ${member.id} is still online`);
            }

        }, 5 * 1000 * 60);


    });

    socket.on('getMemberProfile', async function (member) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try{
                io.to(usersocket[escapeHtml(member.id)]).emit("receiveMemberProfile",
                    {
                        "code":  await getMemberProfile(
                            escapeHtml(member.target)),
                        "top": member.posY,
                        "left": member.posX
                    }
                );
            }
            catch (e){
                consolas("Couldnt get member profile".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{
            consolas("Member not allowed to get it");
        }
    });

    socket.on('getEmojis', async function (member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try{

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

                if(emojiList.length > 0){
                    response({type: "success", data: emojiList, msg: "Successfully received emojis"})
                }
                else{
                    response({type: "error", data: null, msg: "No Emojis found"})
                }


            }
            catch (e){
                consolas("Couldnt get emojis".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('getBans', async function (member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try{


                if(!hasPermission(member.id, "manageBans")){
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

                    response({type: "error", msg: "You dont have permissions to manage Bans"});
                    return;
                }

                response({type: "success", data: serverconfig.banlist, msg: "Successfully received banlist"})


            }
            catch (e){
                consolas("Couldnt get emojis".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on('updateEmoji', async function (member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try{

                if(!hasPermission(member.id, "manageEmojis")){
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

                    response({type: "error", msg: "You dont have permissions to manage Emojis"});
                    return;
                }

                var oldEmoji = findEmojiByID(member.emojiId);
                var newEmoji = `emoji_${member.emojiId}_${member.emojiName}.${oldEmoji.split(".").pop()}`;

                //consolas("Updating Emoji".yellow, "Debug");
                //consolas("From: ".yellow + oldEmoji, "Debug");
                //consolas("To: ".yellow + newEmoji, "Debug");

                fs.rename('./public/emojis/' + oldEmoji, `./public/emojis/` + newEmoji, function(err) {
                    if ( err ){
                        response({type: "error", error: err, msg: "Couldnt update emoji"})
                    }
                    else{
                        response({type: "success", msg: "Emoji successfully updated"})
                    }
                });
            }
            catch (e){
                consolas("Couldnt get emojis".red, "Debug");
                consolas(colors.red(e), "Debug");
            }

        }
        else{

        }
    });

    socket.on("fileUpload", function(member, response) {
        checkRateLimit(socket);

        var filename;
        var localUploadPath;
        var fileId = generateId(12);

        member.filename = member.filename.replaceAll(" ", "_");

        if(member.type == null){
            localUploadPath = "./public/uploads";
            filename = "upload_" + fileId + "_" + escapeHtml(member.filename);
        }
        else if(member.type == "emoji"){

            if(!hasPermission(member.id, "manageEmojis")){
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

                response({type: "error", msg: "You dont have permissions to manage Emojis"});
                return;
            }

            localUploadPath = "./public/emojis"
            filename = "emoji_" + fileId + "_" + escapeHtml(member.filename);
        }

        var cloudflareId = serverconfig.serverinfo.cfAccountId;
        var cloudflareToken = serverconfig.serverinfo.cfAccountToken;
        var cloudflareHash = serverconfig.serverinfo.cfHash;

        if(!hasPermission(member.id, "uploadFiles")){
            sendMessageToUser(socket.id, JSON.parse(
                `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to upload files ",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                            "popup_type": "confirm"
                        }`));

            response({type: "error", msg: "You dont have permissions to upload files"});
            return;
        }

        var { ext, mime } = fileTypeFromBuffer(member.file);

        fileTypeFromBuffer(member.file).then(filetype =>{
            // File Mime: filetype.mime
            // File Extension: filetype.ext
            if(filetype == null){
                response({type: "error", msg: "Unkown MIME type!"});
                return;
            }

            consolas("Upload File MIME Type: ".yellow + mime, "Debug");
            if(serverconfig.serverinfo.uploadFileTypes.includes(filetype.mime)){
                consolas("Upload File Extention Type: ".yellow + ext, "Debug");

                if (validateMemberId(member.id, socket) == true &&
                    serverconfig.servermembers[member.id].token == member.token
                ) {
                    var maxFolderSize = serverconfig.serverinfo.maxUploadStorage;


                    // If we want to save images to cloudflare
                    if (serverconfig.serverinfo.useCloudflareImageCDN == 1) {
                        consolas("Image is being uploaded to CDN".cyan);

                        const form = new FormData();
                        var cloudname = "uploaded_" + generateId(34);
                        form.append('file', member.file);
                        form.append('id', cloudname);

                        fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareId}/images/v1`, {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + cloudflareToken
                            },
                            body: form
                        }).then(result => {
                            //console.log(result);
                            //console.log(result.status);

                            // Lets check the result
                            if (result.status == 200) {
                                consolas("Uploaded url: " + `https://imagedelivery.net/${cloudflareHash}/${cloudname}/public`, "Debug");
                                response({type: "success", msg: `https://imagedelivery.net/${cloudflareHash}/${cloudname}/public`});
                            } else {
                                //response(result.code);
                                response({type: "error", msg: result.code});
                            }
                        })
                        return;


                        // We want images to be saved locally here
                    } else {
                        getSize(localUploadPath, (err, size) => {
                            if (err) { throw err; }

                            //console.log(size + ' bytes');
                            var fileSizeMB = (size / 1024 / 1024).toFixed(2);
                            var userRole = getMemberHighestRole(member.id);
                            var userUpload = userRole.permissions.maxUpload;


                            if(userUpload == null){
                                if(hasPermission(member.id, "bypassUploadLimit")){
                                    userUpload = 99999;
                                }
                                else{
                                    response({type: "error", msg: "You are not allowed to upload files"});
                                    return;
                                }
                            }

                            consolas("File Size in MB: " + fileSizeMB)

                            if(fileSizeMB > userUpload){
                                consolas("File Size was too big!" , "Debug");
                                consolas(`File Size of upload: ${fileSizeMB}` , "Debug");
                                consolas(`Max User Upload Size: ${ userRole.permissions.maxUpload}` , "Debug");

                                response({type: "error", msg: "File is too large"});
                                return;
                            }

                            //console.log((size / 1024 / 1024).toFixed(2) + ' MB ' + maxFolderSize);

                            var currentFolderSize = Math.round((size / 1024 / 1024).toFixed(2));


                            if(currentFolderSize < maxFolderSize){


                                consolas(`Member ${member.id} is uploading the file ${member.filename}`, "Debug");
                                var error;


                                try{
                                    fs.writeFileSync(localUploadPath + "/" + filename, member.file, function(err) {
                                        error = err;
                                    });
                                }
                                catch(err){
                                    error = err;
                                }


                                // IF everything worked out well, we can check if we want to
                                // upload it to cloudflare or not
                                if(error == null){
                                    consolas("Image is being uploaded to local server", "Debug");
                                    response({type: "success", msg: localUploadPath.replace("./public", "") + "/" + filename});

                                    return;
                                }

                                response({type: "error", msg: error});
                            }
                            else{
                                consolas(`Cannot upload file! Max Upload Size Limit ${maxFolderSize}MB reached!`.yellow);
                                response({type: "error", msg: "Server's max. upload limit reached"});
                            }


                        });
                    }
                }
            }
            else{
                response({type: "error", msg: "File type " + filetype.mime + " is not allowed on the server"});
                consolas("File Type for upload not allowed. File Type: " + filetype.mime)
            }
        });
    });

    socket.on("getServerInfo", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            var serverInfoObj = {
                name: serverconfig.serverinfo.name, 
                description: serverconfig.serverinfo.description,
                rateLimit: serverconfig.serverinfo.rateLimit,
                rateLimitDropInterval: serverconfig.serverinfo.dropInterval,
                defaultChannel: serverconfig.serverinfo.defaultChannel,
                uploadFileTypes: serverconfig.serverinfo.uploadFileTypes,
                messageLoadLimit: serverconfig.serverinfo.messageLoadLimit,
                commercialInfo: serverconfig.serverinfo.commercial
            };

            if(hasPermission(member.id, "manageServer")){
                // add more objects here
                serverInfoObj.useCloudflareImageCDN = serverconfig.serverinfo.useCloudflareImageCDN
                serverInfoObj.cfAccountId = serverconfig.serverinfo.cfAccountId
                serverInfoObj.cfAccountToken = serverconfig.serverinfo.cfAccountToken
                serverInfoObj.cfHash = serverconfig.serverinfo.cfHash
                serverInfoObj.maxUploadStorage = serverconfig.serverinfo.maxUploadStorage
            }


            response(serverInfoObj);
        }
        else{
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getGroupInfo", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if(hasPermission(member.id, "manageGroups")){

                var groupObj = serverconfig.groups[member.group];
                response({type: "success", msg: "Successfully resolved group", data: groupObj });
            }
            else{
                response({type: "error", msg: "You dont have the permissions to manage groups"})
            }
        }
        else{
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getChannelInfo", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if(hasPermission(member.id, "manageChannels")){

                var channelObj = resolveChannelById(member.channel.replace("channel-", ""));
                response({type: "success", msg: "Successfully resolved channel", data: channelObj });
            }
            else{
                response({type: "error", msg: "You dont have the permissions to manage channels"})
            }
        }
        else{
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("updateChannelName", function(member, response) {
        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if(hasPermission(member.id, "manageChannels")){

                var group = resolveGroupByChannelId(member.channel);
                var category = resolveCategoryByChannelId(member.channel);

                serverconfig.groups[group].channels.categories[category].channel[member.channel].name = member.name;
                saveConfig(serverconfig);

                response({type: "success", msg: "Successfully updated channel name"});

                // Let everyone know about the update
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            else{
                response({type: "error", msg: "You dont have the permissions to manage channels"})
            }
        }
        else{
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getServerRoles", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if(hasPermission(member.id, "manageRoles")){
                response(serverconfig.serverroles);
            }
            else{
                response({type: "error", msg: "You dont have the permissions to manage server roles"})
            }
        }
        else{
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on("getGroupChannels", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if(hasPermission(member.id, "manageChannels") ||
                hasPermission(member.id, "manageGroup") ||
                hasPermission(member.id, "manageGroups")){

                response(serverconfig.groups);
            }
            else{
                response({type: "error", msg: "You dont have the permissions to manage group channels"})
            }
        }
        else{
            consolas("ID or Token was invalid while requesting server information", "Debug");
            consolas(`ID: ${member.id}`.yellow, "Debug");
            consolas(`Token: ${member.token}`.yellow, "Debug");
        }
    });

    socket.on('updateChannelHierarchy', function (member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageChannels") ||
                hasPermission(member.id, "manageGroup") ||
                hasPermission(member.id, "manageGroups"))
            {
                try{
                    serverconfig.groups = member.sorted;

                    saveConfig(serverconfig);

                    response({type: "success", msg: "Changes were successfully applied"});

                    // Update Channel Hierarchy for everyone
                    io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
                    io.emit("receiveChannelTree", getChannelTree(member));

                    // Update Group Hierarchy for everyone
                    io.emit("updateGroupList");
                }
                catch(e){
                    consolas("Unable to sort roles".red);
                    console.log(e);
                }
            }
            else{
                response({type: "error", msg: "denied"});
            }
        }
    });

    socket.on("saveMediaSettings", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageUploads")){
                try{

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

                    response({type: "success", msg: "Settings saved successfully, please try to upload a profile picture to see if it works."})
                }
                catch(error){
                    response({type: "error", msg: "Server couldnt save settings: " + error})
                }
            }
            else{
                response({type: "error", msg: "You dont have the permissions to manage the upload settings"})
            }

        }
    });

    socket.on("saveRateSettings", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if(hasPermission(member.id, "manageRateSettings")){
                try{

                    /*
                    consolas("Server Rate Settings are being changed!".yellow);
                    consolas(`Rate Limit: ${member.newRateLimit}`);
                    consolas(`Drop Interval: ${member.newDropIntervaö}`);

                     */

                    serverconfig.serverinfo.rateLimit = member.newRateLimit;
                    serverconfig.serverinfo.dropInterval = member.newDropInterval;
                    saveConfig(serverconfig);

                    response({type: "success", msg: "Settings saved successfully."})
                }
                catch(error){
                    response({type: "error", msg: "Server couldnt save rate settings: " + error})
                }
            }
            else{
                response({type: "error", msg: "You dont have the permissions to manage the rate settings"})
            }

        }
    });

});

export function saveConfig(config){

    if(config == null){
        consolas(colors.red("No Config Content passed"))
        consolas(colors.red(console.trace()))
        return;
    }

    // should turn this in a function tbh
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    var tmp_prefix = "[" + dateTime + "] ";
    var consolePrefix = tmp_prefix;
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

    fs.writeFileSync("./config.json", JSON.stringify(config, false, 4), function(err) {
        if(err) {
            return console.log(err);
        }
        consolas("The config file ".cyan + colors.cyan("./logs/error_" + date + ".txt") + " was saved!".cyan);
    });

    // reread config (update in program)
    reloadConfig();
}

export function reloadConfig(){
    // reread config (update in program)
    serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));
}

export function setServer(content){
    server = content
}

export function setRatelimit(ip, value){
    ratelimit[ip] = value
}

export function flipDebug(){
    debugmode = !debugmode;
}