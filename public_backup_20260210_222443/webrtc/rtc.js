let localStream;
let peers = {};
let roomId;

const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ]
};

const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: false
};



async function joinRoom(roomId) {
  if (!roomId) {
    //alert('Please enter a room ID');
    console.log("No room id set")
    return;
  }

  socket.emit('join', roomId);

  try {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Local stream obtained:', localStream);

    socket.on('user-connected', userId => {
      console.log('User connected:', userId);
      connectToNewUser(userId);
    });

    socket.on('user-disconnected', userId => {
      console.log('User disconnected:', userId);
      if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
      }
    });

    socket.on('offer', async data => {
      console.log('Received offer from', data.sender);
      const peer = await createPeerConnection(data.sender);
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('answer', { target: data.sender, answer: answer });
    });

    socket.on('answer', async data => {
      console.log('Received answer from', data.sender);
      const peer = peers[data.sender];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on('candidate', async data => {
      console.log('Received candidate from', data.sender);
      const peer = peers[data.sender];
      if (peer) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

  } catch (error) {
    console.error('Error accessing media devices.', error);
  }
}

function leaveRoom(roomId) {
  if (roomId) {
    socket.emit('leave', roomId);
    roomId = null;

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    for (let userId in peers) {
      peers[userId].close();
      delete peers[userId];
    }

    socket.off('user-connected');
    socket.off('user-disconnected');
    socket.off('offer');
    socket.off('answer');
    socket.off('candidate');

    console.log('Left the room and stopped recording');
  } else {
    console.log('Not in any room');
  }
}

async function createPeerConnection(userId) {
  console.log('Creating peer connection for', userId);
  const peer = new RTCPeerConnection(configuration);

  peer.onicecandidate = event => {
    if (event.candidate) {
      console.log('Sending ICE candidate:', event.candidate);
      socket.emit('candidate', { target: userId, candidate: event.candidate });
    }
  };

  peer.ontrack = event => {
    console.log('Received remote track from', userId, event.streams[0]);
    const remoteAudio = document.createElement('audio');
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.autoplay = true;
    remoteAudio.controls = true;
    remoteAudio.style.display = "none";
    document.body.appendChild(remoteAudio);
  };

  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === 'connected') {
      peer.getReceivers().forEach(receiver => {
        if (receiver.track.kind === 'audio') {
          const parameters = receiver.getParameters();
          if (parameters.encodings && parameters.encodings.length > 0) {
            parameters.encodings[0].degradationPreference = 'maintain-framerate';
            parameters.encodings[0].maxBitrate = 512000; // 128 kbps
            receiver.setParameters(parameters);
          }
        }
      });
    }
  };

  // Add local stream tracks to peer connection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peer.addTrack(track, localStream);
      console.log('Added local stream track to peer connection for', userId);
    });
  }

  peers[userId] = peer;
  return peer;
}

async function connectToNewUser(userId) {
  const peer = await createPeerConnection(userId);
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.emit('offer', { target: userId, offer: offer });
}


// Monitor WebRTC statistics to identify delay sources
/*
setInterval(() => {
  for (const userId in peers) {
    const peer = peers[userId];
    if (peer) {
      peer.getStats(null).then(stats => {
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            console.log(`Jitter: ${report.jitter} s`);
            console.log(`Packet loss: ${report.packetsLost}`);
          }
        });
      });
    }
  }
}, 1000);
*/