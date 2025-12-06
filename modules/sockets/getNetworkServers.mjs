import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {queryDatabase} from "../functions/mysql/mysql.mjs";
import {getAllDiscoveredHosts} from "../functions/discovery.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getNetworkServers', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === false){
            response({ error: null })
            return;
        }

        if(!hasPermission(member?.id, "manageNetworkServers")){
            response({ error: "You do not have permission to manage network servers" })
            return;
        }

        response({error: null, servers: await getAllDiscoveredHosts()})
    });
}
