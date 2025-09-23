// --- 1. Import Dependencies ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// --- 2. Set up App & Middleware ---
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- 3. Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- Helper Function to Create Table ---
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

// --- 4. Define API Routes (Endpoints) ---

// A simple validation function
const isValidInput = (input) => /^[a-z]+$/.test(input);

/**
 * Endpoint to register a new user.
 */
app.post('/register', async (req, res) => {
  const { name, answer1, answer2 } = req.body;

  if (!name || !answer1 || !answer2 || !isValidInput(name) || !isValidInput(answer1) || !isValidInput(answer2)) {
    return res.status(400).json({ success: false, message: 'Invalid input. Use lowercase letters only for all fields.' });
  }

  try {
    const client = await pool.connect();
    // Check if user already exists
    const userExists = await client.query('SELECT * FROM users WHERE name = $1', [name]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This name is already taken.' });
    }

    // Create new user
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

/**
 * Endpoint to recover/log in a user.
 */
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

// --- 5. Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
  createUsersTable();
});
