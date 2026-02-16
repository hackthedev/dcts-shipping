import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, searchTenor, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('searchTenorGif', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {
            response({ type: "error", msg: "Tenor has been deprecated" });
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.search = xssFilters.inHTMLData(member.search)

            if (serverconfig.serverinfo.tenor.enabled != 1) {
                response({ type: "error", msg: "GIFs are disabled on this server" });
            }
            else {
                response({ type: "success", msg: "Trying to search GIF" });
            }

            searchTenor(member.search, member.id);
            Logger.debug("Searching GIF for " + member.search)
        }
    });
}
