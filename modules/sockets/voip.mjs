import { serverconfig, xssFilters, powVerifiedUsers, userOldRoom, peopleInVC, io } from "../../index.mjs";
import { copyObject, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('joinedVC', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)
            member.lastActivity = xssFilters.inHTMLData(member.lastActivity)

            var memberTransmitObj = { id: member.id, name: serverconfig.servermembers[member.id].name, icon: serverconfig.servermembers[member.id].icon, room: member.room, lastActivity: member.lastActivity };

            if (peopleInVC[member.room] == null) peopleInVC[member.room] = {};
            peopleInVC[member.room][member.id] = memberTransmitObj;

            socket.to(member.room).emit("userJoinedVC", memberTransmitObj);
            socket.emit("userJoinedVC", memberTransmitObj);
        }
    });

    socket.on('leftVC', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)

            // User already left, so the room id wouldnt be correct anymore
            try { member.room = userOldRoom[member.id][0]; } catch { }

            try { delete peopleInVC[member.room][member.id] } catch (error) { }
            socket.to(member.room).emit("userLeftVC", { id: member.id, name: serverconfig.servermembers[member.id].name, icon: serverconfig.servermembers[member.id].icon, room: member.room });
        }
    });

    socket.on('getVCMembers', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.room = xssFilters.inHTMLData(member.room)

            Object.keys(peopleInVC[member.room]).forEach(function (memberId) {
                var user = peopleInVC[member.room][memberId];


                var lastOnline = user.lastActivity / 1000;

                var today = new Date().getTime() / 1000;
                var diff = today - lastOnline;
                var minutesPassed = Math.round(diff / 60);

                if (minutesPassed > 0) {
                    delete peopleInVC[member.room][memberId];
                }
            });


            response({ type: "success", vcMembers: peopleInVC[member.room] });
        }
    });


    socket.on('join', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);

        socket.on('disconnect', () => {
            if (powVerifiedUsers.includes(socket.id)) {
                powVerifiedUsers.pop(socket.id);
            }

            socket.to(roomId).emit('user-disconnected', socket.id);
        });

        socket.on('leave', (roomId) => {
            socket.leave(roomId);
            socket.to(roomId).emit('user-disconnected', socket.id);
        });

        socket.on('offer', (data) => {
            io.to(data.target).emit('offer', {
                sender: socket.id,
                offer: data.offer
            });
        });

        socket.on('answer', (data) => {
            io.to(data.target).emit('answer', {
                sender: socket.id,
                answer: data.answer
            });
        });

        socket.on('candidate', (data) => {
            io.to(data.target).emit('candidate', {
                sender: socket.id,
                candidate: data.candidate
            });
        });

        socket.on('audio', (data) => {
            socket.to(roomId).emit('audio', data);
        });
    });
}
