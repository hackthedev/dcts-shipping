
import Logger from "../functions/logger.mjs";
import {
    autoAnonymizeMember,
    getCastingMemberObject,
    validateMemberId
} from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('resolveMember', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if(!member?.id) return response({error: "No member ID provided"});
            if(!member?.token) return response({error: "No token provided"});
            if(!member?.target) return response({error: "No target member id provided"});

            try {
                var resolved = await getCastingMemberObject(serverconfig.servermembers[member?.target]);

                if(!resolved){
                    return response({error: "Target member not found"});
                }

                resolved = await autoAnonymizeMember(member.id, resolved);

                response({ type: "success", msg: "User Data was resolved", data: resolved });
            }
            catch (e) {
                Logger.error("Unable to resolve member");
                console.log(e);
            }
        }
    });
}
