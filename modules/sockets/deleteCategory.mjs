import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteCategory', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {

            if (!await hasPermission(member.id, "manageChannels")) {
                response({ msg: "You arent allowed to delete categories", type: "error", error: "Cant delete category, missing permission manageChannels" })
                return;
            }

            try {
                delete serverconfig.groups[member.group].channels.categories[member.category.replace("category-", "")];
                saveConfig(serverconfig);
 
                response({ msg: "Category deleted", type: "success", error: null })
                io.emit("receiveChannelTree", await getChannelTree(member));
            }
            catch (e) {
                Logger.error("Couldnt delete category");
                Logger.error(e);
            }
        }
    });
}
