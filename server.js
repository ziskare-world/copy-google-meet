const express = require("express");
const http = require("http");
const path = require("path");
const bodyParser = require('body-parser');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const PORT = process.env.PORT || 8080;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

const rooms = {}; // Format: {roomId: {userId: userId}}
const mic = {};
const message = {};
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/room/:id", (req, res) => {
  res.sendFile(path.join(publicDir, "room.html"));
});

io.on("connection", (socket)=> {
  console.log("New User Connected: with socket id:", socket.id);

  socket.on('join-room', ({ roomId, userId , role}) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;

    if (!rooms[roomId] && !mic[roomId]) {
      rooms[roomId] = {};
      mic[roomId] = {};
    }
    rooms[roomId][userId] = {socketId: socket.id, role: role};
    mic[roomId][userId] = false;

    if (message[roomId]) {
      socket.emit('previous-messages', message[roomId]);
    }
    console.log(`user ${userId} join room ${roomId}`);
    socket.to(roomId).emit('user-joined', userId);
    io.to(roomId).emit('room-users', rooms[roomId]);
  });

  socket.on("mic-status", ({ roomId, userId }) => {
    if (!mic[roomId]) mic[roomId] = {};
    mic[roomId][userId] = !mic[roomId][userId];
    io.to(roomId).emit('user-mic-status', {
      userId: userId,
      micStatus: mic[roomId][userId]
    });
  });

  socket.on("exit-room", ({ roomId, userId }) =>{
    console.log(`user ${userId} exit room ${roomId}`);
    socket.leave(roomId);
    io.to(roomId).emit('user-exit', userId);

    if(rooms[roomId] && rooms[roomId][userId]){
      delete rooms[roomId][userId];
    }
    if (mic[roomId] && mic[roomId][userId]){
      delete mic[roomId][userId];
    }
    if (Object.keys(rooms[roomId]).length === 0) {
      delete rooms[roomId];
      delete mic[roomId];
      delete message[roomId];
    }
  });

  socket.on('message-send', ({ roomId, userId, msg }) => {
    if (roomId && msg) {
      const messg = {
        userId,
        msg,
        timestamp: new Date().toISOString(),
      };
      if (!message[roomId]) {
        message[roomId] = [];
      }
      message[roomId].push(messg);
      io.to(roomId).emit('message-received', { userId, msg });
    } else {
      console.warn('Invalid message payload:', { roomId, userId, msg });
    }
  });

  

  socket.on('disconnect', ()=> {
    const roomId = socket.roomId;
    const userId = socket.userId;

    if(roomId && userId && rooms[roomId] && rooms[roomId][userId]){
      delete rooms[roomId][userId];
      if (mic[roomId] && mic[roomId][userId]) {
        delete mic[roomId][userId];
      }

      console.log(`user ${userId} left room ${roomId}`);

      socket.to(roomId).emit('user-disconnected',userId);
      io.to(roomId).emit('room-users', Object.keys(rooms[roomId]));

      if (Object.keys(rooms[roomId]).length === 0) {
        delete rooms[roomId];
        delete mic[roomId];
        delete message[roomId];
      }
    }
  });
});


server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
