import { saveConfig, serverconfig } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteGroup', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            const group = serverconfig.groups[member?.group];
            if (!group) {
                response?.({ msg: "This group does not exist", type: "error", error: "Invalid group" });
                return;
            }

            if (group.info.isDeletable === 0) {
                response?.({ msg: "This group cant be deleted.", type: "error", error: "Group is not deletable" });
                return;
            }

            if (!await hasPermission(member.id, "manageGroups")) {
                response?.({ msg: "You arent allowed to delete groups", type: "error", error: "Missing permissions: manageGroups" });
                return;
            }


            try {
                delete serverconfig.groups[member.group];
                saveConfig(serverconfig);

                response?.({ msg: "Group deleted", type: "success", error: null });
                io.emit("updateGroupList");
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e) {
                Logger.error("Couldnt delete group");
                Logger.error(e);
                response?.({ msg: "Couldnt delete group", type: "error", error: "Unexpected error while deleting group" });
            }
        }
    });
}
