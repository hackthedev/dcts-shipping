import { getCastingMemberObject, validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getUserFromId', async function (member, response) {
        if (await validateMemberId(member.id, socket) === true
        ) {
            response({ type: "success", user: await getCastingMemberObject(serverconfig.servermembers[member.target]) });
        }
    });
}
