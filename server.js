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

io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for a 'chat message' event from a user
  // The 'msg' is now an object: { name: '...', text: '...' }
  socket.on('chat message', (msg) => {
    // Create the final message object to send to everyone
    const finalMessage = {
      name: msg.name,
      text: msg.text,
      time: new Date() // Add the current server time
    };
    
    // Broadcast the complete message object
    io.emit('chat message', finalMessage);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
