import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import {
    anonymizeMessage, autoAnonymizeMember,
    autoAnonymizeMessage,
    copyObject, getCastingMemberObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";
import {decodeFromBase64, getChatMessageById} from "../functions/mysql/helper.mjs";
import {getMessageReactionsById} from "./messageReactions.mjs";

export function decodeString(string){
    try{
        return decodeFromBase64(string);
    }
    catch{
        return string
    }
}

export function decodeAndParseJSON(data){
    try{
        data =JSON.parse(decodeFromBase64(data));
    }
    catch{
        data = JSON.parse(data);
    }

    return data;
}

export async function checkMessageObjReactions(message){
    if(!message.messageId) throw new Error("Message id was not provided");

    if (!message.reactions || Object.keys(message.reactions).length === 0) {
        const rows = await getMessageReactionsById(message.messageId);
        message.reactions = {};

        // no reactions found so we return lol
        if(!rows) return message;

        for (const { emojiHash, memberId } of rows) {
            if (!message.reactions[emojiHash]) {
                message.reactions[emojiHash] = [];
            }
            message.reactions[emojiHash].push(memberId);
        }
    }

    return message
}

export function checkMessageObjAuthor(message){
    if(!message?.author?.name){
        message.author = getCastingMemberObject(serverconfig.servermembers[message.author.id]);
    }
    return message;
}


export async function getMessageObjectById(messageId){
    if(!messageId){
        return { error: "Message id was not provided", message: null}
    }

    const messageRaw = await getChatMessageById(messageId);
    const messageRow = messageRaw?.[0];
    if(!messageRow){
        return { error: "Message not found", message: null}
    }

    let message = decodeAndParseJSON(messageRow.message);

    if(message?.id) delete message.id;
    if(message?.color) delete message.color;

    message = checkMessageObjAuthor(message);
    message = await checkMessageObjReactions(message);
    return { error: null, message };
}


export default (io) => (socket) => {
    // socket.on code here

    socket.on('resolveMessage', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){

            if(!member?.messageId || (typeof member?.messageId !== "string" && typeof member?.messageId !== "number")) {
                response({ error: "Message ID is required and needs to be a string or number", message: null})
                return;
            }

            let messageObjResult = await getMessageObjectById(member?.messageId)
            let messageObj = messageObjResult?.message;

            if(messageObj?.reply?.messageId) {
                let replyResult = await getMessageObjectById(messageObj?.reply?.messageId);
                messageObj.reply = replyResult.message;
            }

            if (!hasPermission(member.id, "viewChannel", messageObj?.channel)) {
                response({ error: "You dont have permission to resolve the message", message: null})
                return;
            }

            if(messageObj?.message) messageObj = autoAnonymizeMessage(member.id, messageObj);
            response(messageObj)
        }
    });
}
