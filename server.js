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
    origin: [
      "https://vishalkumawat589.github.io", // Production (GitHub Pages)
      "http://localhost:5500",              // Local testing
      "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors({
  origin: [
    "https://vishalkumawat589.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ]
}));
app.use(express.json());

// --- 3. Database & Admin Configuration ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const ADMIN_NAME = process.env.ADMIN_NAME || 'vishal';
let connectedUsers = {}; // { username: socketId }

// Create users table if not exists
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
    console.log('Table "users" is ready.');
    client.release();
  } catch (err) {
    console.error('Error creating users table:', err);
  }
};

// --- 4. API Routes ---
const isValidInput = (input) => /^[a-z]+$/.test(input);

app.post('/register', async (req, res) => {
  const { name, answer1, answer2 } = req.body;
  if (!isValidInput(name) || !isValidInput(answer1) || !isValidInput(answer2)) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }
  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO users (name, answer1, answer2) VALUES ($1, $2, $3) RETURNING name',
      [name, answer1, answer2]
    );
    client.release();
    res.status(201).json({ success: true, name: result.rows[0].name });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: 'User already exists' });
    } else {
      console.error('Error registering user:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

app.post('/recover', async (req, res) => {
  const { name, answer1, answer2 } = req.body;
  if (!isValidInput(name) || !isValidInput(answer1) || !isValidInput(answer2)) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM users WHERE name = $1 AND answer1 = $2 AND answer2 = $3',
      [name, answer1, answer2]
    );
    client.release();
    if (result.rows.length > 0) {
      res.status(200).json({ success: true, name: result.rows[0].name });
    } else {
      res.status(401).json({ success: false, message: 'Recovery failed' });
    }
  } catch (err) {
    console.error('Error in recovery:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Endpoint to get all registered users
app.get('/users', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT name FROM users');
    const users = result.rows.map(row => row.name);
    res.status(200).json({ success: true, users: users });
    client.release();
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ Server is running');
});

// --- 5. Real-Time Private Chat Logic ---
io.on('connection', (socket) => {
  socket.on('user connected', (username) => {
    console.log(`${username} connected`);
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
        console.log(`${username} disconnected`);
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
  console.log(`Server is running on port ${PORT}`);
  createUsersTable();
});
