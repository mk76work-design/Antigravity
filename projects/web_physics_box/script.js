// Module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Events = Matter.Events,
    Body = Matter.Body;

// Global variables
let engine, render, runner;
let ground, basketBottom, basketLeft, basketRight;
let isGameClear = false;
const WIN_TIME_THRESHOLD = 3000; // 3 seconds in milliseconds

// UI Elements
const messageEl = document.getElementById('message');
const retryBtn = document.getElementById('retry-btn');
const nextStageBtn = document.getElementById('next-stage-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const statsDisplay = document.getElementById('stats-display');
const goalDisplay = document.getElementById('goal-display');
const windLayer = document.getElementById('wind-layer');

let isGameStarted = false;
let currentStage = 1;
const TOTAL_STAGES = 4;
const WIND_FORCE = { x: 0.002, y: 0 }; // Continuous wind force

// Stats tracking
let gameStartTime = 0;
let totalBlocks = 0;

function init() {
    // Create an engine
    engine = Engine.create();

    // Create a renderer
    render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            wireframes: false,
            background: '#222'
        }
    });

    // Create static bodies (Ground and Basket)
    createStaticBodies();

    // Add mouse control
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: {
                visible: false
            }
        }
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    // Run the renderer
    Render.run(render);

    // Create runner
    runner = Runner.create();
    Runner.run(runner, engine);

    // Event Listeners
    Events.on(engine, 'beforeUpdate', (event) => {
        updateBasketPosition(event);
        if (isGameStarted) {
            checkWinCondition(event);
            updateStats();

            if (currentStage === 4) {
                applyWindForce();
            }
        }
    });

    // Spawn box on click
    render.canvas.addEventListener('mousedown', (event) => {
        if (!isGameStarted || isGameClear) return;

        // Don't spawn if clicking on UI (handled by checking target, but canvas captures events)
        const size = 50;
        let box;

        if (currentStage === 3) {
            // Stage 3: All Circles & Bouncy
            const restitution = 0.8; // Bouncy

            // Light Circle
            box = Bodies.circle(event.clientX, -size, size / 2, {
                render: { fillStyle: getRandomColor() },
                restitution: restitution,
                density: 0.0005 // Light
            });
        } else if (currentStage === 4) {
            // Stage 4: Stormy Triangles
            // Mostly Triangles, Rare Squares
            const isTriangle = Math.random() > 0.15; // 85% Triangle
            const restitution = 0.5; // Less bouncy than S3

            if (isTriangle) {
                // Triangle
                // Polygon with 3 sides
                box = Bodies.polygon(event.clientX, -size, 3, size / 1.5, {
                    render: { fillStyle: getRandomColor() },
                    restitution: restitution,
                    frictionAir: 0.05, // Higher air friction to catch wind? Actually mass matters more for F=ma
                    // We will apply force manually. But high air friction slows it down.
                    // Let's keep normal frictionAir but maybe slightly higher friction for basket grip
                    friction: 0.5
                });
                // Note: Polygon is pointing up by default? 
                // We can rotate it randomly
                Matter.Body.rotate(box, Math.random() * Math.PI);
            } else {
                // Heavy Square
                box = Bodies.rectangle(event.clientX, -size, size, size, {
                    render: { fillStyle: getRandomColor() },
                    restitution: restitution,
                    friction: 0.5,
                    density: 0.002
                });
            }
        } else {
            // Normal spawning for S1 & S2
            box = Bodies.rectangle(event.clientX, -size, size, size, {
                render: { fillStyle: getRandomColor() }
            });
        }

        Composite.add(engine.world, box);
        totalBlocks++;
        updateStats();
    });

    // Handle window resize
    window.addEventListener('resize', handleResize);
}

function startGame() {
    isGameStarted = true;
    startScreen.style.display = 'none';
    gameStartTime = Date.now();
    totalBlocks = 0;
    updateStats();
    updateGoalDisplay();
    updateWindVisuals();
}

function updateStats() {
    if (!isGameStarted || isGameClear) return;
    const currentTime = Date.now();
    const time = ((currentTime - gameStartTime) / 1000).toFixed(2);
    statsDisplay.innerHTML = `Time: ${time}s<br>Blocks: ${totalBlocks}`;
}

function updateGoalDisplay() {
    let goalText = "";
    if (currentStage === 3 || currentStage === 4) {
        goalText = "Goal: 3 Boxes (3s)";
    } else {
        goalText = "Goal: 1 Box (3s)";
    }
    goalDisplay.innerText = `Stage ${currentStage}/${TOTAL_STAGES}\n${goalText}`;
}

function createStaticBodies() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Ground
    ground = Bodies.rectangle(width / 2, height, width, 60, {
        isStatic: true,
        render: { fillStyle: '#444' }
    });

    // Basket (U-shape) centered
    const basketX = width / 2;
    const basketY = height - 100; // Position above ground
    const basketW = 200;
    const basketH = 150;
    const wallThick = 20;

    basketBottom = Bodies.rectangle(basketX, basketY + basketH / 2, basketW, wallThick, {
        isStatic: true,
        render: { fillStyle: '#888' }
    });
    basketLeft = Bodies.rectangle(basketX - basketW / 2 + wallThick / 2, basketY, wallThick, basketH, {
        isStatic: true,
        render: { fillStyle: '#888' }
    });
    basketRight = Bodies.rectangle(basketX + basketW / 2 - wallThick / 2, basketY, wallThick, basketH, {
        isStatic: true,
        render: { fillStyle: '#888' }
    });

    Composite.add(engine.world, [ground, basketBottom, basketLeft, basketRight]);

    Composite.add(engine.world, [ground, basketBottom, basketLeft, basketRight]);

    if (currentStage === 2) {
        // ... (Stage 2 slope logic remains)
        const slope = Bodies.rectangle(width / 2, height / 2, 400, 20, {
            isStatic: true,
            angle: Math.PI / 6,
            render: { fillStyle: '#aaa' }
        });
        Composite.add(engine.world, slope);
    } else if (currentStage === 3) {
        // Stage 3: Pins (Pachinko)
        const pinSize = 10;
        const startX = width / 2 - 150;
        const startY = 200;
        const rows = 4;
        const cols = 5;
        const gapX = 80;
        const gapY = 80;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Offset every other row
                const xOffset = (row % 2 === 0) ? 0 : gapX / 2;
                const x = startX + col * gapX + xOffset;
                const y = startY + row * gapY;

                const pin = Bodies.circle(x, y, pinSize, {
                    isStatic: true,
                    render: { fillStyle: '#aaa' },
                    restitution: 0.8 // Bouncy pins
                });
                Composite.add(engine.world, pin);
            }
        }
    }
}

function applyWindForce() {
    const bodies = Composite.allBodies(engine.world);
    for (let body of bodies) {
        if (!body.isStatic) {
            // Apply wind to all dynamic bodies
            // F = ma. Heavier bodies accelerate less with same force.
            // Triangles (if lighter or larger area) might be affected differently.
            // For simplicity, constant force.

            // If we want triangles to be affected MORE, we could check body.circleRadius or shape
            // But let's just stick to constant force for now, mass difference will handle the rest.

            // To make triangles 'rotate' or feel chaotic, maybe apply force slightly offset from center?
            // Body.applyForce(body, position, force)

            Body.applyForce(body, body.position, {
                x: WIND_FORCE.x * body.mass, // Applying proportional to mass makes acceleration equal (if F ~ mass)
                // Wait, wind should push LIGHT objects more relative to their mass?
                // a = F/m. If F is constant, Light object (small m) has huge a.
                // So constant Force is what we want for "Wind pushing".
                y: WIND_FORCE.y * body.mass
            });
            // Matter.js Body.applyForce adds to force (accumulates). 
            // Actually, scaling by mass (F = k * m) means a = k. Gravity is like this (a = g).
            // Wind is a Surface force. F ~ Area.
            // Since we are 2D, Area ~ Mass (if density constant).
            // So F ~ Mass means acceleration is constant.
            // If we want LIGHTER objects to fly away, we should apply CONSTANT force (or based on size), NOT mass.

            // Let's try applying a constant force scaled roughly by 'size' but NOT density.
            // Or simply a fixed value.
            Matter.Body.applyForce(body, body.position, { x: 0.001, y: 0 });
        }
    }
}

function updateWindVisuals() {
    windLayer.innerHTML = '';
    if (currentStage === 4) {
        windLayer.style.display = 'block';
        // Create wind lines
        for (let i = 0; i < 20; i++) {
            const line = document.createElement('div');
            line.className = 'wind-line';
            line.style.width = Math.random() * 100 + 50 + 'px';
            line.style.top = Math.random() * 100 + '%';
            line.style.opacity = Math.random() * 0.5 + 0.1;
            line.style.animationDuration = Math.random() * 1 + 0.5 + 's';
            line.style.animationDelay = Math.random() * 2 + 's';
            windLayer.appendChild(line);
        }
    } else {
        windLayer.style.display = 'none';
    }
}

let winZoneStartTimestamp = 0; // Track when box entered zone (wall clock)

function checkWinCondition(event) {
    if (isGameClear) return;

    // Define win zone (inside the basket)
    const basketPos = basketBottom.position;
    // Approximated zone
    const zoneXMin = basketPos.x - 80;
    const zoneXMax = basketPos.x + 80;
    const zoneYMin = basketPos.y - 100;
    const zoneYMax = basketPos.y; // Bottom of basket

    const bodies = Composite.allBodies(engine.world);
    let boxCountInZone = 0;

    // Stage 3 requires 3 blocks, others require 1
    const requiredBlockCount = (currentStage === 3) ? 3 : 1;

    // Check if any DYNAMIC body is in the zone
    for (let body of bodies) {
        if (!body.isStatic) {
            if (body.position.x > zoneXMin && body.position.x < zoneXMax &&
                body.position.y > zoneYMin && body.position.y < zoneYMax) {
                boxCountInZone++;
            }
        }
    }

    if (boxCountInZone >= requiredBlockCount) {
        if (winZoneStartTimestamp === 0) {
            winZoneStartTimestamp = Date.now();
        }

        // Check elapsed time
        if (Date.now() - winZoneStartTimestamp > WIN_TIME_THRESHOLD) {
            gameClear();
        }
    } else {
        winZoneStartTimestamp = 0; // Reset if box leaves zone
    }
}

function gameClear() {
    isGameClear = true;

    if (currentStage < TOTAL_STAGES) {
        messageEl.innerText = "Game Clear!";
        messageEl.style.display = 'block';
        nextStageBtn.style.display = 'block';
        retryBtn.style.display = 'none'; // Hide retry during stage clear if moving to next
    } else {
        // Final Clear
        const endTime = Date.now();
        const totalTime = ((endTime - gameStartTime) / 1000).toFixed(2);
        messageEl.innerHTML = `Game Clear!<br><span style="font-size: 1.5rem">Time: ${totalTime}s<br>Blocks: ${totalBlocks}</span>`;
        messageEl.style.display = 'block';
        retryBtn.style.display = 'block';
    }

    console.log("Game Clear!");
}

function nextStage() {
    currentStage++;
    resetGame();
    updateGoalDisplay();
    updateWindVisuals();
}

function resetGame() {
    isGameClear = false;
    winZoneStartTimestamp = 0;
    messageEl.style.display = 'none';
    statsDisplay.innerHTML = `Time: 0.00s<br>Blocks: 0`;
    /* goalDisplay is updated via updateGoalDisplay() call in nextStage/startGame, 
       but if we just hit retry, we might want to ensure it's set. 
       Usually stage doesn't change on retry, so it stays. */
    if (isGameStarted) updateGoalDisplay();

    // Remove all non-static bodies (boxes)
    const bodies = Composite.allBodies(engine.world);
    const bodiesToRemove = bodies.filter(body => !body.isStatic && body.label !== 'Mouse Constraint'); // MouseConstraint doesn't usually appear in allBodies like this but good to be safe
    Composite.remove(engine.world, bodiesToRemove);

    // For full reset (including stage change), we should re-create static bodies if they change per stage
    // But currently createStaticBodies is only called in init.
    // Let's modify this to reload the stage.

    Composite.clear(engine.world);
    Engine.clear(engine); // Clear engine state if needed

    // Re-add necessary components
    // We lost mouseConstraint and ground/basket.
    // Easier to just re-call createStaticBodies and re-add mouse constraint if we cleared everything.

    createStaticBodies();
    Composite.add(engine.world, render.mouse ? // MouseConstraint needs to be re-added or kept
        MouseConstraint.create(engine, { mouse: render.mouse, constraint: { stiffness: 0.2, render: { visible: false } } })
        : null);

    nextStageBtn.style.display = 'none';
    retryBtn.style.display = 'block';
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function handleResize() {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;

    // Simplistic repositioning - better to just reload or properly recalculate positions
    // For this prototype, we'll just move the static bodies
    Matter.Body.setPosition(ground, { x: window.innerWidth / 2, y: window.innerHeight });

    // Recalculate basket pos
    const basketX = window.innerWidth / 2;
    const basketY = window.innerHeight - 100;
    const basketH = 150;

    Matter.Body.setPosition(basketBottom, { x: basketX, y: basketY + basketH / 2 });
    Matter.Body.setPosition(basketLeft, { x: basketX - 100 + 10, y: basketY });
    Matter.Body.setPosition(basketRight, { x: basketX + 100 - 10, y: basketY });
}

function updateBasketPosition(event) {
    if (isGameClear) return;

    const time = event.timestamp;
    const range = 150; // Oscillation range in pixels
    const speed = 0.002; // Oscillation speed

    // Calculate new X based on sine wave
    // We base it on the center of the screen
    const centerX = window.innerWidth / 2;
    const offsetX = Math.sin(time * speed) * range;
    const newX = centerX + offsetX;

    const basketH = 150;
    const basketY = window.innerHeight - 100;

    // Update positions of all basket parts
    // Note: We need to maintain relative positions
    // basketBottom is at center
    // basketLeft is at center - 90
    // basketRight is at center + 90

    Matter.Body.setPosition(basketBottom, { x: newX, y: basketY + basketH / 2 });
    Matter.Body.setPosition(basketLeft, { x: newX - 90, y: basketY });
    Matter.Body.setPosition(basketRight, { x: newX + 90, y: basketY });
}

// Initial Setup
init();

// Retry Button Action
// Retry Button Action
retryBtn.addEventListener('click', resetGame);
startBtn.addEventListener('click', startGame);
nextStageBtn.addEventListener('click', nextStage);
