import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {getDiscoveredHosts} from "../functions/discovery.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getDiscoveredHosts', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){
            response({ error: null, servers: await getDiscoveredHosts() })
        }
    });
}
