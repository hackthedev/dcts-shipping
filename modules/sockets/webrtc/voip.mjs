// server/voip.js (oder wo dein Socket-Handler liegt)
import { serverconfig, useridFromSocket } from "../../../index.mjs";
import Logger from "../../functions/logger.mjs";
import { getCastingMemberObject, sendMessageToUser } from "../../functions/main.mjs";

export default (io) => (socket) => {

  socket.on("join", (data = {}) => {
    const roomName = data.room || data.roomName;
    if (!roomName) return;

    // get member object
    const member = getCastingMemberObject(serverconfig.servermembers[data.id]);

    // check if user is muted etc
    let muteBanResult = isMutedOrBanned(socket);
    if (muteBanResult.isMuted == 1 || muteBanResult.isBanned == 1) {

      sendMessageToUser(socket.id, JSON.parse(
        `{
            "title": "You're ${muteBanResult.isMuted == 1 ? "muted" : "banned"}",
            "message": "You cant talk while being ${muteBanResult.isMuted == 1 ? "muted" : "banned"}",
            "buttons": {
                "0": {
                    "text": "Ok",
                    "events": "onclick='closeModal()'"
                }
            },
            "type": "error",
            "displayTime": 600000
        }`));
      socket.disconnect();
    }

    // leave previous rooms
    const prev = socket.data?.room;
    if (prev) {
      // tell da boys that someone left
      socket.to(prev).emit("peer-left", { id: socket.id });
      socket.leave(prev);
    }

    // some meta
    socket.data.room = roomName;
    socket.data.memberId = data.id;
    socket.data.member = member || null;

    // join
    socket.join(roomName);

    // get peers for the new dude
    const room = io.sockets.adapter.rooms.get(roomName) || new Set();
    const peers = Array.from(room)
      .filter((sid) => sid !== socket.id)
      .map((sid) => {
        const s = io.sockets.sockets.get(sid);
        const mid = s?.data?.memberId;
        const memberObj = mid ? getCastingMemberObject(serverconfig.servermembers[mid]) : null;
        return { id: sid, member: memberObj };
      });

    socket.emit("peers", { peers });

    // let the others about the new dude know
    socket.to(roomName).emit("peer-joined", {
      id: socket.id,
      member: member || null
    });
  });

  socket.on("leave", () => {
    const room = socket.data?.room;
    if (!room) return;

    // inform the others
    socket.to(room).emit("peer-left", { id: socket.id });

    // get da fuck outta here
    socket.leave(room);

    // cleanup
    socket.data.room = null;
    socket.data.memberId = null;
    socket.data.member = null;
  });

  socket.on("signal", ({ to, data }) => {
    if (!to || !data) return;

    let userId = useridFromSocket[socket.id];
    if (!userId) return; // illegal user

    // check if user is muted etc
    let muteBanResult = isMutedOrBanned(socket);
    if (muteBanResult.isMuted == 1 || muteBanResult.isBanned == 1) {

      sendMessageToUser(socket.id, JSON.parse(
        `{
            "title": "You're ${muteBanResult.isMuted == 1 ? "muted" : "banned"}",
            "message": "You cant talk while being ${muteBanResult.isMuted == 1 ? "muted" : "banned"}",
            "buttons": {
                "0": {
                    "text": "Ok",
                    "events": "onclick='closeModal()'"
                }
            },
            "type": "error",
            "displayTime": 600000
        }`));
      socket.disconnect();
    }

    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("disconnect", () => {
    const room = socket.data?.room;
    if (room) socket.to(room).emit("peer-left", { id: socket.id });
  });


  function isMutedOrBanned(socket) {
    // get member object
    const member = getCastingMemberObject(serverconfig.servermembers[useridFromSocket[socket.id]]);

    if (member?.isMuted == 1) {
      Logger.debug("User is muted. Not allowed to talk in voip.")
      return { isMuted: 1, isBanned: 0 };
    }

    if (member?.isBanned == 1) {
      Logger.debug("User is banned. Not allowed to talk in voip.")
      return { isMuted: 0, isBanned: 1 };
    }

    return { isMuted: 0, isBanned: 0 };
  }
};
