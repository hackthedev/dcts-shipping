import {fs, serverconfig, usersocket, xssFilters} from "../../index.mjs";
import {hasPermission} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {copyObject, sendMessageToUser, validateMemberId} from "../functions/main.mjs";
import {deleteChatMessagesFromDb, getChatMessagesFromDb} from "../functions/mysql/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteMessage', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {
            if (!member?.messageId) {
                return response({ error: "Missing message id" });
            }

            try {
                // Check if user has permission
                let originalMessage = await getChatMessagesFromDb(null, -1, member.messageId);
                originalMessage = originalMessage[0];

                if (originalMessage?.authorId === serverconfig.servermembers[member.id].id || await hasPermission(member.id, "manageMessages")) {
                    await deleteChatMessagesFromDb(member.messageId, member?.type);
                    io.emit("receiveDeleteMessage", member.messageId);
                    response({ error: null })
                }
                else{
                    return response({ error: "Unauthorized or not message author" })
                }
            } catch (error) {
                Logger.error(`Couldnt delete message ${member.messageId} from database`);
                Logger.error(error);
                return response({ error: "Unable to delete message" })
            }

            if (member?.group && member?.category && member?.channel) {
                io.to(member.id).emit("receiveCurrentChannel", serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);
            }
        }
    });
}
