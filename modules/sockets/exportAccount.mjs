import Logger from "../functions/logger.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('exportAccount', async function(member, response) {
        if (await validateMemberId(member?.id, socket, member?.token)
        ) {
            try{
                // some funky code here
                response({account: serverconfig?.servermembers[member?.id]})
            }
            catch (exception){
                Logger.error(exception);
            }
        }

    });
}
