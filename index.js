require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
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
        const userWidth = parseInt(screenWidth) || 1920;
        const userHeight = parseInt(screenHeight) || 1080;
        const userAspectRatio = userWidth / userHeight;
        
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

        // STEP 1: Score each image
        const scoredResults = response.data.hits.map(image => {
            const imgWidth = image.imageWidth;
            const imgHeight = image.imageHeight;
            const imgAspectRatio = imgWidth / imgHeight;
            
            // Calculate scores
            const aspectScore = 1 - Math.abs(imgAspectRatio - userAspectRatio) / userAspectRatio;
            const widthScore = Math.min(imgWidth / userWidth, 1);
            const heightScore = Math.min(imgHeight / userHeight, 1);
            
            // Combined score: prioritize aspect ratio match
            let totalScore = (aspectScore * 0.4) + (widthScore * 0.3) + (heightScore * 0.3);
            
            // Penalty for being too large (over 2x)
            if (imgWidth > userWidth * 2 || imgHeight > userHeight * 2) {
                totalScore *= 0.7;
            }
            
            // Bonus for being close to exact resolution
            const sizeDiff = Math.abs(imgWidth - userWidth) + Math.abs(imgHeight - userHeight);
            const bonus = Math.max(0, 1 - sizeDiff / (userWidth + userHeight));
            totalScore += bonus * 0.1;
            
            return {
                ...image,
                score: totalScore,
                aspectRatio: imgAspectRatio,
                isPerfectMatch: imgWidth === userWidth && imgHeight === userHeight
            };
        });

        // STEP 2: Sort by score (highest first)
        scoredResults.sort((a, b) => b.score - a.score);

        // STEP 3: Take top 20
        const topResults = scoredResults.slice(0, 20);

        console.log(`✅ Found ${topResults.length} best matches`);

        res.json({
            total: scoredResults.length,
            wallpapers: topResults,
            yourResolution: `${userWidth}×${userHeight}`,
            message: topResults.length > 0 ? 
                `Showing the best matches for your ${userWidth}×${userHeight} screen` : 
                `No wallpapers found for ${userWidth}×${userHeight}`
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