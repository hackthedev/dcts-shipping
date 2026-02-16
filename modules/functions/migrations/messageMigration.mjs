import {queryDatabase} from "../mysql/mysql.mjs";
import Logger from "@hackthedev/terminal-logger"
import {decodeAndParseJSON} from "../../sockets/resolveMessage.mjs";
import {copyObject} from "../main.mjs";

export async function migrateOldMessagesToNewMessageSystemWithoutEncoding(){
    let messages = await queryDatabase("SELECT * FROM messages");
    if(messages.length > 0){
        for(let message of messages){
            let decodedMessage = decodeAndParseJSON(message.message);
            message = await fixMessageStructure(decodedMessage);
            Logger.info(`Migrating message ${decodedMessage.messageId}, setting timestamp to ${decodedMessage.timestamp}`)
            await queryDatabase(`UPDATE messages set createdAt = ? WHERE messageId = ?`, [decodedMessage.timestamp, decodedMessage.messageId])
        }
        Logger.success("Migration done!")
    }
}

async function fixMessageStructure(message){
    if(!message.author || Object.keys(message?.author)?.length === 0) message.author = {};
    if(!message?.author?.id && message?.id){
        message.author.id = message.id;
        delete message.id;
    }

    if(message?.author?.icon) delete message.author.icon;
    if(message?.author?.banner) delete message.author.banner;

    if(!message?.reply || Object.keys(message?.reply)?.length === 0 || typeof message?.reply !== "object"){
        let replyId = null;
        if(typeof message?.replyMsgId === "string") replyId = message.reply;
        if(message?.replyMsgId) replyId = message.replyMsgId;
        if(message?.reply?.messageId) replyId = message.reply.messageId;

        message.reply = { messageId: replyId };
    }
    if(!message?.reply?.messageId && message?.replyMsgId){
        message.reply.messageId = message.replyMsgId;
    }

    if(message?.editedMsgId) delete message.editedMsgId;
    if(message?.replyMsgId) delete message.replyMsgId;

    if(message?.reply?.author?.icon) delete message.reply.author.icon;
    if(message?.reply?.author?.banner) delete message.reply.author.banner;

    if(message?.lastEdited && typeof message?.lastEdited === "string") message.lastEdited = new Date(message.lastEdited).getTime();

    return message
}