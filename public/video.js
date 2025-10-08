document.addEventListener("DOMContentLoaded", () => {
  const videoElem = document.getElementById("vid");
  const videoOther = document.getElementById("vid-other");
  const camToggleBtn = document.getElementById("toogle-camera");
  const switchCameraBtn = document.getElementById("switch-camera");
  const micToggleBtn = document.getElementById("toogle-audio");
  const shareScreenBtn = document.getElementById("share-screen");
  const endBtn = document.getElementById("end-meeting");
  
  const camOnIcon = document.getElementById("cam-on");
  const camOffIcon = document.getElementById("cam-off");
  const micOnIcon = document.getElementById("mic-on");
  const micOffIcon = document.getElementById("mic-off");
  
  let videoStream = null;
  let audioStream = null;
  let isCameraOn = false;
  let isMicOn = false;
  let isVideoPaused = true ;
  let isAudioPaused = true ;
  let currentFacingMode = "user";
  let localStream ;
  let screenStream = null;
  let screenTrackSenderMap = {}; // maps peerId -> screen sender

  
  const socket = io();
  const roomId = getRoomId();
  const userId = getUserId();
  const role = getUserRole();
  const peers = {} ;
  
  
  function updateCamIcons() {
    camOnIcon.style.display = isCameraOn ? "block" : "none";
    camOffIcon.style.display = isCameraOn ? "none" : "block";
  }
  
  function updateMicIcons() {
    micOnIcon.style.display = isMicOn ? "block" : "none";
    micOffIcon.style.display = isMicOn ? "none" : "block";
  }
  
  
  
  function toggleAudio() {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (!audioTrack) return;
    
    isAudioPaused = !isAudioPaused;
    audioTrack.enabled = !isAudioPaused;
    isMicOn = !isAudioPaused;
  }
  
  function toggleVideo() {
    const videoTrack = localStream?.getVideoTracks()[0];
    if (!videoTrack) return;
    
    isVideoPaused = !isVideoPaused;
    videoTrack.enabled = !isVideoPaused;
    isCameraOn = !isVideoPaused ;
  }
  
  async function joinRoom() {
    
    localStream = await navigator.mediaDevices.getUserMedia({ video: {facingMode: currentFacingMode}, audio: true });
    videoElem.srcObject = localStream ;
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];
    if (videoTrack) videoTrack.enabled = false;
    if (audioTrack) audioTrack.enabled = false;
    
    socket.emit('join-room', {roomId, userId, role});
    socket.on('room-users', (userList) => {
      const side_remot = document.getElementById('side-remot-video');
      side_remot.innerHTML = ''; // Clear existing panels
      
      let panelHTML = '';
      
      for (const user in userList) {
        if (user !== userId) {
          const userData = userList[user];
          const { socketId , role } = userData;
          
          const videoId = `remot_vid_${socketId}`;
          const fullscreenBtnId = `fullscreen_${user}`;
          const micIconId = `mic_stat_${user}`;
          panelHTML += `
          <div class="video">
            <video id="${videoId}" autoplay playsinline class="uhd"></video>
            <button class="fullscreen-btn" id="${fullscreenBtnId}" aria-label="Fullscreen">
              <ion-icon name="expand"></ion-icon>
            </button>
            <button class="fullscreen-btn mic-ico" aria-label="Mic" disabled>
              <ion-icon id="${micIconId}" name="mic-off-outline"></ion-icon>
            </button>
            <label>${role} : ${user}</label>
          </div>
          `;  
        }
      }
      side_remot.innerHTML = panelHTML ;
    });
    
    socket.on('previous-messages', (messages) =>{
      const messagesElement = document.getElementById('messages');
      messagesElement.innerHTML = `` ;
      messages.forEach((message) =>{
        const mesg = `<div>${message.userId} : ${message.msg}</div>` ;
        messagesElement.innerHTML += mesg ;
        messagesElement.scrollTop = messagesElement.scrollHeight ;
      })
    });
    
    socket.on('user-join-videoroom', (id) => {
      const peer = createPeer(id);
      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
      peers[id] = peer;
      console.log("user-joined");
    });
    
    socket.on('offer', async ({ sdp, caller }) => {
      const peer = createPeer(caller, true);
      peers[caller] = peer;
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('answer', { target: caller, sdp: peer.localDescription });
      console.log("offer client");
    });
    
    socket.on('answer', async ({ sdp, callee }) => {
      await peers[callee].setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('answer client');
    });
    
    socket.on('ice-candidate', async ({ candidate, sender }) => {
      if (peers[sender]) {
        await peers[sender].addIceCandidate(new RTCIceCandidate(candidate));
      }
      console.log('ice-candidate client');
    });
    
    socket.on('message-received', ({ userId, msg}) =>{
      const msag = `<div class="chat-msg"><b>${userId}</b>: ${msg}</div>`;
      const msgDiv = document.getElementById('messages');   
      msgDiv.innerHTML += msag;
      msgDiv.scrollTop = msgDiv.scrollHeight;
    });
    
    socket.on('user-left', (id) => {
      if (peers[id]) {
        peers[id].getSenders().forEach(sender => {
          if (sender.track) sender.track.stop();
        });
        peers[id].close();
        delete peers[id];
      }
      const remoteContainer = document.getElementById(`remot_vid_${id}`)?.parentElement;
      if (remoteContainer) remoteContainer.remove();
      console.log('user-left');
    });

    socket.on('user-exit',(userId)=>{
      const remoteContainer = document.getElementById(`remot_vid_${userId}`)?.parentElement;
      if (remoteContainer) remoteContainer.remove();
      const alertBox = document.getElementById('alert');
      alertBox.innerHTML = `User : ${userId} has left.`;
      alertBox.style.display = 'block';
             
      // Hide after 2 seconds
      setTimeout(() => {
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
      }, 2000);
      const remoteVid = document.getElementById(`remot_vid_${user}`);
      if (remoteVid) remoteVid.remove();
    }); 
  }
  
  
  function showFallbackVideo() {
    //stopCamera();
    videoOther.removeAttribute("controls")
    videoOther.srcObject = null;
    videoOther.src = "/video.mp4"; // fallback video file
    videoOther.play().catch(err => console.warn("Autoplay blocked:", err));
    updateCamIcons();
    updateMicIcons();
  }
  
  function createPeer(id, isOfferReceiver = false) {
    
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302'},]
    });
    
    peer.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('ice-candidate', { target: id, candidate: event.candidate });
      }
    };
    
    peer.ontrack = event => {
      let remoteVideo = document.getElementById(`remot_vid_${id}`);
      if (remoteVideo){
        remoteVideo.srcObject = event.streams[0];
      }
      
    };
    
    if (!isOfferReceiver) {
      peer.onnegotiationneeded = async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('offer', { target: id, sdp: peer.localDescription });
      };
    }
    
    return peer;
  }
  
  async function switchCamera() {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({video: { facingMode: currentFacingMode }, audio: true });
      
      // Replace video tracks in the existing RTCPeerConnections
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];
      
      for (const id in peers) {
        const sender = peers[id].getSenders().find(s => s.track === oldVideoTrack);
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }
      
      // Update localStream and UI
      localStream.removeTrack(oldVideoTrack);
      localStream.addTrack(newVideoTrack);
      videoElem.srcObject = newStream;
      localStream = newStream;
      isCameraOn = true;
      updateCamIcons();
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  }
  
  
  function getRoomId(){
    const currentUrl = window.location.href ;
    const last = currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
    return last;
  }
  function getUserId(){
    const id = JSON.parse(localStorage.getItem('userId'));
    return id.name ;
  }
  function getUserRole(){
    const id = JSON.parse(localStorage.getItem('userId'));
    return id.role ;
  }
  // socket.io codes
  // Join Room
  
  socket.on('user-joined', (userId) => {
    const alertBox = document.getElementById('alert');
    alertBox.innerHTML = `New User Joined: ${userId}`;
    alertBox.style.display = 'block';
    
    // Hide after 2 seconds
    setTimeout(() => {
      alertBox.style.display = 'none';
      alertBox.innerHTML = '';
    }, 2000);
  });
  
  document.addEventListener('click', (e) => {
    if (e.target.closest('.fullscreen-btn')) {
      const video = e.target.closest('.video')?.querySelector('video');
      videoOther.srcObject = video.srcObject;
      console.log(video.srcObject);
      //if (video.requestFullscreen) video.requestFullscreen();
    }
  });
  
  socket.on('user-mic-status', ({ userId, micStatus }) => {
    const status = document.getElementById(`mic_stat_${userId}`)
    
    if (status) {
      status.name = micStatus ? "mic-outline" : "mic-off-outline";
    }
  });
  
  shareScreenBtn.addEventListener("click", async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    const screenTrack = screenStream.getVideoTracks()[0];

    for (const id in peers) {
      const sender = peers[id]
        .getSenders()
        .find(s => s.track.kind === "video");

      if (sender) {
        sender.replaceTrack(screenTrack);
      }
    }

    // Update local video preview (optional)
    videoElem.srcObject = screenStream;

    // When screen sharing ends, revert to original camera
    screenTrack.onended = async () => {
      if (!isCameraOn) return ;
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: true
      });

      const camTrack = camStream.getVideoTracks()[0];

      for (const id in peers) {
        const sender = peers[id]
          .getSenders()
          .find(s => s.track.kind === "video");

        if (sender) {
          sender.replaceTrack(camTrack);
        }
      }

      localStream.removeTrack(localStream.getVideoTracks()[0]);
      localStream.addTrack(camTrack);

      videoElem.srcObject = localStream = camStream;
      isCameraOn = true;
      updateCamIcons();
    };
  } catch (error) {
    console.error("Screen share failed:", error);
  }
});
  
  
  const send_btn = document.getElementById("send-msg");
  send_btn.addEventListener("click", () => {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (msg !== '') {
      socket.emit('message-send', { roomId, userId, msg });
      input.value = ''; // Clear the input field
    }
  });
  
  
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = document.getElementById('chat-input');
      const msg = input.value.trim();
      if (msg !== '') {
        socket.emit('message-send', { roomId, userId, msg });
        input.value = ''; // Clear the input field
      }
    }
  });
  
  
  camToggleBtn.addEventListener("click", () => {
    toggleVideo();
    updateCamIcons();
  });
  
  switchCameraBtn.addEventListener("click", () => {
    if (isCameraOn) {
      switchCamera();
    }
  });
  
  
  micToggleBtn.addEventListener("click", () => {
    toggleAudio();
    updateMicIcons();
    socket.emit('mic-status', {roomId, userId});
  });
  
  
            
  endBtn.addEventListener("click", () => {
    socket.emit("exit-room", ({roomId, userId}));
    socket.disconnect();
    location.replace("../");
  });
            
  
  
  // Draggable videoElem
  let isDragging = false, offsetX = 0, offsetY = 0;
  
  videoElem.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - videoElem.offsetLeft;
    offsetY = e.clientY - videoElem.offsetTop;
    videoElem.style.cursor = "grabbing";
  });
  
  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      videoElem.style.left = `${e.clientX - offsetX}px`;
      videoElem.style.top = `${e.clientY - offsetY}px`;
    }
  });
  
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      videoElem.style.cursor = "grab";
    }
  });
  
  window.addEventListener("beforeunload", () => {
    socket.emit("exit-room", ({roomId, userId}));
    socket.disconnect();
    for (const id in peers) {
      peers[id].close();
    }
  });
  // Initialize
  showFallbackVideo();
  joinRoom();
});