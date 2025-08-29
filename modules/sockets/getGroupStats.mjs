import { serverconfig, xssFilters } from "../../index.mjs";
import { copyObject, validateMemberId } from "../functions/main.mjs";
import { queryDatabase } from "../functions/mysql/mysql.mjs";

export default (io) => (socket) => {
    socket.on('getGroupStats', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            if (member.group == undefined || member.group == null) {
                response({ type: "error", msg: "No group id passed." })
                return;
            }


    
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)
            member.group = xssFilters.inHTMLData(member.group)
    
    
            let groupInfo = copyObject(serverconfig.groups[member.group]);
    
    
            const totalChannels = Object.keys(groupInfo.channels.categories).reduce((acc, category) => acc + Object.keys(groupInfo.channels.categories[category].channel).length, 0);
    
            groupInfo.channelCount = totalChannels;
            groupInfo.categoryCount = Object.keys(groupInfo.channels).length + 1;
            groupInfo.permissions = null;
            groupInfo.channels = null;
    
            // Get message count and username from database to show most active users;
            let totalGroupMessage = await queryDatabase(`SELECT authorId, COUNT(*) AS message_count
                                                            FROM messages
                                                            WHERE room LIKE '${member.group}-%'
                                                            GROUP BY authorId
                                                            ORDER BY message_count DESC
                                                            LIMIT 100;
                                                            `)
    
            // Add the user json object to the results so the client doesnt have to resolve each user
            for (let i = 0; i < totalGroupMessage.length; i++) {
                let serverMemberObj = serverconfig.servermembers[totalGroupMessage[i].authorId];
            
                if(serverMemberObj){
                    let userObj = copyObject(serverMemberObj); // Korrekt
                    userObj.token = null;
                    userObj.name = serverMemberObj.name;
                
                    totalGroupMessage[i].user = userObj;
                }
                else{
                    delete totalGroupMessage[i]
                }
            }
            response({ type: "success", msg: null, mostActiveUsers: totalGroupMessage, group: groupInfo })
    
        }
    });
}
