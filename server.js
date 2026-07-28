require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Route: Search for wallpapers
app.get('/api/search', async (req, res) => {
    const { query, screenWidth, screenHeight } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const response = await axios.get('https://pixabay.com/api/', {
            params: {
                key: process.env.PIXABAY_API_KEY,
                q: query,
                per_page: 200,
                image_type: 'photo',
                safesearch: true
            }
        });

        // Filter images that are LARGER than the user's screen
        const filteredResults = response.data.hits.filter(image => {
            return image.imageWidth >= screenWidth && image.imageHeight >= screenHeight;
        });

        res.json({
            total: filteredResults.length,
            wallpapers: filteredResults.slice(0, 20)
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Failed to fetch images from Pixabay' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});