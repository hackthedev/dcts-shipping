/*
    io in terms of input/output not socket.io
    everything that will handle stuff being read or written to the disk is here
 */
import { serverconfig, fs, path, colors, debugmode, saveConfig, reloadConfig, flipDebug, allowLogging } from "../../index.mjs"
import Logger from "./logger.mjs";
import { saveChatMessageInDb, getChatMessagesFromDb, decodeFromBase64, logEditedChatMessageInDb, getMessageLogsFromDb, getChatMessageById } from "./mysql/helper.mjs"

var serverconfigEditable = serverconfig;

export function logFile(filePath, text, callback = () => { }) {
    if (!allowLogging) return;

    const dir = path.dirname(filePath);

    // Ensure the directory exists
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            callback(err);
            return;
        }

        // Append to the file, creating it if it does not exist
        fs.appendFile(filePath, text + "\n", (err) => {
            if (err) {
                callback(err);
                return;
            }

            callback(null);
        });
    });
}

export async function consolas(text, event = null) {
    return new Promise((resolve, reject) => {

        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var dateTime = date + ' ' + time;
        var tmp_prefix = "[" + dateTime + "] ";
        var consolePrefix = tmp_prefix;

        logFile("./logs/events/log_" + date + ".txt", text);

        if (event == null) {
            console.log(consolePrefix + text);
        }
        else {
            if (event.toLowerCase() == "debug") {
                if (debugmode != false) {
                    if (text.length == 0) {
                        consolePrefix = "";
                    }

                    console.log(consolePrefix + text);
                }
            }
            else if (event.toLowerCase() == "log") {
                // Only display logs when debug is true
                if (debugmode != false) {
                    if (text.length == 0) {
                        consolePrefix = "";
                    }

                    console.log(consolePrefix + text);
                }
            }
            else {
                if (text.length <= 0 || text == null) {
                    console.log(" ");
                }
                else {
                    console.log(consolePrefix + `[${event}] ` + text);
                }


            }
        }

        resolve(true);
    });
}

export function checkServerDirectories() {
    // Emoji storage
    if (!fs.existsSync("./public/emojis")) {
        fs.mkdirSync("./public/emojis");
    }

    // Sounds used internally
    if (!fs.existsSync("./public/sounds")) {
        fs.mkdirSync("./public/sounds");
    }

    // Upload Directory
    if (!fs.existsSync("./public/uploads")) {
        fs.mkdirSync("./public/uploads");
    }

    // User Plugins Folder
    if (!fs.existsSync("./plugins")) {
        fs.mkdirSync("./plugins");
    }
}

export function checkFile(file, autocreate = false, content = ""){
    if (fs.existsSync(file)) {
        return true;
    }
    else{
        if(autocreate){
            fs.writeFileSync(file, content)
            return true
        }
    }

    return false;
}

export function checkConfigFile() {
    // if config.json exists
    try {
        if (checkFile("./config.json") === true) {
            consolas("Config file config.json did exist".yellow, "Debug");
        }
        else {
            consolas("Config file config.json didnt exist.".yellow, "Debug");
            consolas("Checking for template file...".yellow, "Debug");

            // config.json didnt exist. Does template config exist?
            if (checkFile("./config.example.json") === true) {

                consolas("Trying to copy template file".yellow, "Debug");

                // Trying to copy file
                try {
                    fs.copyFileSync("./config.example.json", "./config.json");
                    consolas(" ", "Debug");
                    consolas("Successfully copied config.example.json to config.json".green, "Debug");
                }
                catch (error) {
                    consolas("Coudlnt copy template file ".red + colors.red(error), "Debug");
                }
            }
            else {
                consolas("Neither the config.json file nor the config.example.json file were found.".red, "Debug");
                consolas("Server was terminated.".red, "Debug");
                process.exit();
            }
        }
    } catch (err) {
        console.error(err);
        exit();
    }
}

export async function getMessageLogsById(msgId) {
    let logs = await getMessageLogsFromDb(msgId);
    return logs;
}

export async function getSavedChatMessage(group, category, channel, index = -1) {

    // add setting for checking if db storage should be used
    var sortedMessages = [];

    if (serverconfig.serverinfo.sql.enabled === true) {
        var loadedMessages = await getChatMessagesFromDb(`${group}-${category}-${channel}`, index);

        for (let i = 0; i < loadedMessages.length; i++) {
            loadedMessages[i].message = decodeFromBase64(loadedMessages[i].message);

            if (loadedMessages[i].message != null) {
                var messageObj = JSON.parse((loadedMessages[i].message));

                //if (messageObj.message.includes("<br>") && (messageObj.message.split("<br>").length - 1) <= 1) {
                //    messageObj.message = messageObj.message.replaceAll("<br>", "")
                //}

                sortedMessages.push(messageObj)
            }
        }
    }

    sortedMessages = sortedMessages.sort((a, b) => {
        if (a.timestamp < b.timestamp) {
            return -1;
        }
    });

    return sortedMessages;
}

export function scanDirectory(dir, options = {}) {
    const { includeFiles = false, recursive = false } = options;
    const result = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(fullPath);
            if (recursive) {
                result.push(scanDirectory(fullPath));
            }
        } else if (entry.isFile()) {
            if (includeFiles) {
                result.push(fullPath);
            }
        }
    }

    return result;
}

export async function saveChatMessage(message, editedMsgId = null) {

    var group = message.group;
    var category = message.category;
    var channel = message.channel;

    // for edited msgs
    if (editedMsgId != null) {
        message.messageId = editedMsgId;
    }

    // increase count and save it
    serverconfig.groups[group].channels.categories[category].channel[channel].msgCount += 1;
    saveConfig(serverconfig);

    // If SQL is enabled it will try to save it there
    if (serverconfig.serverinfo.sql.enabled == true) {
        consolas("Saved message in Database", "Debug")

        // if a message is being edited, try to log it first
        if (editedMsgId) {
            let toBeLogged = await getChatMessageById(editedMsgId);
            let decodedMessageObject = decodeFromBase64(toBeLogged[0].message);
            let parsedMessageToLog = JSON.parse(decodedMessageObject)

            await logEditedChatMessageInDb(parsedMessageToLog);
        }

        await saveChatMessageInDb(message);

        return;
    }

    if (message.message.includes("\n") && (message.message.split("\n").length - 1) > 1) {
        message.message = message.message.replaceAll("\n", "<br>")
    }

    // If directory does not exist, create it
    if (!fs.existsSync(`./chats/${group}/${category}/${channel}/`)) {
        fs.mkdirSync(`./chats/${group}/${category}/${channel}/`, { recursive: true });
    }

    // Create the chat file
    fs.writeFile(`./chats/${group}/${category}/${channel}/${message.messageId}`, JSON.stringify(message), function (err) {
        if (err) {
            return console.log(err);
        }
    });

    serverconfig.groups[group].channels.categories[category].channel[channel].msgCount += 1;
}