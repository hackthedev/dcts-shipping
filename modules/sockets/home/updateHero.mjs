import { saveConfig, serverconfig } from "../../../index.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import Logger from "../../functions/logger.mjs";
import { sanitizeInput, validateMemberId } from "../../functions/main.mjs";


export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateHero', async function (member, response) {
        if (validateMemberId(member?.id, socket) == true && serverconfig.servermembers[member?.id]?.token == member?.token
        ) {
            try {
                // for now only admins can change the server home info and pic
                if (!await hasPermission(member?.id, "administrator")) {
                    response({ type: "error", error: "Only administrators can edit this section" });
                    return;
                }

                // dont supply files! supply strings like data url or url as string
                if (Buffer.isBuffer(member.bannerUrl)) {
                    response({ type: "error", error: "Parameter bannerUrl needs to be a string, not a Buffer" });
                    return;
                }

                // only update if needed
                let didUpdate = false;
                if (member.bannerUrl) serverconfig.serverinfo.home.banner_url = sanitizeInput(member.bannerUrl); didUpdate = true;
                if (member.title) serverconfig.serverinfo.home.title = sanitizeInput(member.title); didUpdate = true;
                if (member.subtitle) serverconfig.serverinfo.home.subtitle = sanitizeInput(member.subtitle); didUpdate = true;

                // and only update if something changed
                if (didUpdate) saveConfig(serverconfig);

                // man programming can be so beautiful
                response({ type: "success", error: null });

                socket.broadcast.emit("updatedHome", {
                    bannerUrl: serverconfig.serverinfo.home.banner_url, 
                    title: serverconfig.serverinfo.home.title,
                    subtitle: serverconfig.serverinfo.home.subtitle,
                    about: serverconfig.serverinfo.home.about,
                });
            }
            catch (exception) {
                Logger.error(exception);
                response({ type: "error", error: "Unable to update hero" });
            }
        };

    });
}
