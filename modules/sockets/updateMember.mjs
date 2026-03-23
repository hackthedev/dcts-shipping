import {serverconfig} from "../../index.mjs";
import Logger from "../functions/logger.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateMember', async function (member, response) {
        try{
            for (const [key, value] of Object.entries(member?.newSettings)) {
                if(value !== null) serverconfig.servermembers[member?.id][key] = value
            }
            response({updatedMember: serverconfig.servermembers[member?.id]});
        }
        catch (exception){
            Logger.error(exception);
        }

    });
}
