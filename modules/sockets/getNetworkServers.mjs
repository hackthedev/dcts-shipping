import { hasPermission } from "../functions/chat/main.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {getAllDiscoveredHosts} from "../functions/discovery.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getNetworkServers', async function (member, response) {
        // some code
        if(await validateMemberId(member?.id, socket, member?.token) === false){
            response({ error: null })
            return;
        }

        if(!await hasPermission(member?.id, "manageNetworkServers")){
            response({ error: "You do not have permission to manage network servers" })
            return;
        }

        response({error: null, servers: await getAllDiscoveredHosts()})
    });
}
