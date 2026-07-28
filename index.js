require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Root route - serves index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Route: Search for wallpapers
app.get('/api/search', async (req, res) => {
    const { query, screenWidth, screenHeight } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    if (!process.env.PIXABAY_API_KEY) {
        return res.status(500).json({ error: 'PIXABAY_API_KEY is not configured' });
    }

    try {
        const userWidth = parseInt(screenWidth) || 1920;
        const userHeight = parseInt(screenHeight) || 1080;
        
        const response = await axios.get('https://pixabay.com/api/', {
            params: {
                key: process.env.PIXABAY_API_KEY,
                q: query,
                per_page: 200,
                image_type: 'photo',
                safesearch: true
            }
        });

        const filteredResults = response.data.hits.filter(image => {
            return image.imageWidth >= userWidth && image.imageHeight >= userHeight;
        });

        filteredResults.sort((a, b) => {
            const aDiff = Math.abs(a.imageWidth - userWidth) + Math.abs(a.imageHeight - userHeight);
            const bDiff = Math.abs(b.imageWidth - userWidth) + Math.abs(b.imageHeight - userHeight);
            return aDiff - bDiff;
        });

        res.json({
            total: filteredResults.length,
            wallpapers: filteredResults.slice(0, 20),
            yourResolution: `${userWidth}×${userHeight}`
        });

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch images from Pixabay',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        apiKeyConfigured: !!process.env.PIXABAY_API_KEY
    });
});

// ✅ BOTH: Works locally AND on Vercel
// - On Vercel: module.exports = app
// - On local: app.listen()
module.exports = app;

// ✅ Start the server ONLY when running locally (not on Vercel)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}