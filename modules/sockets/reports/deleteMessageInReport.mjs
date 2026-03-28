import { io, serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import { sanitizeInput, validateMemberId } from "../../functions/main.mjs";
import { deleteChatMessagesFromDb, getChatMessageById, getChatMessagesFromDb, getReports, saveReport } from "../../functions/mysql/helper.mjs";
import { queryDatabase } from "../../functions/mysql/mysql.mjs";
import { sendSystemMessage } from "../home/general.mjs";



export default (io) => (socket) => {

    async function emitToThread(roomId, event, payload) {
        const rows = await queryDatabase(
            `SELECT participants FROM dm_rooms WHERE roomId = ?`,
            [roomId]
        );

        if(rows?.length === 0) return;

        console.log(rows)
        let participants = rows[0]?.participants
        let participantsArray = participants.split(",")

        if(participantsArray.length > 0) {
            for (const r of participantsArray) {
                console.log(r, event, payload)
                io.in(r).emit(event, payload);
            }
        }
    }

    // socket.on code here
    socket.on('deleteMessageInReport', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {

            if (await hasPermission(member.id, "manageMessages")) {
                try {
                    let messageId = member.messageId
                    let messageType = member.messageType

                    // dm message
                    if (messageType === "dm") {
                        let dmMessageRow = await queryDatabase("SELECT * from dms WHERE messageId = ?", [messageId])
                        let dmMessageObj = dmMessageRow[0];

                        if (!dmMessageObj) {
                            return response({ type: "error", error: "No dm found to delete the message from" });
                        }

                        let roomId = dmMessageObj?.roomId;
                        let messageAuthorId = dmMessageObj?.authorId;

                        // works for server messages and dms
                        let deleteResult = await deleteChatMessagesFromDb(member.messageId, messageType);

                        if (deleteResult.affectedRows >= 1) {
                            await emitToThread(roomId, "receiveDeleteMessage", { messageId });

                            // notify reporter
                            if (member.id) {
                                await sendSystemMessage(member.id,
                                    `<p>The message you've reported sent by <i>${serverconfig.servermembers[messageAuthorId].name} (${messageAuthorId})</i> has been deleted.<br><br>
                                    Thank you for helping keep the server safe.</p>`);
                            }

                            return response({ type: "success", msg: "DM Message was deleted", error: null })
                        }
                    }
                    else {
                        let deleteResult = await deleteChatMessagesFromDb(member.messageId);

                        if (deleteResult.affectedRows >= 1) {
                            io.emit("receiveDeleteMessage", member.messageId);
                            response({ type: "success", msg: "Message was deleted" });

                            if (member.reporterId && member.reportedId) {
                                await sendSystemMessage(member.reporterId,
                                    `The message you've reported sent by ${serverconfig.servermembers[member.reportedId].name} <i>(${sanitizeInput(member.reportedId)})</i> has been deleted.<br><br>

                                Thank you for helping keep the server safe.`);
                            }

                        }
                        else {
                            Logger.debug(deleteResult)
                            response({ type: "error", msg: "Message cant be deleted" });
                        }
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
