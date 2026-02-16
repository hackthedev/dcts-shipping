import { serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import {getCastingMemberObject, validateMemberId} from "../../functions/main.mjs";
import {decodeFromBase64, getChatMessagesFromDb, getReports, saveReport} from "../../functions/mysql/helper.mjs";
import {decodeAndParseJSON, decodeString} from "../resolveMessage.mjs";

export default (io) => (socket) => {

    // socket.on code here
    socket.on('fetchReports', async function (member, response) {
        if (validateMemberId(member.id, socket, member.token) === true
        ) {

            if (hasPermission(member.id, "manageReports")) {
                try {
                    let reports = await getReports();
                    Object.keys(reports).forEach(function (report) {
                        reports[report].reportCreator = getCastingMemberObject(decodeAndParseJSON(reports[report].reportCreator))
                        reports[report].reportedUser = getCastingMemberObject(decodeAndParseJSON(reports[report].reportedUser))
                        reports[report].reportData = decodeAndParseJSON(reports[report].reportData)

                        if(reports[report].reportData?.message) reports[report].reportData.message = decodeString(reports[report].reportData.message)
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
