import { io, saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('deleteCategory', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageChannels")) {
                response({ msg: "You arent allowed to delete categories", type: "error", error: "Cant delete category, missing permission manageChannels" })
                return;
            }

            try {
                delete serverconfig.groups[member.group].channels.categories[member.category.replace("category-", "")];
                saveConfig(serverconfig);
 
                response({ msg: "Category deleted", type: "success", error: null })
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e) {
                Logger.error("Couldnt delete category");
                Logger.error(e);
            }
        }
    });
}
