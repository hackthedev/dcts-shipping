import { serverconfig, xssFilters } from "../../index.mjs";
import { copyObject, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('updateChannelTreeSorting', function (member, response) {
            if (validateMemberId(member.id, socket) == true
                && serverconfig.servermembers[member.id].token == member.token
            ) {
                member.id = xssFilters.inHTMLData(member.id)
                member.token = xssFilters.inHTMLData(member.token)
                member.group = xssFilters.inHTMLData(member.group)
                member.data = xssFilters.inHTMLData(member.data)
    
                if (!hasPermission(member.id, "manageChannels")) {
                    // secretly die cauz no need for error
                    return;
                }
    
                let channelStructure = JSON.parse(member.data);
    
    
                //  categories are sorted numerically before assigning sortId
                let sortedCategories = Object.keys(serverconfig.groups[member.group].channels.categories)
                    .map(id => parseInt(id))
                    .sort((a, b) => a - b);
    
                // assign new sortId given by client
                sortedCategories.forEach((categoryId, index) => {
    
                    if (serverconfig.groups[member.group].channels.categories[categoryId]) {
                        serverconfig.groups[member.group].channels.categories[categoryId].info.sortId = channelStructure[categoryId].info.sortId;
                    } else {
                        Logger.error(`Category ${categoryId} not found in serverconfig`);
                    }
                });
    
                saveConfig(serverconfig)
    
                Object.keys(channelStructure)
                    .sort((a, b) => a - b) // ensure consistent sorting before assigning id
                    .forEach((category, index) => {
                        let categoryChannels = channelStructure[category].channels;
                        let newCategoryId = category;
    
                        let totalChannels = categoryChannels.length;
                        categoryChannels.forEach((channelId, channelIndex) => {
                            let originalPath = findInJson(
                                serverconfig.groups[member.group].channels.categories,
                                "id",
                                parseInt(channelId),
                                true
                            );
    
                            let actualNewSortId = totalChannels - 1 - channelIndex; // reverse 
    
                            if (originalPath) {
                                let pathParts = originalPath.split(".");
                                let originalCategoryId = pathParts[0];
    
                                if (originalCategoryId !== newCategoryId) {
                                    if (!serverconfig.groups[member.group].channels.categories[originalCategoryId]) {
                                        Logger.error(`Category ${originalCategoryId} does not exist!`);
                                        return;
                                    }
    
                                    let channelData = serverconfig.groups[member.group].channels.categories[originalCategoryId].channel[channelId];
    
                                    if (channelData) {
                                        // remove from old category
                                        delete serverconfig.groups[member.group].channels.categories[originalCategoryId].channel[channelId];
    
                                        // ensure the new category has a `channel` object
                                        if (!serverconfig.groups[member.group].channels.categories[newCategoryId].channel) {
                                            serverconfig.groups[member.group].channels.categories[newCategoryId].channel = {};
                                        }
    
                                        // move the channel to the new category
                                        serverconfig.groups[member.group].channels.categories[newCategoryId].channel[channelId] = channelData;
                                    } else {
                                        Logger.error(`Channel ${channelId} not found in category ${originalCategoryId}`);
                                        return;
                                    }
                                }
    
                                //  Update sortId
                                serverconfig.groups[member.group].channels.categories[newCategoryId].channel[channelId].sortId = actualNewSortId;
    
                                saveConfig(serverconfig);
                            } else {
                                Logger.error(`Could not find original path for channel ${channelId}`);
                            }
                        });
                    });
    
                io.emit("receiveChannelTree");
    
                response({ type: "success", error: null, msg: null });
            }
        });
}
