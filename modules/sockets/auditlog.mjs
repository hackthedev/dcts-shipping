import { hasPermission } from "../functions/chat/main.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import Auditlog from "../functions/Audit.mjs";

export default (io) => (socket) => {
    socket.on('getAuditlog', async function (member, response) {
        if(validateMemberId(member?.id, socket, member?.token) === true){
            if(!hasPermission(member?.id, "viewAuditLog")){
                response({ error: "You're not allowed to view the Audit log" });
                return;
            }

            let logs = await Auditlog.getLogs(member?.index || 0)
            response({ error: null, logs })
        }
    });
}
