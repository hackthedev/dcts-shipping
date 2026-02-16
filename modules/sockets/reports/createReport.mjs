import { io, serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import {emitBasedOnPermission, getCastingMemberObject, sanitizeInput, validateMemberId} from "../../functions/main.mjs";
import { getChatMessagesFromDb, saveReport, decodeFromBase64 } from "../../functions/mysql/helper.mjs";
import {queryDatabase} from "../../functions/mysql/mysql.mjs";

export default (io) => (socket) => {

    function notifyReportAdmins() {

        // for each user, check if they are allowed to manage reports to notify them
        Object.keys(usersocket).forEach(function (user) {
            if (hasPermission(user, "manageReports")) {
                io.to(usersocket[user]).emit("newReport");
            }
        });

    }

    // socket.on code here
    socket.on('createReport', async function (member, response) {
        if (validateMemberId(member.id, socket, member.token) === true
        ) {
            // waiting until permissions overhaul
            //if (hasPermission(member.id, "createReports")) {
            try {
                let reportCreatorId = xssFilters.inHTMLData(member.id);
                let reportTargetId = xssFilters.inHTMLData(member.targetId);
                let reportType = xssFilters.inHTMLData(member.type);
                let reportDescription = xssFilters.inHTMLData(member.description);

                switch (reportType) {
                    case "message":
                        let message = await getChatMessagesFromDb(null, null, reportTargetId);
                        let messageObj = message[0].message;

                        let messageAuthorId = message[0]?.authorId;

                        // if data is available
                        if (messageAuthorId) {
                            let room = message[0]?.room; // 1-2-3
                            let channelId = room.split("-")[2]; // 3
                            let channelObj = resolveChannelById(channelId) // json obj of channel

                            if (!serverconfig.servermembers[messageAuthorId]) {
                                return response({ type: "error", msg: "User is not in the server anymore" });
                            }

                            Logger.info(`User ${serverconfig.servermembers[reportCreatorId].name} reported user ${serverconfig.servermembers[messageAuthorId].name}`)
                            await saveReport(
                                JSON.stringify(serverconfig.servermembers[reportCreatorId]),
                                JSON.stringify(serverconfig.servermembers[messageAuthorId]),
                                "message",
                                messageObj,
                                reportDescription
                            )

                            emitBasedOnPermission("manageReports", "newReport")
                        }
                    case "dm":
                        try {
                            const me = socket.data.memberId;
                            if (!me) return response?.({ type: "error", msg: "unauthorized" });

                            let messageId = reportTargetId;
                            let reason = reportDescription;
                            let plainText = member?.plainText;

                            if(!plainText){
                                return response?.({ type: "error", error: "Missing plainText parameter" });
                            }

                            if (!messageId) return response?.({ type: "error", msg: "missing messageId" });

                            const [msg] = await queryDatabase(
                                `SELECT messageId, threadId, authorId, message, createdAt
                                         FROM dms_messages
                                         WHERE messageId = ? LIMIT 1`,
                                [messageId.startsWith("m_") ? messageId : `m_${messageId}`]
                            );
                            if (!msg) return response?.({ type: "error", msg: "not found" });

                            const reporterObj = getCastingMemberObject(serverconfig.servermembers[me]);
                            const reportedObj = getCastingMemberObject(serverconfig.servermembers[msg.authorId]);

                            const reportData = {
                                author: {
                                    id: String(msg.authorId),
                                    name: reportedObj?.name ?? String(msg.authorId),
                                    icon: reportedObj?.icon ?? "/img/default_pfp.png",
                                    color: reportedObj?.color ?? null
                                },
                                message: msg.message,
                                plainText: sanitizeInput(plainText),
                                group: "0",
                                category: "0",
                                channel: "0",
                                room: msg.threadId,
                                editedMsgId: null,
                                timestamp: msg.createdAt ? +new Date(msg.createdAt) : Date.now(),
                                messageId: msg.messageId,
                            };

                            await queryDatabase(
                                `INSERT INTO reports (reportCreator, reportedUser, reportType, reportData, reportNotes, reportStatus)
                                        VALUES (?, ?, 'dm_message', ?, ?, 'pending')`,
                                [
                                    JSON.stringify(reporterObj),
                                    JSON.stringify(reportedObj),
                                    JSON.stringify(reportData),
                                    reason || ""
                                ]
                            );

                            emitBasedOnPermission("manageReports", "newReport")

                            response?.({ type: "success" });
                        } catch (e) {
                            Logger.error(e);
                            response?.({ type: "error", msg: "reportMessage failed" });
                        }
                    break;
                }

                response({ type: "success", msg: "Report was created" });
            }
            catch (e) {
                response({ type: "error", msg: "Message cant be reported" });
                Logger.error("Unable to save report");
                Logger.error(e);
            }
            /*}
            else {
                response({ type: "error", msg: "denied" });
            }*/
        }
    });
}
