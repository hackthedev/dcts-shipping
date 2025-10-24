import { serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import { validateMemberId } from "../../functions/main.mjs";
import {decodeFromBase64, getChatMessagesFromDb, getReports, saveReport} from "../../functions/mysql/helper.mjs";

export default (io) => (socket) => {

    // socket.on code here
    socket.on('fetchReports', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageReports")) {
                try {
                    let reports = await getReports();
                    Object.keys(reports).forEach(function (report) {
                        reports[report].reportCreator = JSON.parse(reports[report].reportCreator)
                        reports[report].reportedUser = JSON.parse(reports[report].reportedUser)

                        console.log(reports[report])

                        reports[report].reportData = JSON.parse(reports[report].reportData)
                        reports[report].reportData.message = JSON.parse(decodeFromBase64(reports[report].reportData.message))


                        console.log(reports[report])
                    });

                    response({ type: "success", msg: "Reports fetched", reports:  reports});
                }
                catch (e) {
                    Logger.error("Unable to get reports");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "You're not allowed to manage reports" });
            }
        }
    });
}
