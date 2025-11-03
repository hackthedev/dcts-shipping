import {copyObject, escapeHtml, sanitizeInput, sendMessageToUser, validateMemberId} from "../../functions/main.mjs";
import {saveConfig, serverconfig, xssFilters} from "../../../index.mjs";
import {hasPermission} from "../../functions/chat/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('deleteInvite', function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){

            // check permission
            if(hasPermission(member?.id, "manageInvites") === false){
                response({ error: "You're not allowed to managed invites" })
                return;
            }

            // some checks
            if(!member?.code){
                response({ error: "No code supplied" });
                return;
            }

            // sanitize
            member.code = escapeHtml(xssFilters.inHTMLData(member?.code));

            // get codes
            let accessCodes = serverconfig.serverinfo.registration.accessCodes;

            // delete invite code if it exists
            if(accessCodes[member.code]) delete accessCodes[member.code]

            // save the new config. no need to save accessCodes etc
            // as its directly referenced.
            saveConfig(serverconfig)

            // return null as error to indicate success
            response({ error: null })
        }
    });
}
