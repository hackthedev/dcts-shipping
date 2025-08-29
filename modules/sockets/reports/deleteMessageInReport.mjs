import { io, serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import { validateMemberId } from "../../functions/main.mjs";
import { deleteChatMessagesFromDb, getChatMessagesFromDb, getReports, saveReport } from "../../functions/mysql/helper.mjs";

export default (io) => (socket) => {

    // socket.on code here
    socket.on('deleteMessageInReport', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageMessages")) {
                try {
                    let deleteResult = await deleteChatMessagesFromDb(member.messageId);

                    if(deleteResult.affectedRows >= 1){
                        io.emit("receiveDeleteMessage", member.messageId);
                        response({ type: "success", msg: "Message was deleted"});
                    }
                    else{
                        Logger.debug(deleteResult)
                        response({ type: "error", msg: "Message cant be deleted"});
                    }
                    
                }
                catch (e) {
                    Logger.error("Unable to get reports");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "You're not allowed to manage messages" });
            }
        }
    });
}
