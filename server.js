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
let connectedUsers = {};

// (The createUsersTable function remains the same)
const createUsersTable = async () => { /* ... (code from previous version) ... */ };

// --- 4. API Routes ---
const isValidInput = (input) => /^[a-z]+$/.test(input);

app.post('/register', async (req, res) => {
  const { name, answer1, answer2 } = req.body;
  if (!name || !answer1 || !answer2 || !isValidInput(name) || !isValidInput(answer1) || !isValidInput(answer2)) {
    return res.status(400).json({ success: false, message: 'Invalid input. Use lowercase letters only for all fields.' });
  }

  let client; // Define client here to be accessible in finally block
  try {
    client = await pool.connect();
    const userExists = await client.query('SELECT * FROM users WHERE name = $1', [name]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This name is already taken.' });
    }
    const createUserQuery = 'INSERT INTO users (name, answer1, answer2) VALUES ($1, $2, $3)';
    await client.query(createUserQuery, [name, answer1, answer2]);
    console.log(`User '${name}' created.`);
    res.status(201).json({ success: true, message: 'Registration successful.' });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  } finally {
    if (client) {
      client.release(); // This will ALWAYS run and release the connection
    }
  }
});

app.post('/recover', async (req, res) => {
  const { name, answer1, answer2 } = req.body;
  if (!name || !answer1 || !answer2) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  let client;
  try {
    client = await pool.connect();
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
  } catch (err) {
    console.error('Error during recovery:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  } finally {
    if (client) {
      client.release(); // This will ALWAYS run and release the connection
    }
  }
});

app.get('/users', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT name FROM users');
    const users = result.rows.map(row => row.name);
    res.status(200).json({ success: true, users: users });
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// --- 5. Real-Time Private Chat Logic ---
// (This logic remains the same as the previous version)
io.on('connection', (socket) => { /* ... (code from previous version) ... */ });

// --- 6. Start the Server ---
httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  createUsersTable();
});

// Note: To keep this block concise, some identical code has been commented out.
// Please use the full functions provided here, as the structure for handling database connections has changed.
      
