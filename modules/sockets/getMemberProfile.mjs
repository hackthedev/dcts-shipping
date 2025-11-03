import { serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberProfile, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { checkRateLimit, copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getMemberProfile', async function (member, response) {
        if (validateMemberId(member.id, socket) === true &&
            serverconfig.servermembers[member.id].token === member.token
        ) {

            try {
                // bug: being online on two devices with the same account 
                // will show the profile on both devices in the same position
                response({
                    error: null,
                    member: await getMemberProfile(
                        xssFilters.inHTMLData(member.target)),
                    top: Number(xssFilters.inHTMLData(member.posY)),
                    left: Number(xssFilters.inHTMLData(member.posX))
                })
            }
            catch (e) {
                Logger.error("Couldnt get member profile");
                Logger.error(e);
            }
        }
    });
}
