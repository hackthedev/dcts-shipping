import {copyObject, escapeHtml, sanitizeInput, sendMessageToUser, validateMemberId} from "../../functions/main.mjs";
import {saveConfig, serverconfig, xssFilters} from "../../../index.mjs";
import {hasPermission} from "../../functions/chat/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('createInvite', function (member, response) {
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

            if(!member?.expires){
                response({ error: "No expires supplied" });
                return;
            }

            if(!member?.maxUses){
                response({ error: "No maxUses supplied" });
                return;
            }

            // sanitize
            member.code = escapeHtml(xssFilters.inHTMLData(member?.code));
            member.expires = Number(escapeHtml(xssFilters.inHTMLData(member?.expires)));
            member.maxUses = Number(escapeHtml(xssFilters.inHTMLData(member?.maxUses)));

            // get codes
            let accessCodes = serverconfig.serverinfo.registration.accessCodes;

            // create or overwrite the existing invite. its on purpose
            if(!accessCodes[member.code]) accessCodes[member.code] = {}

            // setup the data
            accessCodes[member.code].maxUses = member.maxUses;
            accessCodes[member.code].expires = member.expires;
            accessCodes[member.code].createdBy = member?.id;

            // save the new config. no need to save accessCodes etc
            // as its directly referenced.
            saveConfig(serverconfig)

            // return null as error to indicate success
            response({ error: null })
        }
    });
}
