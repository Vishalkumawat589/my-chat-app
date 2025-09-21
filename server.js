const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Serve the HTML file to the user
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// This runs when a new user connects to our server
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for a 'chat message' event from a user
  socket.on('chat message', (msg) => {
    // Broadcast the message to everyone else who is connected
    io.emit('chat message', msg);
  });

  // This runs when that user disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
