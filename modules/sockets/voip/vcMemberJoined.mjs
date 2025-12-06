import {copyObject, removeFromArray, sendMessageToUser, validateMemberId} from "../../functions/main.mjs";
import {typingMembers, useridFromSocket} from "../../../index.mjs";
import {hasPermission} from "../../functions/chat/main.mjs";

let vcUsers = {}
function setupVcChannel(channelId){
    if(!vcUsers[channelId]) {
        vcUsers[channelId] = {}
        vcUsers[channelId].members = []
    }
}

export default (io) => (socket) => {
    // socket.on code here
    socket.on('notifyVcMemberJoined', function (oMember, response) {
        if(validateMemberId(oMember?.id, socket, oMember?.token) === true){

            setupVcChannel(oMember.channelId);

            if(!vcUsers[oMember.channelId].members.includes(oMember.memberId)){
                vcUsers[oMember.channelId].members.push(oMember.memberId);
            }

            io.emit("vcMemberJoined", {memberId: oMember.memberId, channelId: oMember.channelId});
        }
    });

    socket.on('notifyVcMemberLeft', function (oMember, response) {
        if(validateMemberId(oMember?.id, socket, oMember?.token) === true){
            setupVcChannel(oMember.channelId);

            if(vcUsers[oMember.channelId].members.includes(oMember.id)){
                removeFromArray(vcUsers[oMember.channelId].members, oMember.memberId);
            }

            io.emit("vcMemberLeft", {memberId: oMember.memberId, channelId: oMember.channelId});
        }
    });

    socket.on('getVcChannelMembers', function (member, response) {
        if(validateMemberId(member?.id, socket, member?.token) === true){

            if (!hasPermission(member.id, ["useVOIP", "viewChannel"], member.channelId, "all")) {
                response({error: "You dont have permissions to view the channel's vc participants"})
                return;
            }

            if(vcUsers[member.channelId]){
                response({ error: null, members: vcUsers[member.channelId].members });
            }
            else{
                response({ error: null, members: null });
            }
        }
    });

    socket.on("disconnect", function(){
        for(let vcChannel of Object.keys(vcUsers)){
            let entry = vcUsers[vcChannel];

            if(entry.members.includes(socket.memberId)){
                io.emit("vcMemberLeft", {memberId: socket.memberId, channelId: vcChannel});
                removeFromArray(vcUsers[vcChannel].members, socket.memberId);
            }
        }
    })
}
