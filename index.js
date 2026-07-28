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
        
        // Calculate user's aspect ratio (e.g., 16:9, 16:10, etc.)
        const userAspectRatio = userWidth / userHeight;
        
        console.log(`📐 User resolution: ${userWidth}×${userHeight}, Aspect Ratio: ${userAspectRatio.toFixed(3)}`);

        const response = await axios.get('https://pixabay.com/api/', {
            params: {
                key: process.env.PIXABAY_API_KEY,
                q: query,
                per_page: 200,
                image_type: 'photo',
                safesearch: true
            }
        });

        // STEP 1: Filter images
        const filteredResults = response.data.hits.filter(image => {
            const imgWidth = image.imageWidth;
            const imgHeight = image.imageHeight;
            const imgAspectRatio = imgWidth / imgHeight;
            
            // ✅ Condition 1: Image must be at least as large as user's screen
            const isLargeEnough = imgWidth >= userWidth && imgHeight >= userHeight;
            
            // ✅ Condition 2: Aspect ratio must match within 5% tolerance
            const aspectRatioMatch = Math.abs(imgAspectRatio - userAspectRatio) < 0.05;
            
            // ✅ Condition 3: Image shouldn't be TOO large (max 2x the user's resolution)
            const isNotTooLarge = imgWidth <= userWidth * 2 && imgHeight <= userHeight * 2;
            
            // ✅ Condition 4: Prefer images that are closer to user's resolution
            const sizeDiff = Math.abs(imgWidth - userWidth) + Math.abs(imgHeight - userHeight);
            
            return isLargeEnough && aspectRatioMatch && isNotTooLarge;
        });

        // STEP 2: Sort by closest match to user's resolution
        filteredResults.sort((a, b) => {
            const aDiff = Math.abs(a.imageWidth - userWidth) + Math.abs(a.imageHeight - userHeight);
            const bDiff = Math.abs(b.imageWidth - userWidth) + Math.abs(b.imageHeight - userHeight);
            return aDiff - bDiff;
        });

        // STEP 3: Take top 20 results
        const topResults = filteredResults.slice(0, 20);

        console.log(`✅ Found ${filteredResults.length} matching wallpapers, showing ${topResults.length}`);

        res.json({
            total: filteredResults.length,
            wallpapers: topResults,
            yourResolution: `${userWidth}×${userHeight}`,
            aspectRatio: userAspectRatio.toFixed(3)
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

// Export for Vercel
module.exports = app;

// Start server locally
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}