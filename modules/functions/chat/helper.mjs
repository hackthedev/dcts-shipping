/*
    The functions here are basically the "core" of the chat app on the server side.
 */
import {serverconfig, fetch, fs} from "../../../index.mjs"
import {queryDatabase} from "../mysql/mysql.mjs";
import {checkMessageObjAuthor, checkMessageObjReactions} from "../../sockets/resolveMessage.mjs";
import {autoAnonymizeMessage} from "../main.mjs";
import JSONTools from "@hackthedev/json-tools";

export function findEmojiByID(id){
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

export function getMemberHighestRole(id){
    var roles = serverconfig.serverroles;
    var sortIndex = 0;
    var returnRole = null;

    Object.keys(roles).forEach(function(role) {
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

export async function getMemberLatestMessage(memberId, issuerMemberId){
    if(!memberId) throw new Error("Member id not specified");

    let messageRow = await queryDatabase(`SELECT * FROM messages WHERE authorId = ? ORDER BY createdAt DESC LIMIT 1`, [memberId])
    if(messageRow?.length == null) return null;

    // some simple processing
    let messageObj = messageRow[0]?.message;
    if(typeof messageObj === "string") messageObj = JSONTools.tryParse(messageObj);

    messageObj = await checkMessageObjAuthor(messageObj)
    messageObj = await checkMessageObjReactions(messageObj);
    if(issuerMemberId) messageObj = await autoAnonymizeMessage(issuerMemberId, messageObj);

    return messageObj;
}