document.addEventListener("DOMContentLoaded", () => {
  const videoElem = document.getElementById("vid");
  const videoOther = document.getElementById("vid-other");
  const camToggleBtn = document.getElementById("toogle-camera");
  const switchCameraBtn = document.getElementById("switch-camera");
  const micToggleBtn = document.getElementById("toogle-audio");
  const fullscreenBtn = document.querySelector(".fullscreen-btn");
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
  let isAudiioPaused = true ;
  let currentFacingMode = "user";

  const socket = io('http://localhost:8080');
  const roomId = getRoomId();
  const userId = getUserId();
  const role = getUserRole();
  const peers = {} ;

  function stopVideoTracks() {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
  }

  function stopAudioTracks() {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }
  }

  function updateCamIcons() {
    camOnIcon.style.display = isCameraOn ? "block" : "none";
    camOffIcon.style.display = isCameraOn ? "none" : "block";
  }

  function updateMicIcons() {
    micOnIcon.style.display = isMicOn ? "block" : "none";
    micOffIcon.style.display = isMicOn ? "none" : "block";
  }

  function applyCombinedStream() {
    const combinedStream = new MediaStream();

    if (videoStream) {
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack) combinedStream.addTrack(videoTrack);
    }

    if (audioStream) {
      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) combinedStream.addTrack(audioTrack);
    }

    if (combinedStream.getTracks().length > 0) {
      videoElem.srcObject = combinedStream;
      videoElem.controls = false;
      videoElem.play().catch(err => console.warn("Autoplay blocked:", err));
    } else {
      videoElem.srcObject = null;
    }
  }
  
  async function startCamera() {
    try {
      stopVideoTracks();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
        audio: false
      });
      videoStream = stream;
      isCameraOn = true;
      updateCamIcons();
      applyCombinedStream();

    } catch (err) {
      console.error("Error starting camera:", err);
      alert("Camera access denied or not available.");
      showFallbackVideo();
    }
  }

  async function startMicrophone() {
    try {
      stopAudioTracks();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });
      audioStream = stream;
      isMicOn = true;
      updateMicIcons();
      applyCombinedStream();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
    }
  }

  function toggleAudio() {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (!audioTrack) return;

    isAudioPaused = !isAudioPaused;
    audioTrack.enabled = !isAudioPaused;

    document.getElementById('toggleAudioBtn').innerText = isAudioPaused ? 'Resume Audio' : 'Pause Audio';
  }

  function toggleVideo() {
    const videoTrack = localStream?.getVideoTracks()[0];
    if (!videoTrack) return;

    isVideoPaused = !isVideoPaused;
    videoTrack.enabled = !isVideoPaused;

    document.getElementById('toggleVideoBtn').innerText = isVideoPaused ? 'Resume Video' : 'Pause Video';
  }

  function stopCamera() {
    stopVideoTracks();
    isCameraOn = false;
    updateCamIcons();
    applyCombinedStream();
  }

  function stopMicrophone() {
    stopAudioTracks();
    isMicOn = false;
    updateMicIcons();
    applyCombinedStream();
  }

  function showFallbackVideo() {
    stopCamera();
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
      if (!remoteVideo) {
        remoteVideo = document.createElement('video');
        remoteVideo.id = `remot_vid_${id}`;
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        document.getElementById('side-remot-video').appendChild(remoteVideo);
      }
      remoteVideo.srcObject = event.streams[0];
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
  socket.emit('join-room', {roomId, userId, role});

  socket.on('previous-messages', (messages) =>{
    const messagesElement = document.getElementById('messages');
    messagesElement.innerHTML = `` ;
    messages.forEach((message) =>{
      const mesg = `<div>${message.userId} : ${message.msg}</div>` ;
      messagesElement.innerHTML += mesg ;
      messagesElement.scrollTop = messagesElement.scrollHeight ;
    })
  });
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
          <video id="${videoId}" class="uhd"></video>
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

  document.addEventListener('click', (e) => {
  if (e.target.closest('.fullscreen-btn')) {
    const video = e.target.closest('.video')?.querySelector('video');
    if (video.requestFullscreen) video.requestFullscreen();
  }
});

  socket.on('user-mic-status', ({ userId, micStatus }) => {
    const status = document.getElementById(`mic_stat_${userId}`)

    if (status) {
      status.name = micStatus ? "mic-outline" : "mic-off-outline";
    }
  });
  
  socket.on('message-received', ({ userId, msg}) =>{
    const msag = `<div>${userId} : ${msg}</div>`;
    const msgDiv = document.getElementById('messages');   
    msgDiv.innerHTML += msag;
    msgDiv.scrollTop = msgDiv.scrollHeight;
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
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();       
    }
  });

  switchCameraBtn.addEventListener("click", () => {
    if (!isCameraOn) return;
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    startCamera();
  });

  micToggleBtn.addEventListener("click", () => {
    if (isMicOn) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
    socket.emit('mic-status', {roomId, userId});
  });


  shareScreenBtn.addEventListener("click", async () => {
  try {
    if (!cachedCameraStream && videoStream) {
      cachedCameraStream = videoStream;
    }
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    videoStream = screenStream;
    isCameraOn = true;
    updateCamIcons();
    applyCombinedStream();

    screenStream.getVideoTracks()[0].addEventListener("ended", () => {
      videoStream = cachedCameraStream;
      cachedCameraStream = null;
      isCameraOn = !!videoStream;
      updateCamIcons();
      applyCombinedStream();
    });
  } catch (err) {
    console.error("Screen sharing failed:", err);
  }
});

  endBtn.addEventListener("click", () => {
    stopCamera();
    stopMicrophone();
    socket.emit("exit-room", ({roomId, userId}));
    location.replace("../");
  });

  socket.on('user-exit',(user, id)=>{
    const remoteContainer = document.getElementById(`remot_vid_${id}`)?.parentElement;
    if (remoteContainer) remoteContainer.remove();
    const alertBox = document.getElementById('alert');
    alertBox.innerHTML = `User : ${user} has left the room.`;
    alertBox.style.display = 'block';

    // Hide after 2 seconds
    setTimeout(() => {
      alertBox.style.display = 'none';
      alertBox.innerHTML = '';
    }, 2000);
    const remoteVid = document.getElementById(`remot_vid_${user}`);
    if (remoteVid) remoteVid.remove();
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

  window.addEventListener('beforeunload', () => {
     socket.emit('exit-room', { roomId, userId });
  });


  // Initialize
  showFallbackVideo();
  // userJoined();
});