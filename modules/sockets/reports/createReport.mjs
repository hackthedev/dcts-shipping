import { io, serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import {emitBasedOnPermission, getCastingMemberObject, sanitizeInput, validateMemberId} from "../../functions/main.mjs";
import { getChatMessagesFromDb, saveReport, decodeFromBase64 } from "../../functions/mysql/helper.mjs";
import {queryDatabase} from "../../functions/mysql/mysql.mjs";
import {stripHTML} from "../../functions/sanitizing/functions.mjs";

export default (io) => (socket) => {

    function notifyReportAdmins() {

        // for each user, check if they are allowed to manage reports to notify them
        Object.keys(usersocket).forEach(async function (user) {
            if (await hasPermission(user, "manageReports")) {
                io.to(usersocket[user]).emit("newReport");
            }
        });

    }

    // socket.on code here
    socket.on('createReport', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            try {
                if(!member?.targetId) return response({ error: "Missing report target member id" })

                let reportCreatorId = stripHTML(member.id);
                let reportTargetId = stripHTML(member.targetId);
                let reportType = stripHTML(member.type);
                let reportDescription = stripHTML(member.description);

                switch (reportType) {
                    case "message":
                        let message = await getChatMessagesFromDb(null, null, reportTargetId);
                        let messageObj = message[0].message;

                        // you shall not be confused like i was,
                        // as this authorId is a database column
                        let messageAuthorId = message[0]?.authorId;

                        // if data is available
                        if (messageAuthorId) {
                            let room = message[0]?.room; // 1-2-3
                            let channelId = room.split("-")[2]; // 3

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
                        else{
                            return response?.({ type: "error", error: "Message author not found" });
                        }

                        break;
                    case "dm":
                        try {
                            let messageId = reportTargetId;
                            let reason = reportDescription;
                            let plainText = member?.plainText;

                            if(!plainText){
                                return response?.({ type: "error", error: "Missing plainText parameter" });
                            }

                            if (!messageId) return response?.({ type: "error", msg: "missing messageId" });

                            const [msg] = await queryDatabase(
                                `SELECT messageId, roomId, authorId, message, createdAt
                                         FROM dms
                                         WHERE messageId = ? LIMIT 1`,
                                [messageId]
                            );

                            if (!msg) return response?.({ type: "error", msg: "Message not found" });

                            const reporterObj = await getCastingMemberObject(serverconfig.servermembers[member.id]);
                            const reportedObj = await getCastingMemberObject(serverconfig.servermembers[msg.authorId]);

                            const reportData = {
                                author: {
                                    id: String(msg.authorId),
                                    name: reportedObj?.name ?? String(msg.authorId),
                                    icon: reportedObj?.icon ?? "/img/default_pfp.png",
                                    color: reportedObj?.color ?? null
                                },
                                payload: msg.message,
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
                                        VALUES (?, ?, 'dm', ?, ?, 'pending')`,
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
