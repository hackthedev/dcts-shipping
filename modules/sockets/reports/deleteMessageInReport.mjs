import { io, serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import { sanitizeInput, validateMemberId } from "../../functions/main.mjs";
import { deleteChatMessagesFromDb, getChatMessageById, getChatMessagesFromDb, getReports, saveReport } from "../../functions/mysql/helper.mjs";
import { queryDatabase } from "../../functions/mysql/mysql.mjs";
import { sendSystemMessage } from "../home/general.mjs";



export default (io) => (socket) => {

    async function emitToThread(threadId, event, payload) {
        const rows = await queryDatabase(
            `SELECT memberId FROM dms_participants WHERE threadId = ?`,
            [threadId]
        );
        for (const r of rows) {
            io.to(r.memberId).emit(event, payload);
        }
    }

    // socket.on code here
    socket.on('deleteMessageInReport', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageMessages")) {
                try {
                    let messageId = member.messageId

                    // dm message
                    if (messageId.startsWith("m_")) {
                        let threadIdResult = await queryDatabase("SELECT * from dms_messages WHERE messageId = ?", [messageId])
                        let threadId = threadIdResult[0].threadId;
                        let messageAuthorId = threadIdResult[0].authorId;

                        if (!threadId) {
                            response({ type: "error", error: "No thread found to delete the message from" });
                            return;
                        }

                        let participantsResult = await queryDatabase("SELECT * from dms_participants WHERE threadId = ?", [threadId])

                        const otherIds = participantsResult
                            .filter(p => String(p.memberId) !== String(messageAuthorId))
                            .map(p => p.memberId);

                        let offenderAuthorId = otherIds[0];


                        // works for server messages and dms
                        let deleteResult = await deleteChatMessagesFromDb(member.messageId);

                        if (deleteResult.affectedRows >= 1) {
                            await emitToThread(threadId, "receiveMessageDelete", { threadId, messageId });

                            // notify reporter
                            if (offenderAuthorId) {
                                await sendSystemMessage(otherIds[0],
                                    `The message you've reported sent by <i>${serverconfig.servermembers[messageAuthorId].name} (${messageAuthorId})</i> has been deleted.<br><br>
                                    Thank you for helping keep the server safe.`);
                            }

                            response({ type: "success", msg: "DM Message was deleted" });
                            return;
                        }

                        return;
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
