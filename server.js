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

const ADMIN_NAME = 'vishal'; // Your designated admin username
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

// --- 4. API Routes for Login/Registration ---
// (Your /register and /recover endpoints remain exactly the same)
const isValidInput = (input) => /^[a-z]+$/.test(input);

app.post('/register', async (req, res) => {
  const { name, answer1, answer2 } = req.body;
  if (!name || !answer1 || !answer2 || !isValidInput(name) || !isValidInput(answer1) || !isValidInput(answer2)) {
    return res.status(400).json({ success: false, message: 'Invalid input. Use lowercase letters only for all fields.' });
  }
  try {
    const client = await pool.connect();
    const userExists = await client.query('SELECT * FROM users WHERE name = $1', [name]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This name is already taken.' });
    }
    const createUserQuery = 'INSERT INTO users (name, answer1, answer2) VALUES ($1, $2, $3)';
    await client.query(createUserQuery, [name, answer1, answer2]);
    console.log(`User '${name}' created.`);
    res.status(201).json({ success: true, message: 'Registration successful.' });
    client.release();
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

app.post('/recover', async (req, res) => {
  const { name, answer1, answer2 } = req.body;
  if (!name || !answer1 || !answer2) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  try {
    const client = await pool.connect();
    const findUserQuery = 'SELECT * FROM users WHERE name = $1';
    const userResult = await client.query(findUserQuery, [name]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'This name is not registered.' });
    }
    const user = userResult.rows[0];
    if (user.answer1 === answer1 && user.answer2 === answer2) {
      console.log(`User '${name}' recovered session.`);
      res.status(200).json({ success: true, message: 'Login successful.' });
    } else {
      res.status(401).json({ success: false, message: 'One or more security answers are incorrect.' });
    }
    client.release();
  } catch (err) {
    console.error('Error during recovery:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// --- 5. Real-Time Private Chat Logic ---
io.on('connection', (socket) => {
  // When a user logs in, they tell the server who they are
  socket.on('user connected', (username) => {
    console.log(`${username} connected to chat`);
    connectedUsers[username] = socket.id;

    // Notify the admin that a new user has connected
    if (connectedUsers[ADMIN_NAME] && username !== ADMIN_NAME) {
      io.to(connectedUsers[ADMIN_NAME]).emit('user list update', Object.keys(connectedUsers));
    }
  });

  // When the server receives a message, route it privately
  socket.on('private message', (msg) => {
    // msg object: { from: 'sender_name', to: 'recipient_name', text: 'message text' }
    
    if (msg.from === ADMIN_NAME) {
      // Message is from Admin, send to a specific user
      const recipientSocketId = connectedUsers[msg.to];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('private message', msg);
      }
    } else {
      // Message is from a user, send it to the Admin
      const adminSocketId = connectedUsers[ADMIN_NAME];
      if (adminSocketId) {
        io.to(adminSocketId).emit('private message', msg);
      }
    }
  });

  socket.on('disconnect', () => {
    // Find which user disconnected and remove them
    for (const username in connectedUsers) {
      if (connectedUsers[username] === socket.id) {
        delete connectedUsers[username];
        console.log(`${username} disconnected from chat`);
        // Notify the admin about the updated user list
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
