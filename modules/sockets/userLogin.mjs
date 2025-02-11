import { loginAttempts, serverconfig, xssFilters } from "../../index.mjs";
import { banIp, getNewDate, unbanIp } from "../functions/chat/main.mjs";
import { copyObject, findAndVerifyUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('userLogin', function (member, response) {
        member.id = xssFilters.inHTMLData(member.id)
        member.password = xssFilters.inHTMLData(member.password)
        member.name = xssFilters.inHTMLData(member.name)
        member.duration = 0.1;

        // Handling ip ban
        var ip = socket.handshake.address;
        if (serverconfig.ipblacklist.hasOwnProperty(ip)) {

            // if the ban has expired, unban them
            if (Date.now() > serverconfig.ipblacklist[ip]) {
                unbanIp(socket)
            }
        }


        // initiate login counter
        if (!loginAttempts.hasOwnProperty(ip)) {
            loginAttempts.push(ip);
            loginAttempts[ip] = 0;
        }

        // increase login counter
        loginAttempts[ip]++;

        // if count exceeded, temporarily ban ip and clean up
        if (loginAttempts[ip] > serverconfig.serverinfo.login.maxLoginAttempts) {
            banIp(socket, getNewDate(serverconfig.serverinfo.moderation.bans.ipBanDuration).getTime());
            delete loginAttempts[ip];

            response({ error: "You've been temporarily banned. Please try again later" })
            socket.disconnect();
            return;
        }

        let loginCheck = findAndVerifyUser(member.loginName, member.password);

        if (loginCheck.result == true) {
            response({ error: null, member: loginCheck.member })

        }
        else if (loginCheck.result == false) {
            response({ error: "Invalid login" })
        }
        else {
            response({ error: "Account not found" })
        }
    });
}
