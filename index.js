//Initialize the express 'app' object
let express = require("express");
let app = express();
let fs = require('fs');
let path = require('path');
let peacefulImageCount = 0;
let musicStartTime = null;
let isMusicPlaying = false;

app.use("/", express.static("public"));

//Initialize HTTP server
let http = require("http");
let server = http.createServer(app);
let port = process.env.PORT || 3000;

//Initialize socket.io
let io = require("socket.io");
io = new io.Server(server);

// Create images directory if it doesn't exist
const imageDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imageDir)) {
    try {
        fs.mkdirSync(imageDir, { recursive: true });
        console.log('Created images directory at:', imageDir);
    } catch (err) {
        console.error('Error creating images directory:', err);
    }
}

// Create peaceful image directory if it doesn't exist
const peaceImageDir = path.join(__dirname, 'public', 'peaceful');
if (!fs.existsSync(imageDir)) {
    try {
        fs.mkdirSync(imageDir, { recursive: true });
        console.log('Created peaceful images directory at:', imageDir);
    } catch (err) {
        console.error('Error creating peaceful images directory:', err);
    }
}

// Track available and used images
let imageCount = 0;
let availableImages = [];
let usedImages = new Set();
let currentDragImages = new Map();
const userProperties = new Map();
const userCursors = new Map(); // Add this to track cursor positions

// Function to reset the image pool
function resetImagePool() {
    availableImages = Array.from({ length: imageCount }, (_, i) => i);
    usedImages.clear();
    console.log('Image pool reset. All images available again.');
}

// Function to get a random unused image
function getRandomUnusedImage() {
    if (availableImages.length === 0) {
        resetImagePool();
    }
    
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const selectedImageIndex = availableImages[randomIndex];
    
    availableImages.splice(randomIndex, 1);
    usedImages.add(selectedImageIndex);
    
    return selectedImageIndex;
}


function getRandomDuration() {
    const minDuration = 10000; // 10 seconds
    const maxDuration = 30000; // 30 seconds
    return Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;
}

io.on("connection", (socket) => {
    console.log("We have a new client: " + socket.id);

    try {
        // Count regular images
        const files = fs.readdirSync(imageDir);
        imageCount = files.filter(file => file.toLowerCase().endsWith('.png')).length;
        
        // Count peaceful images
        const peacefulFiles = fs.readdirSync(peaceImageDir);
        peacefulImageCount = peacefulFiles.filter(file => 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.png')
        ).length;
        
        if (availableImages.length === 0 && usedImages.size === 0) {
            resetImagePool();
        }
        
        // Send both counts to the client
        socket.emit('image-counts', {
            regular: imageCount,
            peaceful: peacefulImageCount
        });
    } catch (err) {
        console.error('Error reading images directory:', err);
        socket.emit('image-counts', {
            regular: 0,
            peaceful: 0
        });
    }
  


    // Send existing users and their cursor positions to the new client
    socket.emit('all-users', Array.from(userProperties.entries()));
    userCursors.forEach((position, userId) => {
        socket.emit('cursor-update', {
            socketId: userId,
            ...position
        });
    });

    socket.on('user-joined', (properties) => {
        console.log('User joined with properties:', socket.id, properties);
        userProperties.set(socket.id, properties);
        io.emit('user-properties-update', {
            socketId: socket.id,
            properties: properties
        });
    });


    socket.on('request-music-state', () => {
        socket.emit('sync-music', {
            isPlaying: isMusicPlaying,
            startTime: musicStartTime
        });
    });

    // When first client starts music
    socket.on('start-music', () => {
        if (!isMusicPlaying) {
            musicStartTime = Date.now();
            isMusicPlaying = true;
            io.emit('sync-music', {
                isPlaying: true,
                startTime: musicStartTime
            });
        } else {
            socket.emit('sync-music', {
                isPlaying: true,
                startTime: musicStartTime
            });
        }
    });

    // When chaos mode starts and stops music
    socket.on('stop-music', () => {
        isMusicPlaying = false;
        musicStartTime = null;
        io.emit('music-stopped');
    });





    socket.on('hide-button', () => {
        io.emit('button-visibility', { visible: false });
    });

    socket.on('show-button', () => {
        io.emit('button-visibility', { visible: true });
    });

    socket.on('cursor-move', (data) => {
        // Store the cursor position
        userCursors.set(socket.id, { x: data.x, y: data.y });
        
        // Broadcast cursor position to all clients
        io.emit('cursor-update', {
            socketId: socket.id,
            x: data.x,
            y: data.y
        });
    });

    socket.on('request-image', (data) => {
        let imageData;
        
        if (data.isChaosMouse) {
            // During chaos mode, just pass through the data
            imageData = data;
        } else {
            // Your existing image selection logic
            let imageIndex;
            if (data.isDragging && data.useCurrentImage) {
                imageIndex = currentDragImages.get(socket.id);
            } else {
                imageIndex = getRandomUnusedImage();
                if (data.isDragging) {
                    currentDragImages.set(socket.id, imageIndex);
                }
            }
            imageData = {
                ...data,
                imageIndex: imageIndex
            };
        }
        
        io.emit('message-share', imageData);
    });

    socket.on('chaos-button-pressed', () => {
        const randomIndex = Math.floor(Math.random() * peacefulImageCount);
        const duration = getRandomDuration();
        
        console.log('Sending chaos image data:', {
            imageIndex: randomIndex,
            duration: duration
        });
        
        io.emit('chaos-image-selected', { 
            imageIndex: randomIndex,
            duration: duration
        });
    });



   

    socket.on('clear-canvas-chaos', () => {
        io.emit('canvas-cleared-chaos');
    });





    socket.on("disconnect", () => {
        console.log("A client has disconnected: " + socket.id);
        userProperties.delete(socket.id);
        userCursors.delete(socket.id);
        currentDragImages.delete(socket.id);
        io.emit('user-disconnected', socket.id);
    });




    socket.on('chaos-mode-ended', () => {
        io.emit('end-chaos-audio');
    });





});

server.listen(port, () => {
    console.log("App listening at port: " + port);
});