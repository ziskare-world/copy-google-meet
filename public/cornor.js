// const panel = document.getElementById('videoPanel');
//     const video = document.getElementById('vid');
//     let isDragging = false;
//     let offsetX = 0, offsetY = 0;

//     // DRAG EVENTS
//     function startDrag(x, y) {
//       isDragging = true;
//       offsetX = x - panel.offsetLeft;
//       offsetY = y - panel.offsetTop;
//     }

//     function doDrag(x, y) {
//       if (!isDragging) return;
//       panel.style.left = (x - offsetX) + 'px';
//       panel.style.top = (y - offsetY) + 'px';
//     }

//     function stopDrag() {
//       if (!isDragging) return;
//       isDragging = false;
//       snapToNearestCorner();
//     }

//     // MOUSE
//     panel.addEventListener('mousedown', e => {
//       if (e.target.closest('.fullscreen-btn')) return;
//       startDrag(e.clientX, e.clientY);
//     });

//     document.addEventListener('mousemove', e => doDrag(e.clientX, e.clientY));
//     document.addEventListener('mouseup', stopDrag);

//     // TOUCH
//     panel.addEventListener('touchstart', e => {
//       if (e.target.closest('.fullscreen-btn')) return;
//       const touch = e.touches[0];
//       startDrag(touch.clientX, touch.clientY);
//     });

//     document.addEventListener('touchmove', e => {
//       if (e.touches.length > 0) {
//         const touch = e.touches[0];
//         doDrag(touch.clientX, touch.clientY);
//       }
//     });

//     document.addEventListener('touchend', stopDrag);

//     // SNAP FUNCTION
//     function snapToNearestCorner() {
//       const rect = panel.getBoundingClientRect();
//       const screenW = window.innerWidth;
//       const screenH = window.innerHeight;
//       const padding = 40;

//       const positions = {
//         'top-left': { top: padding, left: padding },
//         'top-right': { top: padding, left: screenW - rect.width - padding },
//         'bottom-left': { top: screenH - rect.height - padding, left: padding },
//         'bottom-right': { top: screenH - rect.height - padding, left: screenW - rect.width - padding }
//       };

//       let closest = null;
//       let minDist = Infinity;

//       for (const key in positions) {
//         const pos = positions[key];
//         const dist = Math.hypot(rect.left - pos.left, rect.top - pos.top);
//         if (dist < minDist) {
//           minDist = dist;
//           closest = pos;
//         }
//       }

//       if (closest) {
//         panel.style.top = `${closest.top}px`;
//         panel.style.left = `${closest.left}px`;
//       }
//     }

//     // SNAP ON RESIZE
//     window.addEventListener('resize', () => {
//       snapToNearestCorner();
//     });

//     // INITIAL SNAP (on load)
//     window.onload = () => {
//       snapToNearestCorner();
//     };