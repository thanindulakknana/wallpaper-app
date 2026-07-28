<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Wallpaper Finder</title>
    <style>
        body { font-family: Arial, sans-serif; background: #121212; color: white; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .search-box { display: flex; gap: 10px; margin-bottom: 30px; flex-wrap: wrap; }
        input { flex: 1; padding: 15px; border: none; border-radius: 8px; font-size: 16px; min-width: 200px; }
        button { padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
        button:hover { background: #45a049; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
        .card { background: #1e1e1e; border-radius: 10px; overflow: hidden; text-align: center; position: relative; }
        .card img { width: 100%; height: 200px; object-fit: cover; cursor: pointer; transition: transform 0.2s; }
        .card img:hover { transform: scale(1.02); }
        .card p { padding: 10px; font-size: 14px; color: #aaa; margin: 0; }
        .card .download-btn {
            display: inline-block;
            margin: 10px 0 15px 0;
            padding: 8px 20px;
            background: #0070f3;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
        }
        .card .download-btn:hover { background: #005bb5; }
        .resolution-badge { background: #333; padding: 5px 10px; border-radius: 20px; font-size: 12px; display: inline-block; margin-top: 5px; }
        .status { margin-top: 20px; text-align: center; }
        .resolution-info { background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4CAF50; }
        .resolution-info strong { color: #4CAF50; }
        .loading { color: #ffa500; }
        .error { color: #ff4444; }
        .success { color: #4CAF50; }
        .manual-link { color: #0070f3; cursor: pointer; text-decoration: underline; }
        .match-badge { 
            display: inline-block; 
            padding: 2px 10px; 
            border-radius: 10px; 
            font-size: 11px; 
            background: #2e7d32; 
            color: #a5d6a7; 
            margin-left: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖥️ Smart Wallpaper Finder</h1>
        
        <div class="resolution-info">
            📱 <strong>Detected Screen Resolution:</strong> <span id="detectedResolution">Loading...</span>
            <br />
            <small>If this is incorrect, <span class="manual-link" onclick="manualResolution()">click here to set it manually</span></small>
        </div>
        
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search wallpapers... (e.g., mountains, sunset, car)" />
            <button onclick="performSearch()">🔍 Search</button>
        </div>

        <div id="results" class="grid"></div>
        <p id="statusMessage" class="status"></p>
    </div>

    <script>
        // ✅ FIXED SCREEN DETECTION
        (function detectScreen() {
            const screenWidth = screen.width;
            const screenHeight = screen.height;
            const pixelRatio = window.devicePixelRatio || 1;
            
            // This gives the TRUE physical resolution (1600×900 for you)
            const effectiveWidth = Math.round(screenWidth * pixelRatio);
            const effectiveHeight = Math.round(screenHeight * pixelRatio);
            
            // Check if Windows scaling is causing issues
            const displayElement = document.getElementById('detectedResolution');
            if (displayElement) {
                displayElement.innerText = 
                    `${effectiveWidth} × ${effectiveHeight} pixels (Logical: ${screenWidth}×${screenHeight}, DPR: ${pixelRatio}x)`;
            }
            
            // Store for search function
            window.SCREEN_WIDTH = effectiveWidth;
            window.SCREEN_HEIGHT = effectiveHeight;
            
            console.log(`✅ Detected: ${effectiveWidth}×${effectiveHeight}`);
            console.log(`ℹ️  Logical: ${screenWidth}×${screenHeight}, DPR: ${pixelRatio}`);
        })();

        // ✅ MANUAL RESOLUTION OVERRIDE
        function manualResolution() {
            const width = prompt("Enter your actual screen width (e.g., 1600):");
            const height = prompt("Enter your actual screen height (e.g., 900):");
            if (width && height) {
                window.SCREEN_WIDTH = parseInt(width);
                window.SCREEN_HEIGHT = parseInt(height);
                document.getElementById('detectedResolution').innerHTML = 
                    `${parseInt(width)} × ${parseInt(height)} pixels <span style="color:#ffa500;">(Manual override)</span>`;
                alert(`✅ Screen resolution set to ${width}×${height}`);
            }
        }

        // ✅ SEARCH FUNCTION
        async function performSearch() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) {
                alert('Please enter a search term!');
                return;
            }

            const resultsContainer = document.getElementById('results');
            const statusMsg = document.getElementById('statusMessage');
            resultsContainer.innerHTML = '';
            statusMsg.innerHTML = '⏳ Searching for wallpapers that fit your screen...';
            statusMsg.className = 'status loading';

            try {
                const width = window.SCREEN_WIDTH || Math.round(screen.width * (window.devicePixelRatio || 1));
                const height = window.SCREEN_HEIGHT || Math.round(screen.height * (window.devicePixelRatio || 1));

                const response = await fetch(
                    `/api/search?query=${encodeURIComponent(query)}&screenWidth=${width}&screenHeight=${height}`
                );
                const data = await response.json();

                if (data.error) {
                    statusMsg.innerHTML = '❌ Error: ' + data.error;
                    statusMsg.className = 'status error';
                    return;
                }

                if (data.wallpapers.length === 0) {
                    statusMsg.innerHTML = `😕 No wallpapers found that fit your ${width}×${height} screen. Try a broader search.`;
                    statusMsg.className = 'status error';
                    return;
                }

                statusMsg.innerHTML = `✅ Found ${data.total} matching wallpapers for your ${data.yourResolution || width+'×'+height} screen. Showing ${data.wallpapers.length}.`;
                statusMsg.className = 'status success';

                data.wallpapers.forEach(img => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    
                    // Check if this is a close match
                    const isCloseMatch = Math.abs(img.imageWidth - width) < 200 && Math.abs(img.imageHeight - height) < 200;
                    
                    card.innerHTML = `
                        <img src="${img.webformatURL}" alt="${img.tags}" loading="lazy" onclick="window.open('${img.webformatURL}', '_blank')" />
                        <p>
                            <span class="resolution-badge">📐 ${img.imageWidth} × ${img.imageHeight}</span>
                            ${isCloseMatch ? '<span class="match-badge">⭐ Perfect Match</span>' : ''}
                            <br />❤️ ${img.likes} | 👁️ ${img.views} | ⬇️ ${img.downloads || 0}
                        </p>
                        <a href="${img.webformatURL}" download target="_blank" class="download-btn">⬇️ Download Wallpaper</a>
                    `;
                    resultsContainer.appendChild(card);
                });

            } catch (error) {
                statusMsg.innerHTML = '❌ Cannot connect to server. Please try again.';
                statusMsg.className = 'status error';
                console.error('Search error:', error);
            }
        }

        // Allow pressing "Enter" in the search box
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });

        // Auto-search on page load with a default term (optional)
        // window.onload = function() {
        //     document.getElementById('searchInput').value = 'nature';
        //     performSearch();
        // };
    </script>
</body>
</html>