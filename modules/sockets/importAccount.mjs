import {saveConfig, serverconfig, xssFilters} from "../../index.mjs";
import {getJson, hasPermission} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {copyObject, generateId, sendMessageToUser, validateMemberId} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('importAccount', async function (member, response) {
        try{
            // some funky code here
            let importAccountData = member.account;
            let existingAccountData = serverconfig.servermembers[importAccountData.id];

            // lets check if the account already exists
            if(existingAccountData && Object.keys(existingAccountData).length !== 0){
                if(existingAccountData?.token !== importAccountData?.token) response({ error: "Account already exists and token doesnt match!"})
                if(existingAccountData?.password !== importAccountData?.password) response({ error: "Account already exists and password doesnt match!"})
                if(existingAccountData?.pow !== importAccountData?.pow) response({ error: "Account already exists and identity doesnt match!"})
            }
            else{
                let existingUsernames = getJson(serverconfig.servermembers, ["*.loginName"]);
                existingUsernames.forEach(user => {
                    let loginName = user[0];

                    if (importAccountData?.loginName && importAccountData?.loginName === loginName) importAccountData.loginName += generateId(4);
                });

                serverconfig.servermembers[importAccountData?.id] = importAccountData
                saveConfig(serverconfig)
            }

            response({ error: null})
        }
        catch (exception){
            Logger.log(exception);
        }

    });
}
