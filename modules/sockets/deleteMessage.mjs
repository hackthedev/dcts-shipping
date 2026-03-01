import { fs, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import { deleteChatMessagesFromDb, getChatMessagesFromDb } from "../functions/mysql/helper.mjs";
import { emitToBotsWithViewChannel } from "./botEvents.mjs";

export default (io) => (socket) => {
    socket.on('deleteMessage', async function (member) {
        if (validateMemberId(member.id, socket) === true && serverconfig.servermembers[member.id].token === member.token) {
            if(!member?.messageId){
                Logger.warn("Tried deleting a message without supplying the id");
                return;
            }

            if (serverconfig.serverinfo.sql.enabled === true) {
                try {
                    let originalMessage = await getChatMessagesFromDb(null, -1, member.messageId);
                    originalMessage = originalMessage[0];

                    if (originalMessage?.authorId === serverconfig.servermembers[member.id].id || hasPermission(member.id, "manageMessages")) {
                        await deleteChatMessagesFromDb(member.messageId);
                        io.emit("receiveDeleteMessage", member.messageId);
                        const [group, category, channel] = (originalMessage?.room || "").split("-");
                        if (group && category && channel) await emitToBotsWithViewChannel(io, group, category, channel, "messageDeleted", { messageId: member.messageId, group, category, channel });
                    }
                }
                catch (error) {
                    Logger.error(`Couldnt delete message ${member.messageId} from database`);
                    Logger.error(error);
                }
            } else {
                try {
                    var message = JSON.parse(fs.readFileSync(`./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`));
                    if (message.id === member.id || hasPermission(member.id, "manageMessages")) {

                        let path = `${member.group}/${member.category}/${member.channel}/${member.messageId}`;
                        if (path.includes("..")) return

                        fs.unlinkSync(`./chats/${path}`);
                        io.emit("receiveDeleteMessage", message.messageId);
                        await emitToBotsWithViewChannel(io, member.group, member.category, member.channel, "messageDeleted", { messageId: message.messageId, group: member.group, category: member.category, channel: member.channel });
                    }
                }
                catch (error) {
                    Logger.error(`Couldnt delete file ./chats/${member.group}/${member.category}/${member.channel}/${member.messageId}`);
                    Logger.error(error);
                }
            }


            io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);
        }
    });
}
