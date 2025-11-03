import {
    copyObject,
    escapeHtml,
    getCastingMemberObject,
    sanitizeInput,
    sendMessageToUser,
    validateMemberId
} from "../../functions/main.mjs";
import {saveConfig, serverconfig, xssFilters} from "../../../index.mjs";
import {hasPermission} from "../../functions/chat/main.mjs";
import Auditlog from "../../functions/Audit.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getInvites', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){

            // check permission
            if(hasPermission(member?.id, "manageInvites") === false){
                response({ error: "You're not allowed to managed invites" })
                return;
            }

            // lets try to resolve the member that created the key because on default we
            // just store the member id and i think its good this way.
            let changed = false; // saveConfig flag

            for(let key of Object.keys(serverconfig.serverinfo.registration.accessCodes)) {
                let code = serverconfig.serverinfo.registration.accessCodes[key];

                // auto remove code when expired
                if(code.expires !== -1){
                    if(new Date().getTime() > code.expires){
                        delete serverconfig.serverinfo.registration.accessCodes[key];
                        Auditlog.insert(`Automatically deleted invite ${escapeHtml(key)} because its date expired`)
                        changed = true;
                    }
                }

                // auto remove code when used up
                if(code.maxUses !== -1){
                    if(code.maxUses <= 0){
                        delete serverconfig.serverinfo.registration.accessCodes[key];
                        Auditlog.insert(`Automatically deleted invite ${escapeHtml(key)} because it has been used up`)
                        changed = true;
                    }
                }

                if(serverconfig.servermembers[code.createdBy]) code.createdBy = getCastingMemberObject(serverconfig.servermembers[code.createdBy]);
            }

            // lets try to me efficient
            if(changed) saveConfig(serverconfig);

            // return null as error to indicate success
            response({ error: null, invites: serverconfig.serverinfo.registration.accessCodes })
        }
    });
}
