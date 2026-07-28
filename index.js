require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/search', async (req, res) => {
    const { query, screenWidth, screenHeight } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    if (!process.env.PIXABAY_API_KEY) {
        return res.status(500).json({ error: 'PIXABAY_API_KEY is not configured' });
    }

    try {
        const userWidth = parseInt(screenWidth) || 1600;
        const userHeight = parseInt(screenHeight) || 900;
        const userAspectRatio = userWidth / userHeight; // 1.777 (16:9)
        
        console.log(`📐 User: ${userWidth}×${userHeight}, Aspect: ${userAspectRatio.toFixed(3)}`);

        const response = await axios.get('https://pixabay.com/api/', {
            params: {
                key: process.env.PIXABAY_API_KEY,
                q: query,
                per_page: 200,
                image_type: 'photo',
                safesearch: true
            }
        });

        // SCORE each image by:
        // 1. Aspect ratio match (most important)
        // 2. Resolution match (secondary)
        const scoredResults = response.data.hits.map(image => {
            const imgWidth = image.imageWidth;
            const imgHeight = image.imageHeight;
            const imgAspectRatio = imgWidth / imgHeight;
            
            // Aspect ratio must be within 5% of user's
            const aspectMatch = Math.abs(imgAspectRatio - userAspectRatio) / userAspectRatio;
            const aspectScore = Math.max(0, 1 - aspectMatch);
            
            // Resolution match
            const widthScore = Math.min(imgWidth / userWidth, 1);
            const heightScore = Math.min(imgHeight / userHeight, 1);
            
            // Combined score
            let totalScore = (aspectScore * 0.6) + (widthScore * 0.2) + (heightScore * 0.2);
            
            // Bonus for exact or very close resolution
            const sizeDiff = Math.abs(imgWidth - userWidth) + Math.abs(imgHeight - userHeight);
            if (sizeDiff < 100) totalScore += 0.3;
            else if (sizeDiff < 300) totalScore += 0.15;
            
            return {
                ...image,
                score: Math.round(totalScore * 100),
                aspectRatio: imgAspectRatio,
                isExactAspect: aspectMatch < 0.03
            };
        });

        // Sort by score
        scoredResults.sort((a, b) => b.score - a.score);

        // Take top 20
        const topResults = scoredResults.slice(0, 20);

        res.json({
            total: scoredResults.length,
            wallpapers: topResults,
            yourResolution: `${userWidth}×${userHeight}`,
            yourAspectRatio: userAspectRatio.toFixed(3)
        });

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch images from Pixabay',
            details: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        apiKeyConfigured: !!process.env.PIXABAY_API_KEY
    });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}