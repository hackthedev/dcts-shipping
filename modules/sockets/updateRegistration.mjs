import {validateMemberId} from "../functions/main.mjs";
import {hasPermission} from "../functions/chat/main.mjs";
import {saveConfig, serverconfig} from "../../index.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateRegistration', function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){
            if(!hasPermission(member?.id, "manageServer")){
                response({ error: "You dont have permissions to change the registraion settings." })
                return;
            }

            if((!member?.enabled === false && !member?.enabled === true)){
                response({ error: "Didnt supply enabled bool true or false" })
                return;
            }

            serverconfig.serverinfo.registration.enabled = member?.enabled;
            saveConfig(serverconfig);
        }
    });
}
