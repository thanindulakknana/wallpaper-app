require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/search', async (req, res) => {
    const { query, screenWidth, screenHeight } = req.query;
    // ... your search logic
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// THIS IS THE PROBLEM - app.listen() doesn't work on Vercel
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});