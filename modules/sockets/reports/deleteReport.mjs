import { serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import { validateMemberId } from "../../functions/main.mjs";
import { deleteReport, getChatMessagesFromDb, getReports, saveReport } from "../../functions/mysql/helper.mjs";

export default (socket) => {

    // socket.on code here
    socket.on('deleteReport', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageReports")) {
                try {
                    let reports = await deleteReport(xssFilters.inHTMLData(member.reportId));

                    if(reports.affectedRows >= 1) 
                        response({ type: "success", msg: "Report deleted", reports:  reports});
                    else                        
                        response({ type: "error", msg: "Cant delete Report", reports:  reports});
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
