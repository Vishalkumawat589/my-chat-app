// --- 1. Import Dependencies ---
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');

// --- 2. Set up App, Server, and Socket.IO ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "https://vishalkumawat589.github.io",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors({ origin: 'https://vishalkumawat589.github.io' }));
app.use(express.json());

// --- 3. Database & Admin Configuration ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const ADMIN_NAME = 'vishal';
let connectedUsers = {}; // Tracks users: { username: socketId }

// (The createUsersTable function remains the same)
const createUsersTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      answer1 VARCHAR(255) NOT NULL,
      answer2 VARCHAR(255) NOT NULL
    );
  `;
  try {
    const client = await pool.connect();
    await client.query(createTableQuery);
    console.log('Table "users" with security questions is ready.');
    client.release();
  } catch (err) {
    console.error('Error creating users table:', err);
  }
};

// --- 4. API Routes ---

// (Your /register and /recover endpoints remain the same)
const isValidInput = (input) => /^[a-z]+$/.test(input);
app.post('/register', async (req, res) => { /* ... (code from previous version) ... */ });
app.post('/recover', async (req, res) => { /* ... (code from previous version) ... */ });


// --- NEW Endpoint to get all registered users ---
app.get('/users', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT name FROM users');
    const users = result.rows.map(row => row.name);
    res.status(200).json({ success: true, users: users });
    client.release();
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});


// --- 5. Real-Time Private Chat Logic ---
// (This logic remains the same as the previous version)
io.on('connection', (socket) => {
  socket.on('user connected', (username) => {
    console.log(`${username} connected to chat`);
    connectedUsers[username] = socket.id;
    if (connectedUsers[ADMIN_NAME] && username !== ADMIN_NAME) {
      io.to(connectedUsers[ADMIN_NAME]).emit('user list update', Object.keys(connectedUsers));
    }
  });

  socket.on('private message', (msg) => {
    if (msg.from === ADMIN_NAME) {
      const recipientSocketId = connectedUsers[msg.to];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('private message', msg);
      }
    } else {
      const adminSocketId = connectedUsers[ADMIN_NAME];
      if (adminSocketId) {
        io.to(adminSocketId).emit('private message', msg);
      }
    }
  });

  socket.on('disconnect', () => {
    for (const username in connectedUsers) {
      if (connectedUsers[username] === socket.id) {
        delete connectedUsers[username];
        console.log(`${username} disconnected from chat`);
        if (connectedUsers[ADMIN_NAME]) {
          io.to(connectedUsers[ADMIN_NAME]).emit('user list update', Object.keys(connectedUsers));
        }
        break;
      }
    }
  });
});


// --- 6. Start the Server ---
httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  createUsersTable();
});

// Note: To keep this block concise, the identical code for /register and /recover has been commented out. 
// You should keep the full functions from the previous version in your file.
