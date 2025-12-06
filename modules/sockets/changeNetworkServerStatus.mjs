import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {queryDatabase} from "../functions/mysql/mysql.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('changeNetworkServerStatus', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === false){
            response({ error: null })
            return;
        }

        if(!member?.address){
            response({ error: "Missing network server address." })
            return;
        }

        if(!member?.status){
            response({ error: "Missing network server status." })
            return;
        }

        if(member?.status !== "verified" && member?.status !== "blocked" && member?.status !== "pending"){
            response({ error: "Invalid network server status. Allowed: verified, blocked, pending" })
            return;
        }

        if(!hasPermission(member?.id, "manageNetworkServer")){
            response({ error: "You do not have permission to change the network server status." })
            return;
        }

        let result = queryDatabase("UPDATE network_servers SET status = ? WHERE address = ?", [member.status, member.address]);
        response({ error: null })
    });
}
