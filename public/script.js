const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');

let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

startBtn.onclick = async () => {
  startBtn.disabled = true;
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  socket.emit('join');
};

socket.on('match', async (partnerId) => {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => { remoteVideo.srcObject = event.streams[0]; };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', { to: partnerId, signal: event.candidate });
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal', { to: partnerId, signal: offer });
});

socket.on('signal', async (data) => {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => { remoteVideo.srcObject = event.streams[0]; };
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) socket.emit('signal', { to: data.from, signal: event.candidate });
    };
  }

  if (data.signal.type === 'offer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('signal', { to: data.from, signal: answer });
  } else if (data.signal.type === 'answer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
  } else if (data.signal.candidate) {
    try { await peerConnection.addIceCandidate(data.signal); } catch(e) { console.error(e); }
  }
});