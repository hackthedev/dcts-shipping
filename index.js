// express und http Module importieren. Sie sind dazu da, die HTML-Dateien
// aus dem Ordner "public" zu veröffentlichen.

import {createRequire} from "module";
const require = createRequire(import.meta.url)

var express = require('express');
var app = express();

var https = require('https');
const fs = require("fs");

// Depending on the SSL setting, this will switch.
// Localhost Implementation
var server; // = require('http').createServer(app)


var FormData = require('form-data');
const fetch = require('node-fetch')
const getSize = require('get-folder-size');
//var fileType = import("file-type")
import {fileTypeFromBuffer} from 'file-type';
import {channel} from "diagnostics_channel";

const colors = require('colors');
var request = require('request');
//require('whatwg-fetch')

var usersocket = []
var showedOfflineMessage = [];

var typingMembers = [];
var typingMembersTimeout = [];

var ratelimit = [];
var socketToIP = [];

var debugmode = false;
var versionCode = 645;


async function consolas(text, event = null){
    return new Promise((resolve, reject) => {

        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var dateTime = date+' '+time;
        var tmp_prefix = "[" + dateTime + "] ";
        var consolePrefix = tmp_prefix;


        if(event == null){
            console.log(consolePrefix + text);
        }
        else{
            if(event == "Debug"){
                if(debugmode == true){
                    if(text.length == 0){
                        consolePrefix = "";
                    }

                    console.log(consolePrefix + text);
                }
            }
            else{
                if(text.length <= 0 || text == null){
                    console.log(" ");
                }
                else{
                    console.log(consolePrefix + `[${event}] `  + text);
                }


            }
        }

        resolve(true);
    });
}

async function checkVersionUpdate() {
    return new Promise((resolve, reject) => {
        var badgeUrl = 'https://raw.githubusercontent.com/hackthedev/dcts-shipping/main/version';


        (async function () {
            const res = await fetch(badgeUrl)
            //console.log(res);

            if(res.status == 404){
                resolve(null);
                return null;
            }
            else if(res.status == 200){
                const onlineVersionCode = await res.text();
                //console.log(html)

                if(onlineVersionCode > versionCode){
                    resolve(onlineVersionCode.replaceAll("\n\r", "").replaceAll("\n", ""));
                    return onlineVersionCode.replaceAll("\n\r", "").replaceAll("\n", "");
                }
                else{
                    resolve(null);
                    return null;
                }

                resolve(html);
                return html;
            }
            else{
                resolve(null);
                return null;
            }
        })()


    });

    return prom;
}

console.clear();


// If directory does not exist, create it
if (!fs.existsSync("./logs")){
    fs.mkdirSync("./logs");
}

// If directory does not exist, create it
if (!fs.existsSync("./public/emojis")){
    fs.mkdirSync("./public/emojis");
}

// If directory does not exist, create it
if (!fs.existsSync("./public/sounds")){
    fs.mkdirSync("./public/sounds");
}

// If directory does not exist, create it
if (!fs.existsSync("./config_backups")){
    fs.mkdirSync("./config_backups");
}

// if upload directory exists
if (!fs.existsSync("./public/uploads")){
    fs.mkdirSync("./public/uploads");
}

// if config.json exists
try {
    if (fs.existsSync("./config.json")) {
        consolas("Config file config.json did exist".yellow, "Debug");
    }
    else{
        consolas("Config file config.json didnt exist.".yellow, "Debug");
        consolas("Checking for template file...".yellow, "Debug");

        // config.json didnt exist. Does template config exist?
        if (fs.existsSync("./config.example.json")) {

            consolas("Trying to copy template file".yellow, "Debug");

            // Trying to copy file
            try {
                fs.copyFileSync("./config.example.json", "./config.json");
                consolas(" ", "Debug");
                consolas("Successfully copied config.example.json to config.json".green, "Debug");
            }
            catch (error){
                consolas("Coudlnt copy template file ".red + colors.red(error), "Debug");
            }
        }
        else{
            consolas("Neither the config.json file nor the config.example.json file were found.".red, "Debug");
            consolas("Server was terminated.".red, "Debug");
            process.exit();
        }
    }
} catch(err) {
    console.error(err);
    exit();
}

consolas(" ", "Debug");
consolas(" ", "Debug");
consolas(" ", "Debug");
consolas(" ", "Debug");

consolas(colors.brightGreen(`Welcome to DCTS`));
consolas(colors.brightGreen(`Stay up-to-date at https://dcts.chat`));
consolas(" ");
consolas(colors.cyan(`You're running version ` + versionCode));

var checkVer = await checkVersionUpdate();
if(checkVer != null){
    consolas(colors.cyan.underline(`New version ${checkVer} is available!`));
    consolas(" ");
    consolas(colors.cyan(`Download: https://github.com/hackthedev/dcts-shipping/releases`));
}

consolas(" " );
consolas(" ");

// Holy Server Config File
var serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));


if(serverconfig.serverinfo.ssl.enabled == 1){
    console.log("Yes");

    server = https.createServer({
        key: fs.readFileSync(serverconfig.serverinfo.ssl.key),
        cert: fs.readFileSync(serverconfig.serverinfo.ssl.cert),
        ca: fs.readFileSync(serverconfig.serverinfo.ssl.chain),

        requestCert: false,
        rejectUnauthorized: false },app);

    consolas("Running Server in public (production) mode.".green);
    consolas(" ");
}
else{
    consolas("Running Server in localhost (testing) mode.".yellow);
    consolas("If accessed via the internet, SSL wont work and will cause problems".yellow);
    consolas(" ");

    server = require('http').createServer(app);
}


// Get list of Channels in Category
// serverconfig.groups["0"].channels.categories["34"].channel

// Get channel
// serverconfig.groups["0"].channels.categories["34"].channel["79"]

// Get categories inside group
// serverconfig.groups["0"].channels.categories

// Get Group
// serverconfig.groups["0"]


process.on('uncaughtException', function(err) {

    // Handle the error safely
    consolas("");
    consolas("");
    consolas("UNEXPECTED ERROR".red);
    //consolas("============================================".red);
    //consolas(" !!! UNEXPECTED ERROR !!!".red);
    //consolas("============================================".red);
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


    // Create the config file
    fs.writeFile("./config_backups/config_" + date + ".txt", JSON.stringify(serverconfig, false, 4), function(err) {
        if(err) {
            return console.log(err);
        }
        consolas("The config file ".cyan + colors.white("./logs/error_" + date + ".txt") + " was saved!".cyan, "Debug");
    });
})



process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (text) {
    var data = text.trim();

    var args = data.split(" ");
    var command = args[0];

    try{
        if (command == 'reload') {
            serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));
            consolas("Reloaded config".cyan);
        }
        if (command == 'debug') {
            debugmode = !debugmode;
            consolas(`Debug Mode set to ${debugmode}`.cyan);
        }
        else if (command == 'roles') {
            var serverroles = serverconfig.serverroles;
            var serverRolesSorted = []

            console.log("");
            console.log("Server Roles:".cyan);

            // Add them to array for sorting
            Object.keys(serverroles).forEach(function(role) {
                serverRolesSorted.push(serverconfig.serverroles[role]);
            });

            // Sort Server Roles by sortId
            serverRolesSorted = serverRolesSorted.sort((a, b) => {
                if (a.info.sortId > b.info.sortId) {
                    return -1;
                }
            });

            serverRolesSorted.forEach(role => {
                console.log(colors.yellow("- " + role.info.id));
                console.log("   - " + role.info.name);
                console.log("");
            })
        }
        else if(command == "token"){
            if(args.length == 2){

                var roleIdArg = args[1];

                if(isNaN(roleIdArg) == false){
                    try{
                        var roleToken = generateId(64);
                        serverconfig.serverroles[roleIdArg].token.push(roleToken);
                        saveConfig();

                        consolas(colors.cyan(`Redeem key generated for role ${serverconfig.serverroles[roleIdArg].info.name}`));
                        consolas(colors.cyan(roleToken))
                    }
                    catch (Err){
                        consolas("Couldnt save or generate key".yellow);
                        consolas(colors.red(Err));
                    }
                }
            }
            else{
                consolas(colors.yellow(`Missing Argument: Role ID`));
            }

        }
        else if (command == 'delete') {
            if(args.length == 3){
                if(args[1] == "user"){
                    if(args[2].length == 12){
                        if(serverconfig.servermembers[args[2]] != null){
                            delete serverconfig.servermembers[args[2]];
                            consolas(`Deleting user ${args[2]}`.cyan);
                            saveConfig();
                        }
                        else{
                            consolas(`Couldnt find user ${args[2]}`.yellow);
                        }
                    }
                    else{
                        consolas(`${args[2]} seems to be a invalid id`.yellow);
                    }
                }
            }
            else{
                consolas("Syntax error: delete <option> <value> ".cyan + command);
            }
        }
        else{
            consolas("Unkown command: ".cyan + command);
        }
    }
    catch(e){
        consolas("Couldnt handle command input".red)
        consolas(colors.red(e))
    }
});




// Mit dieser zusätzlichen Zeile bringen wir Socket.io in unseren Server.
var io = require('socket.io')(server, {
    maxHttpBufferSize: 1e8,
    secure: true
});



// Mit diesem Kommando starten wir den Webserver.
var port = process.env.PORT || serverconfig.serverinfo.port;
server.listen(port, function () {
// Wir geben einen Hinweis aus, dass der Webserer läuft.

    consolas(colors.brightGreen('Server is running on port ' + port));

    if(serverconfig.serverinfo.setup == 0){

        var adminToken = generateId(64);
        serverconfig.serverinfo.setup = 1;
        serverconfig.serverroles["1111"].token.push(adminToken);
        saveConfig();


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

        console.log(colors.cyan(`Available Server Admin Token(s):`));
        console.log(colors.cyan(serverconfig.serverroles["1111"].token));
        consolas(colors.brightGreen(` `));
        consolas(colors.brightGreen(` `));
    }

});

function getMemberLastOnlineTime(memberID){
    var lastOnline = serverconfig.servermembers[memberID].lastOnline / 1000;

    var today = new Date().getTime() / 1000;
    var diff = today - lastOnline;
    var minutesPassed = Math.round(diff / 60);

    return minutesPassed
}

// Hier teilen wir express mit, dass die öffentlichen HTML-Dateien
// im Ordner "public" zu finden sind.
app.use(express.static('./public'));

// === Ab hier folgt der Code für den Chat-Server

// Hier sagen wir Socket.io, dass wir informiert werden wollen,
// wenn sich etwas bei den Verbindungen ("connections") zu
// den Browsern tut.
io.on('connection', function (socket) {

    // Check if user ip is blacklisted
    var ip = socket.handshake.address;
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

    function getDateDayDifference(timestamp1, timestamp2, mode = null) {
        var difference = timestamp1 - timestamp2;
        var daysDifference = Math.round(difference/1000/60/60/24);

        return daysDifference;
    }


    socket.on('userConnected', function (member) {

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
                        saveConfig();

                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                        "title": "You've been unbanned!",
                        "message": "Please reload the page.",
                        "buttons": {
                            "0": {
                                "text": "Very nice",
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


        consolas(`Member connected. User: ${member.name} (${member.id})`, "Debug");

        if(member.id.length == 12 && isNaN(member.id) == false){

            consolas("Setting user " + member.id, "Debug")
            usersocket[member.id] = socket.id;


            if(serverconfig.servermembers[member.id] == null) {
                // New Member joined the server

                var userToken = generateId(48);
                io.to(usersocket[member.id]).emit("receiveToken", userToken);

                consolas("The member connected for the first time", "Debug");

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
                saveConfig();

                if(serverconfig.serverroles["0"].members.includes(member.id) == false){
                    consolas("Assigning new user default role", "Debug");
                    serverconfig.serverroles["0"].members.push(member.id);
                    saveConfig();
                }



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

                var tmpToken = member.token;
                member.token = null;

                io.emit("updateMemberList");

                // Save System Message and emit join event
                io.emit("newMemberJoined", member);
                var sysmsgcode =
                    `{
                        "id":"0",
                        "name":"${member.name}",
                        "icon":"",
                        "token":null,
                        "message":"${member.name} joined the server!",
                        "group":"0",
                        "category":"0",
                        "channel":"0",
                        "room":"0-0-0",
                        "timestamp": ${new Date().getTime()},
                        "messageId":"${generateId(12)}",
                        "color":"#FFFFFF"
                    }
                    `;

                saveChatMessage(JSON.parse(sysmsgcode));

                member.token = tmpToken;
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
                saveConfig();

                consolas("existing Member joined", "Debug");


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

                //response({type: "existingMember"});

            }
        }
        else{
            socket.disconnect();
            consolas("ID WAS WRONG ON USER JOIN ".red + member.id, "Debug");
        }
    });



    socket.on('redeemKey', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            var roles = serverconfig.serverroles;

            Object.keys(roles).forEach(function(roleId) {
                var role = roles[roleId];

                if(role.token.includes(member.value)){
                    try{
                        role.members.push(member.id);
                        //serverconfig.serverroles["0"].members.pop(member.id);
                        role.token.pop(member.value);
                        saveConfig();

                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                        "title": "${role.info.name} redeemed!",
                        "message": "",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": "closePrompt();"
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
                else{
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
            });
        }
    });



    socket.on('messageSend', function (member) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
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

            if(serverconfig.mutelist.hasOwnProperty(member.id)){

                var reasonText = ""

                // if reason is set
                if(serverconfig.mutelist[member.id].reason.length > 0)
                    var reasonText = `##Reason:#${serverconfig.mutelist[member.id].reason}`;

                if(serverconfig.mutelist[member.id].duration == -1){
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                                    "title": "You're muted!",
                                    "message": "You cant send messages until an admin unmutes you${reasonText}",
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
                else{

                    // Mute ran out
                    if(new Date(serverconfig.mutelist[member.id].duration).getTime() < new Date().getTime()){
                        delete serverconfig.mutelist[member.id];
                        serverconfig.servermembers[member.id].isMuted = 0;
                        saveConfig();
                    }
                    else{
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                    "title": "You're muted!",
                                    "message": "You cant send a message until ${new Date(serverconfig.mutelist[member.id].duration).toLocaleString()}${reasonText}",
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

                }


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


                    var messageid = generateId(12);
                    member.timestamp = new Date().getTime();
                    member.messageId = messageid;

                    member.icon = escapeHtml(member.icon);
                    member.name = escapeHtml(member.name);
                    member.message = escapeHtml(member.message);

                    member.message = convertMention(member);
                    member.lastOnline = new Date().getTime();

                    if(member.message.replaceAll(" ", "") == null){
                        consolas(colors.red("Message was null"))
                        return
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
                            var text = member.message.replaceAll(emoji + ":", ``).replaceAll(" ", "");

                            if(text.length == 0){
                                sendBigEmoji = "big"
                            }
                        }
                        catch (err){
                            consolas(colors.red("Emoji Convertion test error"));
                        }
                    });

                    // Actually replaces the text with the emoji and displays it
                    member.message.replace(reg, function (emoji) {
                        try{
                            var emojiName = findEmojiByID(emoji.replaceAll(":", "")).split("_")[2].split(".")[0];
                            member.message = member.message.replaceAll(emoji + ":", `<span><img title="${emojiName}" onerror="this.src='/img/error.png'" class="inline-text-emoji ${sendBigEmoji}" src="/emojis/${findEmojiByID(emoji.replaceAll(":", ""))}"></span>`);

                        }
                        catch{

                        }
                    });

                    /*
                    if(emojiCode.length > 0){
                        // match(":(.*):")
                        var matched = member.message.search(`(:)\\w+`);
                        console.log(matched);

                        member.message = member.message.replaceAll(`(:)\\w+`, `<span><img class="inline-text-emoji" src="/emojis/${findEmojiByID(emojiCode)}"></span>`);
                    }

                     */


                    //member.message = markdown(member.message, messageid, member.room);
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


                    // Save the Chat Message to file
                    saveChatMessage(member);

                    // Remove user from typing
                    var username = serverconfig.servermembers[member.id].name;
                    if(typingMembers.includes(username) == true){
                        typingMembers.pop(username);
                    }
                    io.in(member.room).emit("memberTyping", typingMembers);

                    // Send message
                    io.in(member.room).emit("messageCreate", member);
                    io.emit("markChannelMessage", {group: member.group, category: member.category, channel: member.channel});

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

    socket.on('getChannelTree', function (member, response) {
        if(validateMemberId(member.id, socket) == true
        ) {

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

                    returnRole.push(sortedRoles[role]);
                }
            });



            io.emit("updateMemberList");
            response({type: "success", data: returnRole});
            //io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
        }
    });

    function httpGetAsync(theUrl, callback, id)
    {
        // create the request object
        var XMLHttpRequest = require('xhr2');
        var xmlHttp = new XMLHttpRequest();

        // set the state change callback to capture when the response comes in
        xmlHttp.onreadystatechange = function()
        {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            {
                callback(xmlHttp.responseText, id);
            }
        }

        // open as a GET call, pass in the url and set async = True
        xmlHttp.open("GET", theUrl, true);
        //xmlHttp.setRequestHeader('Content-Type', 'application/json');

        /*
        xmlHttp.setRequestHeader('Access-Control-Allow-Headers', '*');
         xmlHttp.setRequestHeader('Content-Type', 'application/json');
        xmlHttp.setRequestHeader('Access-Control-Allow-Headers', '*');
        xmlHttp.setRequestHeader("Access-Control-Allow-Origin", "*")
        xmlHttp.setRequestHeader("Access-Control-Allow-Methods", "DELETE, POST, GET, OPTIONS")

         */

        // call send with no params as they were passed in on the url string
        xmlHttp.send(null);

        return;
    }

    function tenorCallback_search(responsetext, id)
    {
        // Parse the JSON response
        var response_objects = JSON.parse(responsetext);

        var top_10_gifs = response_objects["results"];

        // load the GIFs -- for our example we will load the first GIFs preview size (nanogif) and share size (gif)


        top_10_gifs.forEach(gif => {

            io.to(usersocket[id]).emit("receiveGifImage", {gif: gif.media_formats.gif.url, preview: gif.media_formats.gifpreview.url});
            /*
            document.getElementById("emoji-entry-container").insertAdjacentHTML("beforeend",
                `<img
                    onclick="sendGif('${gif.media_formats.gif.url}')" src="${gif.media_formats.gifpreview.url}"
                    onmouseover="changeGIFSrc('${gif.media_formats.gif.url}', this);"
                    onmouseleave="changeGIFSrc('${gif.media_formats.gifpreview.url}', this);"
                    style="padding: 1%;border-radius: 20px;float: left;width: 48%; height: fit-content;">`
                */
        })



        //document.getElementById("share_gif").src = top_10_gifs[0]["media_formats"]["gif"]["url"]; top_10_gifs[0]["media_formats"]["gif"]["url"]

        return;

    }

    function searchTenor(search, id)
    {
        // set the apikey and limit
        var apikey = serverconfig.serverinfo.tenor.api_key;
        var clientkey = serverconfig.serverinfo.tenor.client_key;
        var lmt = serverconfig.serverinfo.tenor.limit;

        // test search term
        var search_term = search;

        // using default locale of en_US
        var search_url = "https://tenor.googleapis.com/v2/search?q=" + search_term + "&key=" +
            apikey +"&client_key=" + clientkey +  "&limit=" + lmt;

        httpGetAsync(search_url,tenorCallback_search, id);

        // data will be loaded by each call's callback
        return;
    }

    socket.on('searchTenorGif', function (member, response) {
        if(validateMemberId(member.id, socket) == true
        ) {
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

        if(validateMemberId(member.id, socket) == true
        ) {

            if(hasPermission(member.id, "manageEmojis")){
                try{

                    try {
                        fs.unlinkSync(`./public/emojis/${member.emoji}`);

                        console.log("Deleted Emoji successfully.");
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

            if(hasPermission(member.id, "resolveMembers")){
                try{

                    var resolved = serverconfig.servermembers[member.target];
                    var tmp = resolved.token;

                    resolved.token = null;
                    response({type: "success", msg: "User Data was resolved", data: resolved });
                    resolved.token = tmp;
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

            if(hasPermission(member.id, "muteUsers")){

                if(serverconfig.mutelist.hasOwnProperty(member.target)){
                    delete serverconfig.mutelist[member.target];
                    //response({type: "success", msg: `The user ${serverconfig.servermembers[member.target].name} has been unmuted` });
                }
                else{
                    //response({type: "error", msg: `The user ${serverconfig.servermembers[member.target].name} isnt muted` });
                }


                serverconfig.servermembers[member.target].isMuted = 0;
                saveConfig();

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

            if(hasPermission(member.id, "manageBans")){
                try{

                    serverconfig.servermembers[member.target].isBanned = 0;
                    delete serverconfig.banlist[member.target];
                    saveConfig();

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

            if(hasPermission(member.id, "manageMembers")){
                try{
                    var highestUserRole = getMemberHighestRole(member.id);

                    // If user is not a admin they cant assign roles that are higher
                    if(!hasPermission(member.id, "administrator")){
                        if(serverconfig.serverroles[member.role].info.sortId >= highestUserRole.info.sortId){
                            response({type: "error", msg: "You cant assign roles that are higher or equal then yours"});
                            return;
                        }
                    }

                    serverconfig.serverroles[member.role].members.push(member.target);
                    saveConfig();

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

            if(hasPermission(member.id, "manageMembers")){
                try{

                    // If user is not a admin they cant assign roles that are higher
                    if(!hasPermission(member.id, "administrator")){
                        if(serverconfig.serverroles[member.role].info.sortId >= highestUserRole.info.sortId){
                            response({type: "error", msg: "You cant remove roles that are higher or equal then yours"});
                            return;
                        }
                    }

                    serverconfig.serverroles[member.role].members.pop(member.target);
                    saveConfig();


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

            if(hasPermission(member.id, "manageRoles")){
                try{
                    serverconfig.serverroles[member.role].permissions = member.permissions;
                    saveConfig();

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

            if(hasPermission(member.id, "manageChannels")){
                try{
                    //console.log(member.role);
                    console.log(member.permissions);

                    var memberChannel = member.channel.replace("channel-", "");

                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role] = member.permissions;
                    saveConfig();

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

                    console.clear();

                    delete serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role];
                    saveConfig();

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
                    saveConfig();

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
                    saveConfig();

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
                    saveConfig();

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

                    saveConfig();

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

                    saveConfig();

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

                    saveConfig();

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
                        saveConfig();

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

    socket.on('checkPermission', function (member, response) {
        if(validateMemberId(member.id, socket) == true) {


            if(Array.isArray(member.permission)){

                //console.log("Checking for multiple permissions");

                var found = false;
                for (var i = 0; i < member.permission.length; i++) {

                    //console.log(member.permission[i])

                    if(hasPermission(member.id, member.permission[i])){
                        found = true;
                        response({type: "success", permission: "granted", user: serverconfig.servermembers[member.id]});
                    }
                    else{
                        // Dont do anything as it still loops
                    }
                }

                if(found == false){
                    response({type: "success", permission: "denied", user: serverconfig.servermembers[member.id]});
                }

            }
            else{ // Single permission check

                //console.log("Checking for single permissions");
                //console.log(member.permission + " - " + hasPermission(member.id, member.permission));
                //console.log(" ")

                if (hasPermission(member.id, member.permission)) {
                    response({type: "success", permission: "granted", user: serverconfig.servermembers[member.id]});
                } else {
                    response({type: "success", permission: "denied", user: serverconfig.servermembers[member.id]});
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
                    saveConfig();

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
                                            "events": "closePrompt();"
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

    function banUser(member){


        var duration = member.time;
        var bannedUntil = new Date().getTime();

        if(isNaN(duration) == true){
            sendMessageToUser(socket.id, JSON.parse(
                `{
                                "title": "Invalid Duration!",
                                "message": "Enter a number like 1,2,3 or leave it completely empty",
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


        if(duration == null || duration <= 0){
            duration = -1;
            bannedUntil += bannedUntil * 2
        }
        else{
            bannedUntil += (86400 * duration) * 1000;
            //bannedUntil = bannedUntil;
        }

        // Ban IP of User
        var ip = socket.handshake.address;
        if(!serverconfig.ipblacklist.hasOwnProperty(ip)){

            // Add IP to Blacklist
            //serverconfig.ipblacklist.push(ip);

            // Set Member to be banned
            serverconfig.servermembers[member.target].isBanned = 1;

            //console.log(bannedUntil);

            // Add member to banlist
            serverconfig.banlist[member.target] = JSON.parse(`
                        {
                            "bannedBy": "${member.id}",
                            "reason": "${member.reason}",
                            "until": ${bannedUntil}
                        }
                        `);

            saveConfig();


            consolas(` User ${serverconfig.servermembers[member.target].name} (IP ${ip}) was added to the blacklist because he was banned`.yellow);
            consolas(` Reason: ${member.reason}`);
            consolas(` Duration: ${duration}`);

            return true;
        }
    }


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

    function addMinutesToDate(date, minutes) {
        return new Date(date.getTime() + minutes*60000);
    }

    function muteUser(member){
        var duration = member.time;

        if(isNaN(duration) == true){
            sendMessageToUser(socket.id, JSON.parse(
                `{
                                "title": "Invalid Duration!",
                                "message": "Enter a number like 1,2,3 or leave it completely for permanent mute until removed",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": ""
                                    }
                                },
                                "type": "error",
                                "popup_type": "confirm"
                            }`));
            return null;
        }

        if(duration == null || duration <= 0){
            duration = -1;
        }
        else{
            duration = new Date().getTime()+((60 * duration) * 1000);
        }

        if(!serverconfig.mutelist.hasOwnProperty(member.target)){

            // used for checks
            serverconfig.servermembers[member.target].isMuted = 1;

            // Add member to mutelist
            serverconfig.mutelist[member.target] = JSON.parse(`
                        {
                            "mutedBy": "${member.id}",
                            "reason": "${member.reason}",
                            "duration": ${duration}
                        }
                        `);

            saveConfig();

            consolas(` User ${serverconfig.servermembers[member.target].name} (IP ${ip}) was muted`.yellow);
            consolas(` Reason: ${member.reason}`);
            consolas(` Duration: ${duration}`);

            io.emit("updateMemberList");

            return duration;
        }
        else{
            serverconfig.servermembers[member.target].isMuted = 1;
            serverconfig.mutelist[member.target].duration = duration;
            saveConfig();

            io.emit("updateMemberList");

            return duration;
        }

        return true;
    }

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

                    console.log(member.time)

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

                socket.join(0);
                return;
            }

            try{
                if(serverconfig.groups[group].channels.categories[category].channel[channel] != null){
                    socket.join(escapeHtml(member.room));
                    consolas(`User joined room ${escapeHtml(member.room)}`.green, "Debug");
                }
            }
            catch(erorr){

                try{
                    socket.leave(escapeHtml(member.room));
                }
                catch (ww)
                {
                    console.log(ee)
                }

                consolas(`Couldnt find room ${member.room}`.yellow, "Debug");

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

    socket.on('sendVoiceData', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            io.emit("receiveVoiceData", member.voice);
        }
    });

    socket.on('setUsername', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed username", "Debug");
            serverconfig.servermembers[member.id].name = escapeHtml(member.username);
            saveConfig();

            io.emit("updateMemberList");
        }
    });

    socket.on('updateServerName', function (member, response) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if(hasPermission(member.id, "manageServerInfo")){
                consolas(`Changing servername from ${serverconfig.serverinfo.name} to ${escapeHtml(member.value)}`, "Debug");

                serverconfig.serverinfo.name = escapeHtml(member.value);
                saveConfig();

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
                consolas(`Changing server description from ${serverconfig.serverinfo.description} to ${escapeHtml(member.value)}`, "Debug");

                serverconfig.serverinfo.description = escapeHtml(member.value);
                saveConfig();

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
            serverconfig.servermembers[member.id].status = escapeHtml(member.status);
            saveConfig();

            io.emit("updateMemberList");
        }
    });

    socket.on('setPFP', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("User changed icon", "Debug");
            serverconfig.servermembers[member.id].icon = member.icon;
            saveConfig();

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

    socket.on('getChatlog', function (member) {
        if(validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            consolas("Trying to get chat log", "Debug");


            var channel = member.channel;

            if(checkUserChannelPermission(channel, member.id, "viewChannel") == true){
                io.to(usersocket[member.id]).emit("receiveChatlog", getSavedChatMessage(member.group, member.category, member.channel));
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
                saveConfig();
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
                saveConfig();


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
                saveConfig();

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
                saveConfig();


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
                saveConfig();

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
                `);

                saveConfig();
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

                saveConfig();
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
                saveConfig();

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
                saveConfig();

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
                saveConfig();

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

            consolas("Resolving Channel ID to Name", "Debug");
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

    socket.on('deleteMessage', function (member) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true && serverconfig.servermembers[member.id].token == member.token) {

            try{
                var message = JSON.parse(fs.readFileSync(`./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`));

                if(message.id == member.id || hasPermission(member.id, "manageMessages")){
                    fs.unlinkSync(`./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`);
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
                response({type: "error", msg: "This file type is not allowed on the server"});
                consolas("File Type for upload not allowed. File Type: " + filetype.mime)
            }
        });
    });

    socket.on("getServerInfo", function(member, response) {
        checkRateLimit(socket);

        if(validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            response(serverconfig.serverinfo);
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
                saveConfig();

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

                    saveConfig();

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
                    saveConfig();

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
                    saveConfig();

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



function hasPermission(id, permission, searchGroup = null){

    var foundPermission = false;
    var foundAdmin = false;
    var stopExecution = false;
    var userroles = resolveRolesByUserId(id);

    // This needs to be on top so it can check for administrator permissions
    // For each server role
    Object.keys(serverconfig.serverroles).forEach(function(role) {

        if(serverconfig.serverroles[role].members.includes(id)){

            if(serverconfig.serverroles[role].permissions["administrator"] == 1){
                // User is admin
                foundPermission = true;
                stopExecution = true;
                return true;

            }
            else if(serverconfig.serverroles[role].permissions[permission] == 1){
                // User has permission
                foundPermission = true;
                stopExecution = true;
                return true;
            }
            else if(serverconfig.serverroles[role].permissions[permission] == 0){
                if(stopExecution != true){
                    foundPermission = false;
                }
            }
            else{

            }
        }
        else{
        }
    });

    if(stopExecution == true){
        return foundPermission;
    }


    // Search Permission in specific group
    if(searchGroup != null){

        // For each Group Permission Role
        Object.keys(serverconfig.groups[searchGroup].permissions).forEach(function(permrole) {

            // If the user role includes the group role
            if(userroles.includes(permrole)){

                // For each permission of the group role
                Object.keys(serverconfig.groups[searchGroup].permissions[permrole]).forEach(function(perm) {

                    if(permission == perm && serverconfig.groups[searchGroup].permissions[permrole][perm] == 1) {
                        //console.log("Found permission " + perm);
                        //console.log("it was " + serverconfig.groups[searchGroup].permissions[permrole][perm])

                        foundPermission = true;
                        return true;
                    }
                    else  if(permission == perm && serverconfig.groups[searchGroup].permissions[permrole][perm] == 0) {
                        foundPermission = false
                    }
                });
            }

        });

        return foundPermission;
    }


    // For each group
    Object.keys(serverconfig.groups).forEach(function(group) {

        // For each Group Permission Role
        Object.keys(serverconfig.groups[group].permissions).forEach(function(permrole) {

            // If the user role includes the group role
            if(userroles.includes(permrole)){

                // For each permission of the group role
                Object.keys(serverconfig.groups[group].permissions[permrole]).forEach(function(perm) {

                    if(permission == perm && serverconfig.groups[group].permissions[permrole][perm] == 1) {

                        foundPermission = true;
                    }
                    else  if(permission == perm && serverconfig.groups[group].permissions[permrole][perm] == 0) {
                        foundPermission = false
                    }
                });
            }

        });


        userroles.forEach(userrole =>{

            if(serverconfig.groups[group].permissions[userrole] != null){
                if(serverconfig.groups[group].permissions[userrole][permission] == 1 ||
                    serverconfig.groups[group].permissions[userrole]["administrator"] == 1){
                    foundPermission = true;
                }
            }
        })
    });


    return foundPermission;
}

function checkUserChannelPermission(channel, userId, perm){

    var found = false;

    var userRoles = resolveRolesByUserId(userId);

    var group = resolveGroupByChannelId(channel);
    var category = resolveCategoryByChannelId(channel);

    userRoles.forEach(role =>{

        if(hasPermission(userId, "administrator")){
            found = true;
            return;
        }
        if(hasPermission(userId, "manageChannels")){
            found = true;
            return;
        }

        if(group != null && category != null && channel != null){
            //consolas(`serverconfig.groups[${group}].channels.categories[${category}].channel[${channel}].permissions[${role}][${perm}]`)

            // if the role is present in the channel perms
            if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions[role].hasOwnProperty(perm)){
                //consolas(colors.yellow("Channel has property"));

                // the role is allowed to see it
                if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions[role][perm] == 1){
                    found = true;
                }
                // when a channel is denying that role
                else if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions[role][perm] == 0){
                    found = false;
                    //consolas(colors.red("IS forbidden!"))
                    return false;
                }
            }
            // if the role isnt setup there dont allow entrance
            else{
                found = false
                //consolas("Channel does not have the property")
                return;
            }


            if(hasPermission(userId, perm)){
                found = true;
            }
            // if the channel wasnt setup yet with perms dont show it
            else if(serverconfig.groups[group].channels.categories[category].channel[channel].permissions == {} ){
                found = false;
                return;
            }
        }
        else{
            found = true;
        }
    })

    return found;

}

function resolveGroupByChannelId(id){

    /*
    console.log(" ");
    console.log(" ");
    console.log(" ");
    console.log("Resolving Group by Channel ID " + id);

     */

    var found = null;
    // Foreach Group
    Object.keys(serverconfig.groups).reverse().forEach(function(group) {

        //console.log(group);

        // For each Category
        Object.keys(serverconfig.groups[group].channels.categories).reverse().forEach(function(category) {


            //console.log(category);

            // For each Channel
            Object.keys(serverconfig.groups[group].channels.categories[category].channel).reverse().forEach(function(channelId) {

                if(channelId == id){
                    found = group;
                }
            });
        });
    });

    return found;
}

function resolveCategoryByChannelId(id){

    var found = null;
    // Foreach Group
    Object.keys(serverconfig.groups).reverse().forEach(function(group) {

        //console.log(group);

        // For each Category
        Object.keys(serverconfig.groups[group].channels.categories).reverse().forEach(function(category) {


            //console.log(category);

            // For each Channel
            Object.keys(serverconfig.groups[group].channels.categories[category].channel).reverse().forEach(function(channelId) {


                if(channelId == id){
                    found = category;
                }
            });
        });
    });

    return found;
}

function resolveRolesByUserId(id){

    var userRoles = [];
    // Foreach Group
    Object.keys(serverconfig.serverroles).reverse().forEach(function(roles) {

        if(serverconfig.serverroles[roles].members.includes(id) == true){

            if(userRoles.includes(roles) == false){
                userRoles.push(roles);
            }
        }

    });

    return userRoles;
}

function resolveChannelById(id){


    /*
    console.log(" ");
    console.log(" ");
    console.log(" ");
    console.log(" ");
    console.log("Looking for " + id);


     */

    var found = null;
    // Foreach Group
    Object.keys(serverconfig.groups).reverse().forEach(function(group) {

        //console.log("- Group: " + group);

        // For each Category
        Object.keys(serverconfig.groups[group].channels.categories).reverse().forEach(function(category) {


            //console.log("   - Category " + category);

            // For each Channel
            Object.keys(serverconfig.groups[group].channels.categories[category].channel).reverse().forEach(function(channelId) {
                //console.log("      Channel:  " + channelId);


                if(channelId == id){
                    //console.log("Found Channel")
                    found = serverconfig.groups[group].channels.categories[category].channel[id];
                    return serverconfig.groups[group].channels.categories[category].channel[id];
                }
            });
        });
    });

    //console.log("Finished")
    return found;
}


function checkRateLimit(socket){
    var ip = socket.handshake.address;

    //console.log("IP RATE LIMIT")
    //console.log(ip)

    if(ip == "::1" || ip.includes("127.0.0.1")){
        return;
    }

    if(ratelimit[ip] == null){
        ratelimit[ip] = 1;
    }else{
        ratelimit[ip]++;
    }

    //consolas(`${ip} Rate Limit: ${ratelimit[ip]}`)

    if(ratelimit[ip] > serverconfig.serverinfo.rateLimit){
        consolas("Limit exceeded".red);

        sendMessageToUser(socket.id, JSON.parse(
            `{
                        "title": "Rate Limited!",
                        "message": "Your connection was terminated.",
                        "buttons": {
                            "0": {
                                "text": "Ok",
                                "events": ""
                            }
                        },
                        "type": "error",
                        "popup_type": "confirm"
                    }`));

        socket.disconnect();

        if(!serverconfig.ipblacklist.includes(ip)){

            //serverconfig.ipblacklist.push(ip);
            //saveConfig();
            consolas(`IP ${ip} was added to the blacklist for rate limit spam`);
        }

        return;
    }

    setTimeout(() => {

        try{
            ratelimit[ip]--;
        }catch { }

    }, serverconfig.serverinfo.dropInterval * 1000);
}

async function getUserBadges(id) {
    return new Promise((resolve, reject) => {
        var badgeUrl = 'https://raw.githubusercontent.com/hackthedev/dcts-shipping/main/badges/' + serverconfig.servermembers[id].id;


        (async function () {
            const res = await fetch(badgeUrl)
            //console.log(res);

            if(res.status == 404){
                resolve(null);
                return null;
            }
            else if(res.status == 200){
                const html = await res.text()
                //console.log(html)
                resolve(html);
                return html;
            }
            else{
                resolve(null);
                return null;
            }
        })()


    });

    return prom;
}

async function getMemberProfile(id){

    var memberUsername = serverconfig.servermembers[id].name;
    var memberStatus = serverconfig.servermembers[id].status;
    var memberAboutme = serverconfig.servermembers[id].aboutme;
    var memberIcon = serverconfig.servermembers[id].icon;
    var memberBanner = serverconfig.servermembers[id].banner;
    var memberJoined = serverconfig.servermembers[id].joined;
    var memberLastOnline = serverconfig.servermembers[id].lastOnline;
    var isMuted = serverconfig.servermembers[id].isMuted;

    // member badges
    //console.log("URL");
    //console.log('https://raw.githubusercontent.com/hackthedev/dcts-shipping/main/badges/' + serverconfig.servermembers[id].token);

    // Show a small badge if the user is muted
    var mutedBadge = "";
    if(isMuted)
        mutedBadge = `<br><code class="joined" style="color: indianred; border: 1px solid indianred;">Muted</code>`

    // Handle User Badges
    var codi = await getUserBadges(id).then(result => {

        var badgeCode = "";
        if(result != null){

            var badges = JSON.parse(result);


            Object.keys(badges).forEach(function (badge) {
                //console.log(badge);
                //console.log(badges[badge].display);

                badgeCode += `<img class="profile_badge" src="https://raw.githubusercontent.com/hackthedev/dcts-shipping/main/badges/${badges[badge].icon}.png" title="${badges[badge].display}" />`;
            });
        }

        // <div id="profile_banner" style="background-image: url('${memberBanner}');"></div>
        var profile = `
        <div id="profile_banner" style="background-image: url('${memberBanner}')"></div>
    
        <div id="profile_pfp_container">
            <div id="profile_icon" style="background-image: url('${memberIcon}');"></div>
            
            <div id="profile_badge_container">
                ${badgeCode}
            </div>
        
    
        <div id="profile_content">
            <div id="profile_username"><h2 style="margin-bottom: 0 !important;">${memberUsername}</h2></div>
            <div id="profile_status">${memberStatus}</div>
            <hr>
    
            
            <h2 class="profile_headline">About Me</h2>
            <div class="profile_aboutme">            
                ${memberAboutme}<br><br>
                <code class="joined">Joined ${new Date(memberJoined).toLocaleString("narrow")}</code><br>
                <code class="joined">Last Online ${new Date(memberLastOnline).toLocaleString("narrow")}</code>
                ${mutedBadge}
            </div>
            <hr>
            
    
            <h2 class="profile_headline">Roles</h2>
            <div id="profile_roles">`;

        Object.keys(serverconfig.serverroles).reverse().forEach(function (role) {

            var roleColor = serverconfig.serverroles[role].info.color;
            var roleName = serverconfig.serverroles[role].info.name;

            if (serverconfig.serverroles[role].members.includes(id)) {
                profile += `<code class="role" id="${role}"><div class="role_color" style="background-color: ${roleColor};"></div>${roleName}</code>`;
            }
        });

        // Add Role Button
        profile += `<code style="cursor: pointer;" onclick="addRoleFromProfile(id);" class="role" id="addRole-${id}">+</code>`;
        profile += `</div>
            </div>
        </div>`;

        return profile;
    });

    return codi;
}

function convertMention(text){

    var pingedUsers;
    var userId;
    try{
        pingedUsers = text.message.replaceAll(/[\\<>@#&!]/g, "").split(" ");

        if(pingedUsers == null){
            return text.message;
        }

        for(let i = 0; i < pingedUsers.length; i++){
            try{
                userId = pingedUsers[i];
                userId = userId.replace(/\D/g,'');
                text.message = text.message.replaceAll(`&lt;@${userId}&gt;`, `<label class="mention" id="mention-${serverconfig.servermembers[userId].id}">@${serverconfig.servermembers[userId].name}</label>`);
            }
            catch (lolz){
                //consolas(colors.red(lolz), "Debug");
            }
        }

        return text.message;
    }
    catch (exe){
        console.log(exe)
    }
}

function getSavedChatMessage(group, category, channel){

    var dir = `./chats/${group}/${category}/${channel}/`;

    if (!fs.existsSync(dir)){
        consolas(`Directory ${dir} didnt exist`, "Debug");
        return;
    }

    var messages = [];
    fs.readdirSync(`./chats/${group}/${category}/${channel}/`).forEach(file => {

        var message = JSON.parse(fs.readFileSync(`./chats/${group}/${category}/${channel}/${file}`));


        if(message.message.includes("<br>") && (message.message.split("<br>").length-1) <= 1){
            message.message = message.message.replaceAll("<br>", "")
        }

        messages.push(message);
    });

    //console.log(messages);

    messages = messages.sort((a, b) => {
        if (a.timestamp < b.timestamp) {
            return -1;
        }
    });

    /*
    fs.readdirSync(`./chats/${group}/${category}/${channel}/`).forEach(file => {
        messages.push( JSON.parse(fs.readFileSync(`./chats/${group}/${category}/${channel}/${file}`)) );
    });


     */


    return messages;
}

function saveChatMessage(message){

    var group = message.group;
    var category = message.category;
    var channel = message.channel;


    if(message.message.includes("\n") && (message.message.split("\n").length-1) > 1){
        message.message = message.message.replaceAll("\n", "<br>")
    }

    // If directory does not exist, creat it
    if (!fs.existsSync(`./chats/${group}/${category}/${channel}/`)){
        fs.mkdirSync(`./chats/${group}/${category}/${channel}/`, { recursive: true });
    }

    // Create the chat file
    fs.writeFile(`./chats/${group}/${category}/${channel}/${message.messageId}`, JSON.stringify(message), function(err) {
        if(err) {
            return console.log(err);
        }
    });
}

function sendMessageToUser(socketId, data){
    io.to(socketId).emit("modalMessage", data);
}

function generateId(length) {
    let result = '1';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length-1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}



function getMemberList(member, channel){


    var code = "";

    var members = serverconfig.servermembers;
    var roles = serverconfig.serverroles;

    var sortedRoles = [];
    var offlineMember = []

    Object.keys(roles).reverse().forEach(function(role) {
        sortedRoles[roles[role].info.sortId] = roles[role];
    });

    // Foreach role
    sortedRoles = sortedRoles.reverse();
    sortedRoles.forEach(role =>{

        var noMembersInRole = true;
        // Role ID:
        // role

        // Role Object
        // roles[Role]


        // If role display is on
        if(role.info.displaySeperate == 1){

            // Foreach Role Member
            Object.keys(members).forEach(function(member) {

                // Member ID:
                // member

                // Do not show banned users
                if(serverconfig.servermembers[member].isBanned == 1){
                    return;
                }

                // Member Object
                // members[member]

                //console.log(member);
                //console.log(members[member]);

                // check here for highest role
                var highestMemberRole = getMemberHighestRole(member);


                if((role.members.includes(member)  && role.info.displaySeperate == 1) ||
                    role.info.id == 1){

                    if(role.info.id == 1 && getMemberLastOnlineTime(member) > 5){
                        if(!offlineMember.includes(member)){
                            offlineMember.push(member);
                        }
                    }

                    /*
                    // Only display role in member list if at least one user is present in the role
                    if(noMembersInRole == true){
                        code += `<div class="infolist-role" title="${role.info.name}">
                                    ${role.info.name}
                                    <hr style="margin-bottom: 16px;">
                                </div>`;

                        noMembersInRole = false;
                    }



                    code += `<div class="memberlist-container" id="${members[member].id}">
                                <img class="memberlist-img" id="${members[member].id}" src="${members[member].icon}" onerror="this.src = '/img/default_pfp.png';">
                                <div class="memberlist-member-info name" onclick="getMemberProfile('${members[member].id}');" id="${members[member].id}" style="color: ${role.info.color};">
                                    ${members[member].name}
                                </div>
                                <div class="memberlist-member-info status" id="${members[member].id}">
                                    ${members[member].status}
                                </div>
                            </div>`;

                     */

                    if(checkUserChannelPermission(channel, member, "viewChannel") == true){

                        if(highestMemberRole.info.displaySeperate == 1 && role.info.id != highestMemberRole.info.id && role.info.id != 1){
                            return;
                        }

                        var extraClassOffline = "";
                        if(role.info.id != 1){ // != Offline
                            if(getMemberLastOnlineTime(member) > 5){
                                return;
                            }
                        }
                        else{
                            if(getMemberLastOnlineTime(member) < 5){
                                return;
                            }
                            else{
                                extraClassOffline = "offline_pfp";
                            }
                        }

                        // this can hide offline members - potential setting
                        //if(offlineMember.includes(member)){
                        //    return;
                        //}

                        // hide online members from offline section
                        if(offlineMember.includes(member)){
                            offlineMember.pop(member);
                        }

                        if(noMembersInRole == true){
                            code += `<div class="infolist-role" title="${role.info.name}" style="color: ${role.info.color};">
                                    ${role.info.name}
                                    <hr style="margin-bottom: 16px;border: 1px solid ${role.info.color};">
                                </div>`;

                            noMembersInRole = false;
                        }

                        // If user is muted make it somehow visually known
                        var nameStyle = `${members[member].name}`
                        var statusStyle = `${members[member].status}`
                        if(members[member].isMuted){
                            nameStyle = `<s style="color: indianred;"><span style="font-style: italic;color:indianred">${members[member].name}</span></s>`;
                            statusStyle = `<s style="color: indianred;"><span style="font-style: italic;color:indianred">${members[member].status}</span></s>`;
                            extraClassOffline = "offline_pfp";
                        }


                        code += `<div class="memberlist-container" id="${members[member].id}">
                                <img class="memberlist-img ${extraClassOffline}" id="${members[member].id}" src="${members[member].icon}" onerror="this.src = '/img/default_pfp.png'">
                                <div class="memberlist-member-info name" 
                                onclick="getMemberProfile('${members[member].id}');" id="${members[member].id}" 
                                style="color: ${role.info.color};">
                                    ${nameStyle}
                                </div>
                                <div class="memberlist-member-info status" id="${members[member].id}" style="color: ${role.info.color};">
                                    ${statusStyle}
                                </div>
                            </div>`;

                    }

                }

            });
        }
    });

    return code;
}

function getMemberHighestRole(id){
    var roles = serverconfig.serverroles;
    var sortIndex = 0;
    var returnRole = null;

    Object.keys(roles).reverse().forEach(function(role) {
        //console.log(roles[role].members)

        if(roles[role].members.includes(id)){
            if(roles[role].info.sortId > sortIndex){
                sortIndex = roles[role].info.sortId;
                returnRole = roles[role];
            }
        }
    });

    if(returnRole == null){
        return roles["0"];
    }

    return returnRole;
}

function getGroupList(member){

    var code = "";
    var groups = serverconfig.groups;
    var addedGroups = []

    var userroles = resolveRolesByUserId(member.id);

    const groupCollection = groups;
    let sortedGroups = Object.keys(groupCollection).sort((a, b) => {
        return groupCollection[b].info.sortId - groupCollection[a].info.sortId
    });

    // Foreach channel in the category, display it on the web page
    sortedGroups = sortedGroups.map((key) => groupCollection[key]);
    sortedGroups.forEach(group => {

        // Admin
        if(hasPermission(member.id, "manageGroups") &&
            addedGroups.includes(group.info.id) == false
        ){
            addedGroups.push(group.info.id);
            code += `
                    <a onclick="setUrl('?group=${group.info.id}');" id="group-entry-${group.info.id}">
                        <div class="group-entry-marker" id="group-marker-${group.info.id}"></div>
                        <div class="server-entry">
                           <img title="${group.info.name}" id="${group.info.id}" class="server-icon" src="${group.info.icon}">
                        </div>
                    </a>`;
        }
        else {
            //reverse()

            // Normal user
            userroles.forEach(role => {
                try {
                    if (group.permissions[role].viewGroup == 1 &&
                        addedGroups.includes(group.info.id) == false
                    ) {
                        addedGroups.push(group.info.id);
                        code += `<a onclick="setUrl('?group=${group.info.id}');"><div class="server-entry">
                                    <img title="${group.info.name}" id="${group.info.id}" class="server-icon" src="${group.info.icon}">
                                </div></a>`;
                    }
                } catch {

                }
            });
        }

    });


    return code;
}

function getChannelTree(member){
    var group = member.group;

    var addedChannels = [];
    var addedCategories = [];

    //var treecode = "";
    var treecode = `<h2>${serverconfig.groups[group].info.name}</h2><hr>`;

    var groups = serverconfig.groups;
    var roles = serverconfig.serverroles;

    if(group == null || groups[group] == null){
        group = 0;
    }


    var groupCategories = groups[group].channels.categories;
    var showedCategory = false;

    /*
    if(serverconfig.groups[group].channels.length == null){
        if(hasPermission(member.id, "manageGroups")){
            console.log("checked perm")
            treecode += `<h2>${serverconfig.groups[group].info.name}</h2><hr>`;
        }
    }

     */

    const catCollection = serverconfig.groups[group].channels.categories;
    let sortedCats = Object.keys(catCollection).sort((a, b) => {
        return catCollection[b].info.sortId - catCollection[a].info.sortId
    });


    var added_channels = [];




    // Foreach channel in the category, display it on the web page
    sortedCats = sortedCats.map((key) => catCollection[key]);


    sortedCats.forEach(cat => {


        showedCategory = false;
        /*
        if(hasPermission(member.id, "viewGroup", member.group)){
            // Add Category
            treecode +=  "<details open>";
            treecode += `<summary class="categoryTrigger" id="category-${cat.info.id}" style="color: #ABB8BE;">${cat.info.name}</summary>`;
            treecode += `<ul>`
        }

         */

        if(hasPermission(member.id, "manageChannels", member.group) == true ){
            // Add Category
            treecode +=  "<details open>";
            treecode += `<summary class="categoryTrigger" id="category-${cat.info.id}" style="color: #ABB8BE;">${cat.info.name}</summary>`;
            treecode += `<ul>`
            showedCategory = true;
        }

        //showedCategory = false;

        const chanCollection = serverconfig.groups[group].channels.categories[cat.info.id].channel;
        let sortedChans = Object.keys(chanCollection).sort((a, b) => {
            return chanCollection[b].sortId - chanCollection[a].sortId
        });

        // For each Category, sort the category's channels
        sortedChans = sortedChans.map((key) => chanCollection[key]);
        sortedChans.forEach(chan => {
            //console.log(cat.info.name)

            //console.log(hasPermission(member.id, "manageChannels", member.group))

            if (
                hasPermission(member.id, "viewGroup", member.group) &&
                showedCategory == false && sortedChans.length > 0 &&
                checkUserChannelPermission(chan.id, member.id, "viewChannel")
            ){
                // Add Category
                treecode +=  "<details open>";
                treecode += `<summary class="categoryTrigger" id="category-${cat.info.id}" style="color: #ABB8BE;">${cat.info.name}</summary>`;
                treecode += `<ul>`
                showedCategory = true;
            }


            Object.keys(roles).forEach(function(role) {
                if(roles[role].members.includes(member.id)){
                    if(checkUserChannelPermission(chan.id, member.id, "viewChannel") || hasPermission(member.id, "manageChannels", member.group)){

                        if(added_channels.includes(chan.id + "_" + chan.name) == false){
                            treecode += `<a onclick="setUrl('?group=${group}&category=${cat.info.id}&channel=${chan.id}')"><li class="channelTrigger" id="channel-${chan.id}" style="color: #ABB8BE;">${chan.name}</li></a>`;
                            added_channels.push(chan.id + "_" + chan.name)
                        }

                    }
                    else{
                        //console.log(`User ${serverconfig.servermembers[member.id].name} was denied`)
                    }
                }
            });

        });

        /*
        if(sortedCats.length == null){

            if(hasPermission(member.id, "manageChannels")){
                if(showedCategory == false && addedCategories.includes(groupCategories[category].info.name) == false){

                    treecode +=  "<details open>";
                    treecode += `<summary class="categoryTrigger" id="${category}">${groupCategories[category].info.name}</summary>`;
                    treecode += `<ul>`

                    addedCategories.push(groupCategories[category].info.name)
                }
            }

        }

         */

        treecode += "</ul>";
        treecode += "</details>";

    });

    return treecode;
}


function isVideo(url) {
    return /\.(mp4|webp)$/.test(url);
}

function validateMemberId(id, socket, bypass = false){

    if(bypass == false){
        checkRateLimit(socket);
    }

    if(id.length == 12 && isNaN(id) == false){
        return true;
    }
    else{
        return false;
    }
}

function saveConfig(){
    fs.writeFileSync("./config.json", JSON.stringify(serverconfig, false, 4), function(err) {
        if(err) {
            return console.log(err);
        }
        consolas("The config file ".cyan + colors.cyan("./logs/error_" + date + ".txt") + " was saved!".cyan);
    });

    // reread config (update in program)
    serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));

    //io.emit("configUpdate");
}

function reloadConfig(){
    // reread config (update in program)
    serverconfig = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));
    consolas("Reloaded config".cyan);
}

function updateMember(){
    Object.keys(serverconfig.servermembers).forEach(function(k){
        //console.log(k + ' - ' + serverconfig.servermembers[k].name);
    });
}

function isImgUrl(url) {
    return new Promise((resolve, reject) => {
        return request( url, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                if(((response.headers['content-type']).match(/(image)+\//g)).length != 0){
                    resolve(true);
                    //return true;
                }else{
                    resolve(false);
                    //return false;
                }

                resolve(true);
                //return true;

            } else {
                resolve(false);
                //return false;
            }
        });
    });
    //return /\.(jpg|jpeg|png|webp|avif|gif)$/.test(url)
}

function linkify(text, messageid, roomid) {
    return new Promise((resolve, reject) => {

        var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

        return text.replace(urlRegex, function (url) {

            if (url.toLowerCase().includes("youtube") || url.toLowerCase().includes("youtu.be")) {


                resolve(createYouTubeEmbed(url));
                return createYouTubeEmbed(url);

            } else {

                isImgUrl(url).then((result) => {
                    console.log("result was " + result);

                    if (result == true) {
                        console.log("Returning img embed")

                        var code = `<a href="${url}" target="_blank">${url}</a><div class="iframe-container" id="${messageid}"><img class="image-embed" src="${url}"></div>`
                        io.in(roomid).emit("createMessageEmbed", {messageId: messageid, code: code});

                        resolve(`<a href="${url}" target="_blank">${url}</a><div class="iframe-container" id="${messageid}"><img class="image-embed" src="${url}"></div>`);
                        //return `<a href="' + url + '" target="_blank">' + url + '</a><div class="iframe-container" id="${messageid}"><img class="image-embed" src="${url}"></div>`;




                    } else if (isVideo(url)) {
                        console.log("Returning vid embed")

                        var code = `<div class="iframe-container" id="${messageid}" ><video width="560" height="315" class="video-embed" controls>
                            <source src="${url}">
                            </video></div>`;

                        io.in(roomid).emit("createMessageEmbed", {messageId: messageid, code: code});

                        resolve(`<div class="iframe-container" id="${messageid}" ><video width="560" height="315" class="video-embed" controls>
                            <source src="${url}">
                            </video></div>`);

                        //return `<div class="iframe-container" id="${messageid}" ><video width="560" height="315" class="video-embed" controls>
                        //<source src="${url}">
                        //</video></div>`;

                    } else {
                        console.log("Returning url")

                        var code = `<a href="${url}" target="_blank">${url}</a>`;
                        io.in(roomid).emit("createMessageLink", {messageId: messageid, code: code});
                        resolve('<a href="' + url + '" target="_blank">' + url + '</a>');
                        return '<a href="' + url + '" target="_blank">' + url + '</a>';
                    }
                })
            }
        });
    });
}

function createYouTubeEmbed(url, messageid){

    var videocode = url.replace("https://www.youtube.com/watch?v=", "").replaceAll(" ", "");

    var code = `<div class="iframe-container" id="${messageid}" ><iframe width="560" height="315" src="https://www.youtube.com/embed/${videocode}" 
                title="YouTube video player" frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;

    consolas("Resolving YouTube URL " + url);
    consolas("Resolved: " + videocode);
    consolas("Resolved URL: " + "https://www.youtube.com/embed/" + videocode);

    return code;

}

function markdown(text, messageid, roomid) {

    linkify(text, messageid, roomid);

    text = text
        .replace(/_(.*?)_/gim, '<i>$1</i>')
        .replace(/`(.*?)`/gim, '<code class="markdown">$1</code>')
        .replace(/´´´(.*?)´´´/gim, '<pre class="markdown">$1</pre>')
        .replace(/~~(.*)~~/gim, '<del>$1</del>')
        //.replace(/-(.*)/gim, '<li>$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*)\*/gim, '<i>$1</i>');

    return text;
}

function getEmojiCode(str, char1, char2) {
    return str.substring(
        str.indexOf(char1) + 1,
        str.lastIndexOf(char2)
    );
}




function escapeHtml(text) {

    if(text == null || text.length <= 0){
        return text;
    }

    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function findEmojiByID(id){
    // Get all local emojis

    var filename = "";
    fs.readdirSync("./public/emojis").forEach(file => {
        if(file.includes(id)){
            filename = file;
            return;
        }
    });

    return filename;
}
