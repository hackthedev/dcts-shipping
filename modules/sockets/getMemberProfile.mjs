import { serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberProfile, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { checkRateLimit, copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getMemberProfile', async function (member) {     
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            try {
                // bug: being online on two devices with the same account 
                // will show the profile on both devices in the same position
                io.to(usersocket[xssFilters.inHTMLData(member.id)]).emit("receiveMemberProfile",
                    {
                        "code": await getMemberProfile(
                            xssFilters.inHTMLData(member.target)),
                        "top": xssFilters.inHTMLData(member.posY),
                        "left": xssFilters.inHTMLData(member.posX)
                    }
                );
            }
            catch (e) {
                Logger.error("Couldnt get member profile");
                Logger.error(e);
            }
        }
    });
}
