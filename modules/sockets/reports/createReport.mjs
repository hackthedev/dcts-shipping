import { io, serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import { validateMemberId } from "../../functions/main.mjs";
import { getChatMessagesFromDb, saveReport, decodeFromBase64 } from "../../functions/mysql/helper.mjs";

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
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            // waiting until permissions overhaul
            //if (hasPermission(member.id, "createReports")) {
            try {

                if (serverconfig.serverinfo.sql.enabled == false) {
                    response({ type: "error", msg: "This feature requires SQL to be setup" });
                    return;
                }
                let reportCreatorId = xssFilters.inHTMLData(member.id);
                let reportTargetId = xssFilters.inHTMLData(member.targetId);
                let reportType = xssFilters.inHTMLData(member.type);
                let reportDescription = xssFilters.inHTMLData(member.description);

                switch (reportType) {
                    case "message":
                        let message = await getChatMessagesFromDb(null, null, reportTargetId);
                        let messageObj = decodeFromBase64(message[0].message);

                        let messageAuthorId = message[0]?.authorId;

                        // if data is available
                        if (messageAuthorId) {
                            let room = message[0]?.room; // 1-2-3
                            let channelId = room.split("-")[2]; // 3
                            let channelObj = resolveChannelById(channelId) // json obj of channel

                            if(!serverconfig.servermembers[messageAuthorId]){
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

                            notifyReportAdmins();
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
