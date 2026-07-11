import { serverconfig, usersocket, xssFilters } from "../../../index.mjs";
import { hasPermission, resolveChannelById } from "../../functions/chat/main.mjs";
import { getSavedChatMessage } from "../../functions/io.mjs";
import Logger from "../../functions/logger.mjs";
import {getCastingMemberObject, validateMemberId} from "../../functions/main.mjs";
import {decodeFromBase64, getChatMessagesFromDb, getReports, saveReport} from "../../functions/mysql/helper.mjs";
import {decodeAndParseJSON, decodeString} from "../resolveMessage.mjs";
import JSONTools from "@hackthedev/json-tools";

export default (io) => (socket) => {

    // socket.on code here
    socket.on('fetchReports', async function (member, response) {
        if (await validateMemberId(member.id, socket, member.token) === true
        ) {

            if (await hasPermission(member.id, "manageReports")) {
                try {
                    let reports = await getReports();

                    for(let report of Object.keys(reports)) {
                        reports[report].reportCreator = await getCastingMemberObject(decodeAndParseJSON(reports[report].reportCreator))
                        reports[report].reportedUser = await getCastingMemberObject(decodeAndParseJSON(reports[report].reportedUser))
                        reports[report].reportData = JSONTools.tryParse(reports[report].reportData)

                        if(reports[report]?.reportData?.payload) {
                            reports[report].reportData.payload = JSONTools.tryParse(reports[report].reportData.payload)
                        }
                    }

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
