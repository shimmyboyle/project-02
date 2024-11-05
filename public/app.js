//Initialize and connect socket
let socket = io();
let images = []; // Array to store all loaded images
let imageCount = 0; // Will be set by server
let isDragging = false; // Track if we're currently dragging
let currentImageIndex = null; // Store the current image index while dragging
let currentScale = 1; // Store current scale while dragging
let drawnImages = []; // Store all drawn images and their positions

// Load sound fx
let soundFX_wav = [];
let soundFX_mp3 = [];
let soundNumber; 
let whichSound = 1;
let soundCount1 = 23;
let soundCount2 = 17;

// Button animation variables
let buttonX = 100;
let buttonY = 100;
let buttonSpeedX = 3;
let buttonSpeedY = 2;
let button;
let buttonVisible = false;
let buttonInitialDelay = 30000; // 30 seconds in milliseconds
let buttonReappearTimeout = null;

let sound;
let music = document.getElementById("music");
let firstTime = true;

let chaosMode = false;
let chaosModeTimeout;
let chaosImage; // Will store our special image
//const CHAOS_DURATION = 10000; // 10 seconds in milliseconds

let enya = document.getElementById("enya");
let isChaosModeActive = false;

let peacefulImages = []; // Array to store peaceful images
let peacefulImageCount = 0;
let currentPeacefulImage = null; // Store current chaos mode image


let mainCanvas;

let loadingScreen;
let imagesLoaded = 0;
let totalImagesToLoad = 0;
let musicStarted = false;

let angle = 0;
const rainbow = [
    [255, 0, 0],      // Red
    [255, 165, 0],    // Orange
    //[255, 255, 0],    // Yellow
    [0, 255, 0],      // Green
    [0, 0, 255],      // Blue
    [238, 130, 238]   // Violet
];


//Listen for confirmation of connection
socket.on('connect', () => {
    console.log("Connected");
    socket.emit('request-music-state');
});

// Listen for image count from server
socket.on('image-counts', (counts) => {
    console.log(`Loading ${counts.regular} regular images and ${counts.peaceful} peaceful images...`);
    imageCount = counts.regular;
    peacefulImageCount = counts.peaceful;
    totalImagesToLoad = counts.regular + counts.peaceful;
    loadImages();
    loadFX();
    loadPeacefulImages();
});

socket.on('sync-music', (data) => {
    if (data.isPlaying && !musicStarted) {
        const currentTime = Date.now();
        const timeSinceStart = (currentTime - data.startTime) / 1000; // Convert to seconds
        
        music.currentTime = timeSinceStart % music.duration; // Handle if time is longer than song duration
        music.play();
        musicStarted = true;
    }
});

socket.on('music-stopped', () => {
    music.pause();
    music.currentTime = 0;
    musicStarted = false;
});

function loadImages() {
    // Load all images into the array
    for (let i = 1; i <= imageCount; i++) {
        images.push(loadImage(`images/${i}.png`, 
            () => {
                console.log(`Loaded image ${i}`);
                imagesLoaded++;
                checkAllImagesLoaded();
            },
            () => {
                console.error(`Failed to load image ${i}`);
                imagesLoaded++;
                checkAllImagesLoaded();
            }
        ));
    }
}

function loadFX() {
    // Load all images into the array
    for (let i = 1; i <= soundCount1; i++) {
        soundFX_wav.push(new Audio(`sound_fx_wav/${i}.wav`));
    }
    for (let i = 1; i <= soundCount2; i++) {
        soundFX_mp3.push(new Audio(`sound_fx_mp3/${i}.mp3`));
    }
}

function loadPeacefulImages() {
    // Load all peaceful images into the array
    for (let i = 1; i <= peacefulImageCount; i++) {
        peacefulImages.push(loadImage(`peaceful/${i}.jpg`, 
            () => {
                console.log(`Loaded peaceful image ${i}`);
                imagesLoaded++;
                checkAllImagesLoaded();
            },
            () => {
                console.error(`Failed to load peaceful image ${i}`);
                imagesLoaded++;
                checkAllImagesLoaded();
            }
        ));
    }
}


function checkAllImagesLoaded() {
    console.log(`Loaded ${imagesLoaded} out of ${totalImagesToLoad + 1} images`); // +1 for chaos image
    if (imagesLoaded >= totalImagesToLoad) {
        console.log('All images loaded, hiding loading screen');
        // All images are loaded, hide the loading screen
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 2000); // Keep loading screen visible for at least 2 seconds
    }
}

function setup() {

    loadingScreen = document.getElementById('loading-screen');
    
    // Create canvas to fill the window
    mainCanvas = createCanvas(windowWidth, windowHeight);
    mainCanvas.id('drawing-canvas');
    imageMode(CENTER);
    drawGridBackground();

    chaosImage = loadImage('chaos-image.jpg', () => {
        console.log('✅ Chaos image loaded successfully');
        checkAllImagesLoaded();
    }, () => {
        console.log('❌ Failed to load chaos image');
        checkAllImagesLoaded();
    });

    // Get button reference and initially hide it
    button = document.getElementById('bouncing-button');
    button.style.display = 'none';

    // Set timeout for initial button appearance
    setTimeout(() => {
        socket.emit('show-button'); // Emit to all clients
    }, buttonInitialDelay);

    // Keep your existing socket listeners intact
    socket.on('message-share', (data) => {
        displayImage(data);
        drawnImages.push(data);
        if (data.isDragging && data.socketId === socket.id) {
            currentImageIndex = data.imageIndex;
            currentScale = data.scale;
        }
    });

    // Setup for bouncing button - preserve your existing click handler
    button = document.getElementById('bouncing-button');
    sound = document.getElementById('weird-sound');

    button.addEventListener('click', () => {
        socket.emit('hide-button'); // Emit to all clients
        socket.emit('chaos-button-pressed');
    });

    socket.on('button-visibility', (data) => {
        buttonVisible = data.visible;
        button.style.display = data.visible ? 'block' : 'none';
        if (data.visible) {
            buttonX = 100; // Reset position
            buttonY = 100;
            animateButton();
        }
    });

    document.getElementById('drawing-canvas').style.display = 'block';
}

socket.on('chaos-image-selected', (data) => {
    console.log('Received chaos image data:', data);
    
    // Play airhorn sound
    sound.currentTime = 0;
    sound.play();
    
    music.pause();
    music.currentTime = 0;
    socket.emit('stop-music');
    
    // Start playing Enya
    enya.currentTime = 0;
    enya.play();
    
    // Clear the canvas
    clearCanvas();
    
    // Update current peaceful image and start chaos mode
    currentPeacefulImage = peacefulImages[data.imageIndex];
    chaosMode = true;
    isChaosModeActive = true;
    
    // Start the chaos animation
    animateChaos();
    
    // Clear any existing timeout
    if (chaosModeTimeout) {
        clearTimeout(chaosModeTimeout);
    }
    
    // Set new timeout for chaos mode end
    chaosModeTimeout = setTimeout(() => {
        socket.emit('chaos-mode-ended');
        
        chaosMode = false;
        isChaosModeActive = false;
        currentPeacefulImage = null;
        drawGridBackground();
        
        // Stop Enya
        enya.pause();
        enya.currentTime = 0;
        
        // Play airhorn sound
        sound.currentTime = 0;
        sound.play();

        // Set timeout for button reappearance
        if (buttonReappearTimeout) {
            clearTimeout(buttonReappearTimeout);
        }
        buttonReappearTimeout = setTimeout(() => {
            socket.emit('show-button'); // This will show button for all clients
        }, buttonInitialDelay);
        
    }, data.duration);
});

socket.on('start-chaos-audio', () => {
    // Play airhorn
    sound.currentTime = 0;
    sound.play();
    
    // Stop dogs music
    music.pause();
    music.currentTime = 0;
    
    // Start Enya
    enya.currentTime = 0;
    enya.play();
});

socket.on('end-chaos-audio', () => {
    // Play airhorn
    sound.currentTime = 0;
    sound.play();
    
    // Stop Enya
    enya.pause();
    enya.currentTime = 0;
    
    // Resume dogs music
    music.currentTime = 0;
    music.play();
});


function draw() {
    if (!chaosMode) {
        push();
        textAlign(CENTER, CENTER);
        textFont('Impact');
        textSize(100);
        
        // Update sparkle rotation
        angle += 0.05;
        
        // Draw sparkles
        drawSparkle(width/2 - 250, height/2 - 20);
        drawSparkle(width/2 + 250, height/2 - 20);
        drawSparkle(width/2, height/2 - 80);
        
        // Draw shadow
        fill(0);
        noStroke();
        text('PARTY TIME!', width/2 + 4, height/2 + 4);
        
        // Draw white outline
        fill(255);
        stroke(255);
        strokeWeight(8);
        text('PARTY TIME!', width/2, height/2);
        
        // Draw rainbow fill
        let rainbowIndex = Math.floor(frameCount/20) % rainbow.length;
        let col = rainbow[rainbowIndex];
        fill(col);
        strokeWeight(2);
        text('PARTY TIME!', width/2, height/2);
        
        // Add extra sparkles
        drawSparkle(width/2 - 180, height/2 + 40);
        drawSparkle(width/2 + 180, height/2 + 40);
        
        // Update button color
        updateButtonColor();
        
        pop();
    }
}


// Function to draw a sparkle
function drawSparkle(x, y) {
    push();
    translate(x, y);
   // rotate(angle);
    fill(255, 200, 100);  // Yellow sparkle
    stroke(255);        // White edge
    strokeWeight(1);
    beginShape();
    for (let i = 0; i < 8; i++) {
        let r = (i % 2 === 0) ? 15 : 6;
        let theta = i * PI / 4;
        vertex(r * cos(theta), r * sin(theta));
    }
    endShape(CLOSE);
    pop();
}


function clearCanvas() {
    // Clear the stored images array
    drawnImages = [];
    
    // Redraw the background grid
    drawGridBackground();
}




function animateChaos() {
    if (!chaosMode || !currentPeacefulImage) return;
    
    // Generate random position
    const x = random(width);
    const y = random(height);
    
    // Calculate aspect ratio of the original image
    const aspectRatio = currentPeacefulImage.width / currentPeacefulImage.height;
    
    // Generate random base size between 20 and 200 pixels for height
    const baseSize = random(90, 350);
    
    // Calculate width based on aspect ratio
    const scaledHeight = baseSize;
    const scaledWidth = baseSize * aspectRatio;
    
    // Draw the current peaceful image
    push();
    imageMode(CENTER);
    image(currentPeacefulImage, x, y, scaledWidth, scaledHeight);
    pop();
    
    // Schedule next frame if still in chaos mode
    if (chaosMode) {
        setTimeout(() => {
            requestAnimationFrame(animateChaos);
        }, 50); // Adjust this value to control image spawn rate
    }
}


function animateButton() {
    if (!buttonVisible) return;
    
    // Get button dimensions
    const buttonRect = button.getBoundingClientRect();
    const buttonWidth = buttonRect.width;
    const buttonHeight = buttonRect.height;
    
    // Update position
    buttonX += buttonSpeedX;
    buttonY += buttonSpeedY;
    
    // Bounce off edges
    if (buttonX + buttonWidth > window.innerWidth) {
        buttonX = window.innerWidth - buttonWidth;
        buttonSpeedX *= -1;
    } else if (buttonX < 0) {
        buttonX = 0;
        buttonSpeedX *= -1;
    }
    
    if (buttonY + buttonHeight > window.innerHeight) {
        buttonY = window.innerHeight - buttonHeight;
        buttonSpeedY *= -1;
    } else if (buttonY < 0) {
        buttonY = 0;
        buttonSpeedY *= -1;
    }
    
    // Update button position
    button.style.left = buttonX + 'px';
    button.style.top = buttonY + 'px';
    
    // Continue animation only if button is still visible
    if (buttonVisible) {
        requestAnimationFrame(animateButton);
    }
}

function drawGridBackground() {
    // Fill with white first
    background(255);
    
    // Set drawing properties for grid
    strokeWeight(1);
    
    // Constants for grid layout
    const lineSpacing = 25;
    const marginOffset = 75; // Adjusted to be a multiple of lineSpacing (3 * 25)
    
    // Draw horizontal blue lines
    stroke(230, 230, 255); // Light blue color
    for (let y = 0; y < height; y += lineSpacing) {
        line(0, y, width, y);
    }
    
    // Draw vertical blue lines
    for (let x = 0; x < width; x += lineSpacing) {
        line(x, 0, x, height);
    }
    
    // Draw magenta margin lines
    stroke(255, 105, 180); // Magenta color
    strokeWeight(2);
    
    // Vertical magenta line - aligned with grid
    const marginX = Math.round(marginOffset / lineSpacing) * lineSpacing;
    line(marginX, 0, marginX, height);
    
    // Horizontal magenta line - same margin from top
    line(0, marginX, width, marginX);
}

// Generate random scale between 0.75 and 1.25 (±25%)
function getRandomScale() {
    return 0.25 + Math.random() * 0.25; // Range from 0.75 to 1.25
}

// Handle window resize
function windowResized() {
    // Your existing resize code here...
    
    // Make sure button stays in bounds after resize
    const buttonRect = button.getBoundingClientRect();
    if (buttonX + buttonRect.width > window.innerWidth) {
        buttonX = window.innerWidth - buttonRect.width;
    }
    if (buttonY + buttonRect.height > window.innerHeight) {
        buttonY = window.innerHeight - buttonRect.height;
    }
}


function mousePressed() {
    if (!socket.connected) return;

    if (!musicStarted) {
        socket.emit('start-music');
        musicStarted = true;
    }

    // Only play dogs music if it's first time AND not in chaos mode
    if (firstTime && !chaosMode) {
        music.play();
        firstTime = false;
    }
    
    if (chaosMode) {
        // During chaos mode, use chaos image with random scale
        const scale = random(0.5, 2);
        
        let mouseData = {
            x: mouseX,
            y: mouseY,
            isDragging: true,
            socketId: socket.id,
            scale: scale,
            isChaosMouse: true
        };
        
        socket.emit('request-image', mouseData);
    } 

    else {
        // Normal mode
        isDragging = true;
        currentScale = getRandomScale();
        
        let mouseData = {
            x: mouseX,
            y: mouseY,
            isDragging: true,
            socketId: socket.id,
            scale: currentScale
        };

        whichSound = Math.floor(random(1, 2));
        if (whichSound == 1){
            soundNumber = Math.floor(random(0, soundCount1));
            soundFX_wav[soundNumber].play();
        }
        else if (whichSound = 2){
            soundNumber = Math.floor(random(0, soundCount2));
            soundFX_mp3[soundNumber].play();
        }

        socket.emit('request-image', mouseData);
    }
}

function mouseDragged() {
    if (!socket.connected) return;
    
    if (chaosMode) {
        // During chaos mode, continue using chaos image
        let mouseData = {
            x: mouseX,
            y: mouseY,
            isDragging: true,
            socketId: socket.id,
            useCurrentImage: true,
            scale: currentScale,
            isChaosMouse: true  // Add flag to indicate chaos mode click
        };
        
        socket.emit('request-image', mouseData);
    } else {
        // Normal mode - your existing mouseDragged code
        if (!isDragging || images.length === 0) return;

        let mouseData = {
            x: mouseX,
            y: mouseY,
            isDragging: true,
            socketId: socket.id,
            useCurrentImage: true,
            scale: currentScale
        };

        socket.emit('request-image', mouseData);
    }
}

function mouseReleased() {
    isDragging = false;
    currentImageIndex = null;
    currentScale = 1;
}

// Modify displayImage to ensure images are drawn on top of the grid
function displayImage(obj) {
    if (obj.isChaosMouse) {
        // Draw current peaceful image during chaos mode
        if (!currentPeacefulImage) return;
        
        push();
        // Calculate aspect ratio
        const aspectRatio = currentPeacefulImage.width / currentPeacefulImage.height;
        
        // Use the scale to determine height, then calculate width
        const scaledHeight = 100 * obj.scale; // Using 100 as a base size, adjust as needed
        const scaledWidth = scaledHeight * aspectRatio;
        
        image(currentPeacefulImage, obj.x, obj.y, scaledWidth, scaledHeight);
        pop();
    } else {
        // Your existing displayImage code for normal mode
        if (images.length === 0) return;
        
        let img = images[obj.imageIndex];
        let scale = obj.scale || 1;
        
        push();
        let scaledWidth = img.width * scale;
        let scaledHeight = img.height * scale;
        image(img, obj.x, obj.y, scaledWidth, scaledHeight);
        pop();
    }
}

function updateButtonColor() {
    const button = document.getElementById('bouncing-button');
    let rainbowIndex = Math.floor(frameCount/20) % rainbow.length;
    let col = rainbow[rainbowIndex];
    button.style.backgroundColor = `rgb(${col[0]}, ${col[1]}, ${col[2]})`;
    button.style.borderColor = `rgb(${col[0]}, ${col[1]}, ${col[2]})`;
    
    // Make text white for visibility
    button.style.color = 'white';
}


// Optional: Add some basic CSS to ensure the canvas fills the window properly
document.head.insertAdjacentHTML('beforeend', `
    <style>
        body, html {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #drawing-canvas {
            display: block;
        }

        #bouncing-button {
            transition: background-color 0.5s ease;
        }
    </style>
`);


// Create arrays for random name generation
const adjectives = [
    'Aggressive', 'Anti-Social', 'Weirdy', 'Punk Rock', 'Froo Froo', 
    'Maniacal', 'Bummer', 'Buzzkill', 'Angry', 'Passive-Aggressive', 
    'Strange', 'Kleptomaniac', 'Raver', 'Jazzy', 'Soup-Loving',
    'Frantic', 'Insomniac', 'Paranoid', 'Delusions-Of-Grandeur', 'Dazzling',
    'Cosmic', 'Rainbow', 'Quirky', 'Mean Girl', 'Micro-Aggression'
];

const nouns = [
    'Penguin', 'Unicorn', 'Narwhal', 'Cupcake', 'Dinosaur',
    'Dragon', 'Kitten', 'Raccoon', 'Panda', 'Jellyfish',
    'Dolphin', 'Waffle', 'Cloud', 'Potato', 'Noodle',
    'Marshmallow', 'Bunny', 'Pickle', 'Llama', 'Donut',
    'Octopus', 'Mochi', 'Boba', 'Hamster', 'Dumpling'
];

const cursorColors = [
    '#FF1493', '#4169E1', '#32CD32', '#9932CC', '#FF4500',
    '#20B2AA', '#FF69B4', '#4B0082', '#00FF7F', '#FF8C00',
    '#8A2BE2', '#00CED1', '#FF1493', '#6495ED', '#7B68EE'
];

const userProperties = new Map();

const cursorContainer = document.createElement('div');
cursorContainer.id = 'cursor-container';
cursorContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
`;
document.body.appendChild(cursorContainer);

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateUserName() {
    return `${getRandomElement(adjectives)} ${getRandomElement(nouns)}`;
}

function generateUserProperties() {
    return {
        name: generateUserName(),
        color: getRandomElement(cursorColors)
    };
}

// Generate and share our properties
const myProperties = generateUserProperties();
socket.emit('user-joined', myProperties);
userProperties.set(socket.id, myProperties);

function createCursor(socketId) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.id = `cursor-${socketId}`;
    
    const userProps = userProperties.get(socketId);
    if (!userProps) {
        console.log('No properties found for user:', socketId);
        return cursor;
    }
    
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.style.backgroundColor = userProps.color;
    
    const label = document.createElement('span');
    label.className = 'cursor-label';
    label.textContent = userProps.name;
    label.style.backgroundColor = userProps.color;
    
    cursor.appendChild(dot);
    cursor.appendChild(label);
    cursorContainer.appendChild(cursor);
    
    return cursor;
}

function updateCursor(socketId, x, y) {
    let cursor = document.getElementById(`cursor-${socketId}`);
    if (!cursor) {
        cursor = createCursor(socketId);
    }
    cursor.style.transform = `translate(${x}px, ${y}px)`;
}

function removeCursor(socketId) {
    const cursor = document.getElementById(`cursor-${socketId}`);
    if (cursor) {
        cursor.remove();
        userProperties.delete(socketId);
    }
}

document.addEventListener('mousemove', (e) => {
    if (!socket.connected) return;
    
    const x = e.clientX;
    const y = e.clientY;
    
    socket.emit('cursor-move', {
        x: x,
        y: y
    });
});

socket.on('all-users', (users) => {
    console.log('Received all users:', users);
    users.forEach(([socketId, properties]) => {
        userProperties.set(socketId, properties);
    });
});

socket.on('user-properties-update', (data) => {
    console.log('User properties update:', data);
    userProperties.set(data.socketId, data.properties);
});

socket.on('cursor-update', (data) => {
    updateCursor(data.socketId, data.x, data.y);
});

socket.on('user-disconnected', (socketId) => {
    removeCursor(socketId);
});

document.head.insertAdjacentHTML('beforeend', `
    <style>
        body {
            cursor: none;
        }
        .cursor {
            position: fixed;
            pointer-events: none;
            z-index: 1000;
            transition: transform 0.1s ease;
        }
        .cursor-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        .cursor-label {
            position: absolute;
            left: 15px;
            top: -5px;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 14px;
            white-space: nowrap;
            opacity: 0.9;
        }
    </style>
`);