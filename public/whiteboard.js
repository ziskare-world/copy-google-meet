const videoContainer = document.querySelector('.video');
const video = document.getElementById('vid-other');

const fullscreenBtn = videoContainer.querySelector('.fullscreen-btn');
const shareWhiteboardBtn = document.getElementById('share-white-board');
const whiteboardControls = document.getElementById('whiteboard-controls');

const penColorInput = document.getElementById('pen-color');
const eraserBtn = document.getElementById('eraser-btn');

const screenshotBtn = document.getElementById('screenshot-btn');
const clearBtn = document.getElementById('clear-btn');

const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

const addBoardBtn = document.getElementById('add-board');
const prevBoardBtn = document.getElementById('prev-board');
const nextBoardBtn = document.getElementById('next-board');

const boardIndexDisplay = document.getElementById('board-index-display');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let penColor = '#000000';
let penSize = 2;
let eraserSize = 22;
let isEraser = false;
let whiteboardActive = false;

let boards = [];
let currentBoardIndex = 0;

// Create a new whiteboard canvas object
function createBoard() {
  const canvas = document.createElement('canvas');
  canvas.classList.add('whiteboard-canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'none';
  canvas.style.zIndex = '10';
  canvas.style.backgroundColor = 'white';

  videoContainer.style.position = 'relative';
  videoContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  return {
    canvas,
    ctx,
    undoStack: [],
    redoStack: [],
    penColor: '#000000',
    penSize: 2,
    eraserSize: 22,
  };
}

function resizeCanvas(board) {
  const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
  const width = fsElement ? fsElement.clientWidth : videoContainer.clientWidth;
  const height = fsElement ? fsElement.clientHeight : videoContainer.clientHeight;
  board.canvas.width = width;
  board.canvas.height = height;

  // Fill background white after resize to avoid transparent blank
  board.ctx.fillStyle = 'white';
  board.ctx.fillRect(0, 0, board.canvas.width, board.canvas.height);

  // Restore last saved image if any
  if (board.undoStack.length > 0) {
    const lastImage = board.undoStack[board.undoStack.length -1];
    const img = new Image();
    img.onload = () => board.ctx.drawImage(img, 0, 0, board.canvas.width, board.canvas.height);
    img.src = lastImage;
  }
}

function saveState(board) {
  if (!board) return;
  // Limit undo stack size to prevent memory overload
  const maxUndoStackSize = 50;
  if (board.undoStack.length >= maxUndoStackSize) {
    board.undoStack.shift();
  }
  board.undoStack.push(board.canvas.toDataURL());
  board.redoStack = []; // clear redo on new action
  updateUndoRedoButtons();
}

function undo(board) {
  if (!board || board.undoStack.length < 2) return;
  const last = board.undoStack.pop();
  board.redoStack.push(last);
  const previous = board.undoStack[board.undoStack.length -1];
  const img = new Image();
  img.onload = () => {
    board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
    board.ctx.drawImage(img, 0, 0, board.canvas.width, board.canvas.height);
  };
  img.src = previous;
  updateUndoRedoButtons();
}

function redo(board) {
  if (!board || board.redoStack.length === 0) return;
  const imgData = board.redoStack.pop();
  const img = new Image();
  img.onload = () => {
    board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
    board.ctx.drawImage(img, 0, 0, board.canvas.width, board.canvas.height);
    saveState(board); // push redo image back to undo stack
  };
  img.src = imgData;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const board = getCurrentBoard();
  if (!board) return;
  undoBtn.disabled = board.undoStack.length < 2;
  redoBtn.disabled = board.redoStack.length === 0;
}

function startDrawing(e) {
  if (!whiteboardActive) return;
  const board = getCurrentBoard();
  if (!board) return;

  isDrawing = true;
  const rect = board.canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
}

function draw(e) {
  if (!isDrawing) return;
  const board = getCurrentBoard();
  if (!board) return;

  const rect = board.canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  board.ctx.strokeStyle = isEraser ? '#FFFFFF' : penColor;
  board.ctx.lineWidth = isEraser ? eraserSize : penSize;
  board.ctx.lineJoin = 'round';
  board.ctx.lineCap = 'round';

  board.ctx.beginPath();
  board.ctx.moveTo(lastX, lastY);
  board.ctx.lineTo(currentX, currentY);
  board.ctx.stroke();

  lastX = currentX;
  lastY = currentY;
}

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  const board = getCurrentBoard();
  saveState(board);
}

function attachCanvasEvents(canvas) {
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
}

function getCurrentBoard() {
  return boards[currentBoardIndex];
}

function updateCursor(board) {
  if (!board) return;
  
  if (isEraser ) {
    // Create cursor canvas
    const cursorCanvas = document.createElement('canvas');
    const size = eraserSize * 2;
    cursorCanvas.width = size;
    cursorCanvas.height = size;
    
    const ctx = cursorCanvas.getContext('2d');

    // Draw a white circle with black border as eraser cursor
    ctx.beginPath();
    
    ctx.arc(size / 2, size / 2, eraserSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.stroke();
    
    // Convert to data URL
    const dataURL = cursorCanvas.toDataURL();

    // Set cursor with hotspot at center
    board.canvas.style.cursor = `url(${dataURL}) ${eraserSize} ${eraserSize}, auto`;

  } else {
    // Pencil cursor: fallback to your existing icon or default cursor
    board.canvas.style.cursor = "url('pencil.svg') 0 32, auto";
  }
}


function showBoard(index) {
  if (index < 0 || index >= boards.length) return;
  // Hide all boards
  boards.forEach((board) => {
    board.canvas.style.display = 'none';
  });

  // Show selected board
  currentBoardIndex = index;
  const board = getCurrentBoard();
  board.canvas.style.display = 'block';
  resizeCanvas(board);

  // Update undo/redo buttons
  updateUndoRedoButtons();

  // Update cursor style on this board
  updateCursor(board);

  // Update board index display safely
  if (boardIndexDisplay) {
    boardIndexDisplay.textContent = `Board ${index + 1} of ${boards.length}`;
  }
}

// Button event listeners

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    videoContainer.requestFullscreen?.() || videoContainer.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
});

shareWhiteboardBtn.addEventListener('click', () => {
  whiteboardActive = !whiteboardActive;
  if (whiteboardActive) {
    video.style.display = 'none';
    whiteboardControls.style.display = 'flex';
    shareWhiteboardBtn.title = 'Stop Whiteboard';
    showBoard(currentBoardIndex);
  } else {
    video.style.display = 'block';
    whiteboardControls.style.display = 'none';
    boards.forEach(b => (b.canvas.style.display = 'none'));
    shareWhiteboardBtn.title = 'Share Whiteboard';
  }
});

penColorInput.addEventListener('input', (e) => {
  penColor = e.target.value;
  isEraser = false;
  eraserBtn.innerHTML = `<ion-icon name="ellipse-outline"></ion-icon>`;
  penSize = 2; // reset pen size on pen select
  updateCursor(getCurrentBoard());
});

eraserBtn.addEventListener('click', () => {
  isEraser = !isEraser;
  if (isEraser) {
    eraserBtn.innerHTML = `<ion-icon name="pencil-outline"></ion-icon>`;
  } else {
    eraserBtn.innerHTML = `<ion-icon name="ellipse-outline"></ion-icon>`;
    penSize = 2; // reset pen size when switching back to pen
  }
  updateCursor(getCurrentBoard());
});

clearBtn?.addEventListener('click', () => {
  const board = getCurrentBoard();
  if (!board) return;
  board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
  // Fill white background after clear
  board.ctx.fillStyle = 'white';
  board.ctx.fillRect(0, 0, board.canvas.width, board.canvas.height);
  saveState(board);
});

undoBtn?.addEventListener('click', () => {
  undo(getCurrentBoard());
});

redoBtn?.addEventListener('click', () => {
  redo(getCurrentBoard());
});

screenshotBtn?.addEventListener('click', () => {
  const board = getCurrentBoard();
  if (!board) return;

  // Create temp canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = board.canvas.width;
  tempCanvas.height = board.canvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.fillStyle = 'white';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(board.canvas, 0, 0);

  const imageData = tempCanvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.href = imageData;
  link.download = `whiteboard_${currentBoardIndex + 1}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

addBoardBtn?.addEventListener('click', () => {
  const newBoard = createBoard();
  attachCanvasEvents(newBoard.canvas);
  // Initialize with white background
  resizeCanvas(newBoard);
  newBoard.ctx.fillStyle = 'white';
  newBoard.ctx.fillRect(0, 0, newBoard.canvas.width, newBoard.canvas.height);
  saveState(newBoard);
  boards.push(newBoard);
  showBoard(boards.length - 1);
});

prevBoardBtn?.addEventListener('click', () => {
  if (boards.length === 0) return;
  let newIndex = currentBoardIndex - 1;
  if (newIndex < 0) newIndex = boards.length - 1;
  showBoard(newIndex);
});

nextBoardBtn?.addEventListener('click', () => {
  if (boards.length === 0) return;
  let newIndex = currentBoardIndex + 1;
  if (newIndex >= boards.length) newIndex = 0;
  showBoard(newIndex);
});

// Increase eraser size with Ctrl + '+'
document.addEventListener('keydown', (e) => {
  if (isEraser && e.ctrlKey) {
    const board = getCurrentBoard();

    // Increase size (Ctrl + '+' or '=')
    if (e.key === '+' || e.key === '=') {
      if (eraserSize < 128) {
        eraserSize = Math.min(eraserSize + 2, 64);
        updateCursor(board);
      }
      e.preventDefault();
    }

    // Decrease size (Ctrl + '-' or '_')
    if (e.key === '-' || e.key === '_') {
      if (eraserSize > 2) {
        eraserSize = Math.max(eraserSize - 2, 2);
        updateCursor(board);

      }
      e.preventDefault();
    }
  }
});




// Window resize event resize current board
window.addEventListener('resize', () => {
  const board = getCurrentBoard();
  if (!board) return;
  resizeCanvas(board);
});

document.addEventListener('fullscreenchange', () => {
  const board = getCurrentBoard();
  if (!board) return;
  resizeCanvas(board);
});
document.addEventListener('webkitfullscreenchange', () => {
  const board = getCurrentBoard();
  if (!board) return;
  resizeCanvas(board);
});

// INITIAL SETUP
boards.push(createBoard());
attachCanvasEvents(boards[0].canvas);

// Initialize white background on first board
resizeCanvas(boards[0]);
boards[0].ctx.fillStyle = 'white';
boards[0].ctx.fillRect(0, 0, boards[0].canvas.width, boards[0].canvas.height);
saveState(boards[0]);



// INITIAL SETUP

// Attach event listeners to both boards
boards.forEach(board => attachCanvasEvents(board.canvas));

// Initialize white background on both boards
boards.forEach(board => {
    resizeCanvas(board);
    board.ctx.fillStyle = 'white';
    board.ctx.fillRect(0, 0, board.canvas.width, board.canvas.height);
    saveState(board);
    board.canvas.style.display = 'none'; // initially hidden
});

whiteboardActive = false;
shareWhiteboardBtn.title = 'Share Whiteboard';
video.style.display = 'block';
whiteboardControls.style.display = 'none';

isEraser = false;
updateCursor(getCurrentBoard());

