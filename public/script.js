document.addEventListener('DOMContentLoaded', () => {
  const videoElem = document.querySelector(".vid");
  const camToggleBtn = document.getElementById("toogle-camera");
  const camOnIcon = document.getElementById("cam-on");
  const camOffIcon = document.getElementById("cam-off");
  const micToggleBtn = document.getElementById("toogle-audio");
  const micOnIcon = document.getElementById("mic-on");
  const micOffIcon = document.getElementById("mic-off");
  const fullscreenButtons = document.querySelectorAll(".fullscreen-btn");
  const toggleThemeBtn = document.getElementById("toggle-theme");
  const themeIcon = document.getElementById("theme-icon");
  const end_meating = document.getElementById("end-meeting");
  const videoPanel = document.getElementById('videoPanel');
  const themes = ["theme-dark", "theme-light", "theme-colored", "theme-warm", "theme-ocean"];
  let currentThemeIndex = 0;

  let localStream = null;
  let isCameraOn = false;
  let isMicOn = true;

  // ---------- THEME TOGGLE ----------
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme && themes.includes(savedTheme)) {
    currentThemeIndex = themes.indexOf(savedTheme);
    applyTheme(themes[currentThemeIndex]);
  } else {
    applyTheme(themes[0]);
  }

  function applyTheme(theme) {
    themes.forEach(t => document.body.classList.remove(t));
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);

    switch (theme) {
      case "theme-dark":
        themeIcon.setAttribute("name", "moon-outline");
        break;
      case "theme-light":
        themeIcon.setAttribute("name", "sunny-outline");
        break;
      case "theme-colored":
        themeIcon.setAttribute("name", "color-palette-outline");
        break;
      case "theme-warm":
        themeIcon.setAttribute("name", "flame-outline");
        break;
      case "theme-ocean":
        themeIcon.setAttribute("name", "water-outline");
        break;
      default:
        themeIcon.setAttribute("name", "moon-outline");
    }
  }

  toggleThemeBtn.addEventListener("click", () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    applyTheme(themes[currentThemeIndex]);
  });

  // ---------- FULLSCREEN ----------
  fullscreenButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const video = btn.previousElementSibling;
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    });
  });
  // -------Side Screen Navigation----------
  const side_video = document.getElementById("side-remot-video");
  const side_video_toggle = document.getElementById("toggle-remote-video");

  side_video_toggle.addEventListener("click", () => {
    const display = window.getComputedStyle(side_video).display;
    if (display === "none") {
      side_video.style.display = "block";
      videoPanel.style.display = "none";
    } else {
      side_video.style.display = "none";
      videoPanel.style.display = "block";
    }
  });

  const side_chat = document.getElementById("side-chat");
  const side_chat_toggle = document.getElementById("toggle-chat-pannel");

  side_chat_toggle.addEventListener("click", () => {
    const display = window.getComputedStyle(side_chat).display;
    if (display === "none") {
      side_chat.style.display = "block";
    } else {
      side_chat.style.display = "none";
    }
  });
  // ---------- MIC TOGGLE ----------
  micOnIcon.style.display = "none";
  micOffIcon.style.display = "block";

  micToggleBtn.addEventListener("click", () => {
    if (!localStream) 
      return ;
    isMicOn = !isMicOn;
    localStream.getAudioTracks().forEach(track => (track.enabled = isMicOn));
    micOnIcon.style.display = isMicOn ? "block" : "none";
    micOffIcon.style.display = isMicOn ? "none" : "block";
  });


  // ---------- CAMERA TOGGLE ----------
  camOnIcon.style.display = "none";
  camOffIcon.style.display = "block";


  end_meating.addEventListener("click", () => {
    if(localStream.getItem("name")){
      localStorage.removeItem("name");
    }
  });

});
