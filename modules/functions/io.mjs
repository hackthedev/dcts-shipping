/*
    io in terms of input/output not socket.io
    everything that will handle stuff being read or written to the disk is here
 */
import {
    serverconfig,
    fs,
    path,
    colors,
    debugmode,
    saveConfig,
    reloadConfig,
    flipDebug,
    allowLogging,
    configPath
} from "../../index.mjs"
import Logger from "@hackthedev/terminal-logger"
import {
    saveChatMessageInDb,
    getChatMessagesFromDb,
    decodeFromBase64,
    logEditedChatMessageInDb,
    getMessageLogsFromDb,
    getChatMessageById,
    addInboxMessage
} from "./mysql/helper.mjs"
import {getMentionIdsFromText} from "../sockets/messageSend.mjs";
import {getJson, hasPermission, shouldIgnoreMember} from "./chat/main.mjs";
import {copyObject, generateId, getCastingMemberObject} from "./main.mjs";
import {
    checkMessageObjAuthor,
    checkMessageObjReactions,
    decodeAndParseJSON,
    getMessageObjectById
} from "../sockets/resolveMessage.mjs";

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

export function enforceFolderSizeLimitMB(dir, maxMB) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const maxBytes = maxMB * 1024 * 1024;

    const files = fs.readdirSync(dir)
        .map(name => {
            const path = `${dir}/${name}`;
            const stat = fs.statSync(path);
            return { path, size: stat.size, mtime: stat.mtimeMs };
        })
        .sort((a, b) => a.mtime - b.mtime);

    let totalSize = files.reduce((s, f) => s + f.size, 0);

    for (const file of files) {
        if (totalSize <= maxBytes) break;
        fs.unlinkSync(file.path);
        totalSize -= file.size;
    }
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

    // configs folder
    if (!fs.existsSync("./configs")) {
        fs.mkdirSync("./configs");
    }

    // backup folder
    if (!fs.existsSync("./backups")) {
        fs.mkdirSync("./backups");
    }

    enforceFolderSizeLimitMB("./backups", 1024)
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
        if (checkFile(configPath) === true) {
            consolas("Config file config.json did exist".yellow, "Debug");
        }
        else {
            Logger.warn("Config file config.json didnt exist.".yellow, "Debug");
            Logger.warn("Checking for template file...".yellow, "Debug");

            // config.json didnt exist. Does template config exist?
            if (checkFile("./config.example.json") === true) {

                Logger.warn("Trying to copy template file".yellow, "Debug");

                // Trying to copy file
                try {
                    fs.copyFileSync("./config.example.json", configPath);
                    Logger.success("Successfully copied config.example.json to config.json".green, "Debug");
                }
                catch (error) {
                    Logger.error("Coudlnt copy template file ".red + colors.red(error), "Debug");
                    process.exit();
                }
            }
            else {
                Logger.error("Neither the config.json file nor the config.example.json file were found.".red, "Debug");
                Logger.error("Server was terminated.".red, "Debug");
                process.exit();
            }
        }
    } catch (err) {
        console.error(err);
        process.exit();
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

            let message = decodeAndParseJSON(loadedMessages[i].message);
            if (message?.message) {
                // new, enhanced message system
                if(message?.author?.id){
                    message.author = getCastingMemberObject(serverconfig.servermembers[message?.author?.id || message?.id]);
                }

                // resolve the reply too
                if(message?.reply?.messageId){
                    let messageObjResult = await getMessageObjectById(message.reply?.messageId)
                    message.reply = messageObjResult?.message;
                }

                message = checkMessageObjAuthor(message);
                message = await checkMessageObjReactions(message);

                sortedMessages.push(message)
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
    message = copyObject(message)
    var group = message.group;
    var category = message.category;
    var channel = message.channel;

    // for edited msgs
    if (editedMsgId != null) {
        message.messageId = editedMsgId;
    }

    if(message?.icon) delete message.icon;
    if(message?.banner) delete message.banner;
    if(message?.id) delete message.id;
    if(message?.color) delete message.color;

    // only store references
    if(!message?.author || Object.keys(message.author).length === 0) {
        let memberId = null;
        if(message?.id) memberId = message.id;
        if(message?.author?.id) memberId = message.author.id;
        message.author = { id: memberId}
    }

    if(message?.reply?.messageId) message.reply = { messageId: message.reply.messageId }

    // if a message is being edited, try to log it first
    if (editedMsgId) {
        let toBeLogged = await getMessageObjectById(editedMsgId);
        let decodedMessageObject = toBeLogged.message;
        await logEditedChatMessageInDb(decodedMessageObject);
    }

    saveChatMessageInDb(message);

    // increase count and save it
    serverconfig.groups[group].channels.categories[category].channel[channel].msgCount += 1;
    saveConfig(serverconfig);

    let mentions = getMentionIdsFromText(message.message)
    // add mentions to to inbox based on user mention
    for (const memberId of mentions.userIds) {
        if(memberId !== message?.author?.id) await addInboxMessage(memberId, { messageId: message.messageId }, "message", `${memberId}-${message.messageId}`);
    }

    // same for role mentions
    for (let roleId of mentions.roleIds) {
        roleId = Number(roleId);

        if(roleId === 1) continue; // offline role
        if(roleId === 0){ // member role
            if(!hasPermission(message.id, "pingEveryone")) continue;
        }

        for (const memberId of serverconfig.serverroles[roleId]?.members || []) {
            if(!memberId) continue;
            if(shouldIgnoreMember(serverconfig.servermembers[memberId])) continue;
            if(message?.id === memberId) continue;

            await addInboxMessage(memberId, { messageId: message.messageId }, "message", `${memberId}-${message.messageId}`);
        }
    }

    if(message?.reply){
        let repliedMessage = await getMessageObjectById(message.reply.messageId);
        if(repliedMessage?.message && repliedMessage?.message?.author?.id !== message?.author?.id) await addInboxMessage(repliedMessage?.message?.authorId, {messageId: message.messageId}, "message",  message.messageId);
    }
}