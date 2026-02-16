import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {getMessageObjectById} from "./resolveMessage.mjs";
import {queryDatabase} from "../functions/mysql/mysql.mjs";
import xssFilters from "xss-filters";
import Logger from "@hackthedev/terminal-logger"

export async function getMessageReactionsById(messageId){
    if(!messageId){
        Logger.error("Message id wasnt provided in getMessageReactionsById");
        return;
    }

    let reactionsRow = await queryDatabase(`SELECT * FROM message_reactions WHERE messageId = ?`, [messageId]);
    if(reactionsRow.length === 0) return null;
    return reactionsRow;
}

export async function addMessageReactionById(messageId, emojiHash, memberId){
    if(!messageId){
        Logger.error("Message id wasnt provided in addMessageReactionById");
        return;
    }
    if(!emojiHash){
        Logger.error("emojiHash wasnt provided in addMessageReactionById");
        return;
    }
    if(!memberId){
        Logger.error("memberId wasnt provided in addMessageReactionById");
        return;
    }

    let insertResult = await queryDatabase(`INSERT IGNORE INTO message_reactions (messageId, emojiHash, memberId, cid) VALUES (?, ?, ?, ?)`, [messageId, emojiHash, memberId, `${messageId}-${memberId}-${emojiHash}`]);
    if(insertResult.affectedRows > 0) return true;
    return false;
}

export async function removeMessageReactionById(messageId, emojiHash, memberId){
    if(!messageId){
        Logger.error("Message id wasnt provided in addMessageReactionById");
        return;
    }
    if(!emojiHash){
        Logger.error("emojiHash wasnt provided in addMessageReactionById");
        return;
    }
    if(!memberId){
        Logger.error("memberId wasnt provided in addMessageReactionById");
        return;
    }

    let insertResult = await queryDatabase(`DELETE FROM message_reactions WHERE cid = ?`, [`${messageId}-${memberId}-${emojiHash}`]);
    if(insertResult.affectedRows > 0) return true;
    return false;
}

export default (io) => (socket) => {
    // socket.on code here

    socket.on('addMessageReaction', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){

            if(!member?.messageId) return response({ error: "Missing message id" });
            if(!member?.emojiHash) return response({ error: "Missing emoji id" });
            if(member?.emojiHash?.length !== 64) return response({ error: "Invalid emoji hash" });

            let messageObjResult = await getMessageObjectById(member.messageId);
            let messageObj = messageObjResult?.message;

            if(!messageObj) return response({ error: `Message ${member.messageId} not found` });
            await addMessageReactionById(member.messageId, xssFilters.inHTMLData(member.emojiHash), member.id);

            response({ error: null })
            io.in(messageObj.room).emit("updateReactions", messageObj);
        }
    });

    socket.on('removeMessageReaction', async function (member, response) {
        if(validateMemberId(member?.id, socket, member?.token) === true){

            if(!member?.messageId) return response({ error: "Missing message id" });
            if(!member?.emojiHash) return response({ error: "Missing emoji id" });
            if(member?.emojiHash?.length !== 64) return response({ error: "Invalid emoji hash" });

            let messageObjResult = await getMessageObjectById(member.messageId);
            let messageObj = messageObjResult?.message;

            if(!messageObj) return response({ error: `Message ${member.messageId} not found` });
            await removeMessageReactionById(member.messageId, xssFilters.inHTMLData(member.emojiHash), member.id);

            response({ error: null })
            io.in(messageObj.room).emit("updateReactions", messageObj);
        }
    });
}
