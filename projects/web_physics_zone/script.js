// Module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    Events = Matter.Events,
    Body = Matter.Body,
    Vector = Matter.Vector;

// Global variables
let engine, render, runner;
let ground, basketBottom, basketLeft, basketRight;
let isGameStarted = false;
let isGameClear = false;
let isGameOver = false;

// Game State
let currentStage = 1;
const TOTAL_STAGES = 10;
const WIN_TIME_THRESHOLD = 3000;
let stageTimer = 60;
let stageTimerInterval;
let winZoneStartTimestamp = 0;

// Slingshot State
let isDragging = false;
let dragStartPos = null;
let currentMousePos = null;
let isAimingValid = false;

// UI Elements
const messageEl = document.getElementById('message');
const retryBtn = document.getElementById('retry-btn');
const nextStageBtn = document.getElementById('next-stage-btn');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const timerDisplay = document.getElementById('timer-display');
const stageDisplay = document.getElementById('stage-display');
const goalInfo = document.getElementById('goal-info');

// Init
function init() {
    engine = Engine.create();
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

    // Mouse Setup (No Constraint for manipulation now)
    const mouse = Mouse.create(render.canvas);
    render.mouse = mouse;

    // Custom Rendering
    Events.on(render, 'afterRender', (event) => {
        const ctx = render.context;
        drawZone(ctx);
        drawSlingshot(ctx);
    });

    // Game Loop
    Events.on(engine, 'beforeUpdate', (event) => {
        if (isGameStarted && !isGameClear && !isGameOver) {
            checkWinCondition();
            updateStageMechanics(event.timestamp);
        }
    });

    // Input Handling (Slingshot)
    render.canvas.addEventListener('mousedown', (event) => {
        if (!isGameStarted || isGameClear || isGameOver) return;
        const pos = { x: event.clientX, y: event.clientY };

        if (isPointInZone(pos)) {
            isDragging = true;
            dragStartPos = pos;
            currentMousePos = pos;
            isAimingValid = true;
        }
    });

    render.canvas.addEventListener('mousemove', (event) => {
        if (isDragging) {
            currentMousePos = { x: event.clientX, y: event.clientY };
            // Real-time valid check
            isAimingValid = isPointInZone(currentMousePos);
        }
    });

    render.canvas.addEventListener('mouseup', (event) => {
        if (isDragging) {
            if (isAimingValid) {
                fireBox();
            }
            isDragging = false;
            dragStartPos = null;
            currentMousePos = null;
        }
    });

    // Resize Handler
    window.addEventListener('resize', () => {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        if (isGameStarted) resetGame();
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);
}

// =======================
// Game Logic
// =======================

function startGame() {
    isGameStarted = true;
    startScreen.style.display = 'none';
    resetGame();
}

function resetGame() {
    isGameClear = false;
    isGameOver = false;
    isDragging = false;
    winZoneStartTimestamp = 0;

    clearInterval(stageTimerInterval);
    stageTimer = getStageTimeLimit(currentStage);
    updateTimerDisplay();
    stageTimerInterval = setInterval(() => {
        if (isGameStarted && !isGameClear && !isGameOver) {
            stageTimer--;
            updateTimerDisplay();
            if (stageTimer <= 0) gameOver();
        }
    }, 1000);

    messageEl.style.display = 'none';
    nextStageBtn.style.display = 'none';
    retryBtn.style.display = 'block';
    stageDisplay.innerText = `Stage: ${currentStage}`;
    goalInfo.innerText = getGoalText();

    Composite.clear(engine.world);
    Engine.clear(engine);

    createStage(currentStage);
}

function getGoalText() {
    return "Goal: Keep box in target for 3s";
}

function getStageTimeLimit(stage) {
    if (stage >= 6) return 45; // Faster for harder stages
    return 60;
}

function updateTimerDisplay() {
    timerDisplay.innerText = `Time: ${stageTimer}s`;
    timerDisplay.style.color = (stageTimer <= 10) ? '#ff4444' : '#fff';
}

function gameOver() {
    isGameOver = true;
    clearInterval(stageTimerInterval);
    messageEl.innerHTML = "Time Up!<br><span style='font-size:2rem'>Try Again</span>";
    messageEl.style.color = "#ff4444";
    messageEl.style.display = 'block';
}

function gameClear() {
    isGameClear = true;
    clearInterval(stageTimerInterval);
    messageEl.innerHTML = "Stage Clear!";
    messageEl.style.color = "#ffd700";
    messageEl.style.display = 'block';

    if (currentStage < TOTAL_STAGES) {
        nextStageBtn.style.display = 'block';
        retryBtn.style.display = 'none';
    } else {
        messageEl.innerHTML = "ALL STAGES CLEARED!<br><span style='font-size:2rem'>You are a Physics Master!</span>";
        retryBtn.style.display = 'block';
    }
}

function nextStage() {
    currentStage++;
    resetGame();
}

// =======================
// Slingshot Mechanics
// =======================

function drawSlingshot(ctx) {
    if (!isDragging || !dragStartPos || !currentMousePos) return;

    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    if (isAimingValid) {
        ctx.strokeStyle = '#ffd700'; // Good
        ctx.fillStyle = '#ffd700';
    } else {
        ctx.strokeStyle = '#ff4444'; // Bad (out of zone)
        ctx.fillStyle = '#ff4444';
        ctx.globalAlpha = 0.5;
    }

    // Draw Line
    ctx.beginPath();
    ctx.moveTo(dragStartPos.x, dragStartPos.y);
    ctx.lineTo(currentMousePos.x, currentMousePos.y);
    ctx.stroke();

    // Draw Arrow Head (at dragStartPos, pointing away from mouse)
    // Actually, usually you drag BACK and it shoots FORWARD.
    // Let's implement Angry Birds style: Dragging BACK creates a vector FORWARD.
    // Visual: Line from Mouse -> StartPos. Arrow at StartPos pointing away from Mouse.

    // Vector Mouse -> Start
    const dx = dragStartPos.x - currentMousePos.x;
    const dy = dragStartPos.y - currentMousePos.y;
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx * dx + dy * dy);
    const maxLen = 200; // Cap visual length

    // Draw Aim Line (Projected trajectory direction)
    if (isAimingValid) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.moveTo(dragStartPos.x, dragStartPos.y);
        ctx.lineTo(dragStartPos.x + dx * 2, dragStartPos.y + dy * 2); // Roughly predict
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw Start Point
    ctx.beginPath();
    ctx.arc(dragStartPos.x, dragStartPos.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
}

function fireBox() {
    if (!dragStartPos || !currentMousePos) return;

    const forceMulti = 0.002;
    // Vector: Mouse -> Start (Pull back to shoot forward)
    const dx = dragStartPos.x - currentMousePos.x;
    const dy = dragStartPos.y - currentMousePos.y;

    // Limit max force
    const len = Math.sqrt(dx * dx + dy * dy);
    const maxLen = 300;
    let finalDx = dx;
    let finalDy = dy;

    if (len > maxLen) {
        finalDx = (dx / len) * maxLen;
        finalDy = (dy / len) * maxLen;
    }

    const startX = dragStartPos.x;
    const startY = dragStartPos.y;
    const size = 40;

    // Random shape
    const rnd = Math.random();
    let box;
    const color = getRandomColor();

    if (rnd < 0.3) {
        box = Bodies.circle(startX, startY, size / 2, { render: { fillStyle: color }, restitution: 0.6 });
    } else if (rnd < 0.6) {
        box = Bodies.rectangle(startX, startY, size, size, { render: { fillStyle: color }, restitution: 0.6 });
    } else {
        box = Bodies.polygon(startX, startY, 3, size / 1.5, { render: { fillStyle: color }, restitution: 0.6 });
    }

    Body.setDensity(box, 0.002); // Standardize density
    Composite.add(engine.world, box);

    // Apply Force
    Body.applyForce(box, box.position, {
        x: finalDx * forceMulti,
        y: finalDy * forceMulti
    });
}

// =======================
// Stage Definitions
// =======================

function createStage(stageId) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Default Ground
    ground = Bodies.rectangle(w / 2, h + 50, w, 100, { isStatic: true, render: { fillStyle: '#444' } });
    Composite.add(engine.world, ground);

    // Common basket vars
    let bx = w / 2, by = h - 100;

    switch (stageId) {
        case 1: // Drop Zone
            // Simple basket at bottom center
            createBasket(w / 2, h - 100);
            messageEl.style.display = 'block';
            messageEl.innerHTML = "<span style='font-size:1.5rem; color: #fff'>Drag & Release to Throw!</span>";
            setTimeout(() => { if (!isGameClear) messageEl.style.display = 'none'; }, 3000);
            break;

        case 2: // Gap Shot
            // Basket right, Wall middle
            bx = w * 0.8;
            createBasket(bx, h - 100);
            // Wall
            Composite.add(engine.world, Bodies.rectangle(w / 2, h / 2, 20, h, {
                isStatic: true,
                render: { fillStyle: '#666' }
            }));
            break;

        case 3: // Moving Target
            // Basket handled in updateStageMechanics
            createBasket(w / 2, h - 100);
            break;

        case 4: // Tiny Window
            // Small gap to shoot through
            createBasket(w / 2, h - 100);
            // Ceiling/Floor barrier with hole
            Composite.add(engine.world, [
                Bodies.rectangle(w / 4, h / 2, w / 2, 20, { isStatic: true, render: { fillStyle: '#666' } }), // Left plate
                Bodies.rectangle(w * 0.75 + 50, h / 2, w / 2, 20, { isStatic: true, render: { fillStyle: '#666' } })  // Right plate
            ]);
            break;

        case 5: // Bouncy Walls
            // Goal shielded, must bounce off side
            bx = w / 2; by = h - 50;
            createBasket(bx, by);
            // Roof over basket
            Composite.add(engine.world, Bodies.rectangle(bx, by - 200, 300, 20, { isStatic: true, render: { fillStyle: '#666' } }));
            // Side bounce walls (Angled)
            Composite.add(engine.world, Bodies.rectangle(100, h / 2, 20, 400, {
                isStatic: true,
                angle: 0.2,
                render: { fillStyle: '#88a' },
                restitution: 1.2
            }));
            Composite.add(engine.world, Bodies.rectangle(w - 100, h / 2, 20, 400, {
                isStatic: true,
                angle: -0.2,
                render: { fillStyle: '#88a' },
                restitution: 1.2
            }));
            break;

        case 6: // Risk: High Risk (Close to Lava) vs Low Risk (Far/Small)
            // Goal is fixed. Spawning zones differ in risk?
            // Let's make ONE goal, but two spawning zones.
            // Zone A: Far away, safe. Zone B: Close, but right above lava.

            // Goal
            createBasket(w - 150, h - 100);

            // Lava Floor
            const lava = Bodies.rectangle(w / 2, h - 10, w, 20, {
                isStatic: true,
                isSensor: true,
                label: 'lava',
                render: { fillStyle: '#ff4444' }
            });
            Composite.add(engine.world, lava);

            // Obstacle between safe zone and goal
            Composite.add(engine.world, Bodies.rectangle(w / 2, h / 2, 20, 400, { isStatic: true, render: { fillStyle: '#666' } }));
            break;

        case 7: // Wind Tunnel
            // Goal at far right
            createBasket(w - 100, h / 2);
            // Wind Zone visual (logic in update)
            // Wind blows UPWARDS in the middle gap
            Composite.add(engine.world, [
                Bodies.rectangle(w / 2 - 100, h / 2, 20, h, { isStatic: true }),
                Bodies.rectangle(w / 2 + 100, h / 2, 20, h, { isStatic: true })
            ]);
            break;

        case 8: // The Pendulum
            createBasket(w / 2, h - 100);
            // Large Pendulum in the center blocking the path
            const pivot = { x: w / 2, y: 100 };
            const ball = Bodies.circle(w / 2, 300, 60, { density: 0.04, frictionAir: 0.005 });
            const constraint = Matter.Constraint.create({
                pointA: pivot,
                bodyB: ball,
                render: { visible: true }
            });
            Composite.add(engine.world, [ball, constraint]);
            // Give it a push
            Body.setVelocity(ball, { x: 15, y: 0 });
            break;

        case 9: // Moving Platforms
            // Goal on a moving platform (handled in update)
            // We create the basket parts as usual, update logic moves them
            bx = w / 2; by = h / 2;
            createBasket(bx, by);
            // Moving blocker
            const blocker = Bodies.rectangle(w / 2, h / 2 - 200, 200, 20, {
                isStatic: true,
                label: 'moving_blocker',
                render: { fillStyle: '#d66' }
            });
            Composite.add(engine.world, blocker);
            break;

        case 10: // Needle Eye
            // Goal surrounded by static bodies, small opening
            bx = w / 2; by = h / 2;
            createBasket(bx, by);
            // Enclosure
            Composite.add(engine.world, [
                Bodies.rectangle(bx - 150, by - 100, 20, 300, { isStatic: true }), // Left
                Bodies.rectangle(bx + 150, by - 100, 20, 300, { isStatic: true }), // Right
                Bodies.rectangle(bx, by - 250, 320, 20, { isStatic: true }), // Top
            ]);
            // Rotating Fan/Spinner at the entrance
            const spinner = Bodies.rectangle(bx, by - 400, 300, 20, { isStatic: true, angle: 0 });
            Composite.add(engine.world, spinner);
            // Animate angle in update
            break;
    }
}

function updateStageMechanics(time) {
    if (currentStage === 3) {
        // Move Basket
        const speed = 0.003;
        const range = 250;
        const cx = window.innerWidth / 2;
        const nx = cx + Math.sin(time * speed) * range;

        Body.setPosition(basketBottom, { x: nx, y: basketBottom.position.y });
        Body.setPosition(basketLeft, { x: nx - 90, y: basketLeft.position.y });
        Body.setPosition(basketRight, { x: nx + 90, y: basketRight.position.y });
    }
    else if (currentStage === 7) {
        // Wind Tunnel (Upward force in middle)
        const bodies = Composite.allBodies(engine.world);
        bodies.forEach(b => {
            if (!b.isStatic && b.position.x > window.innerWidth / 2 - 100 && b.position.x < window.innerWidth / 2 + 100) {
                Body.applyForce(b, b.position, { x: 0, y: -0.001 * b.mass }); // Strong updraft
            }
        });
    }
    else if (currentStage === 9) {
        // Moving Platform
        const bodies = Composite.allBodies(engine.world);
        const blocker = bodies.find(b => b.label === 'moving_blocker');
        if (blocker) {
            const range = 200;
            const speed = 0.002;
            const cx = window.innerWidth / 2;
            const nx = cx + Math.sin(time * speed) * range;
            Body.setPosition(blocker, { x: nx, y: blocker.position.y });
        }
    }
    else if (currentStage === 10) {
        // Spinner
        const bodies = Composite.allBodies(engine.world);
        // Find the spinner (it's the last added static non-sensor usually, or we can just iterate)
        // We didn't label it, let's just find the one at specific Y or label it next time.
        // Actually, let's just rotate ALL static bodies that are not ground/basket?
        // Better: Label it in creation or just find it by position.
        // It was spawned at w/2, h/2 - 400.
        const spinner = bodies.find(b => Math.abs(b.position.y - (window.innerHeight / 2 - 400)) < 10 && b.isStatic);
        if (spinner) {
            Body.setAngle(spinner, spinner.angle + 0.05);
        }
    }

    // Check Lava for Stage 6+
    if (currentStage >= 6) {
        const bodies = Composite.allBodies(engine.world);
        const lava = bodies.find(b => b.label === 'lava');
        if (lava) { // Only if lava exists
            bodies.forEach(b => {
                if (!b.isStatic && Matter.Collision.collides(b, lava) !== null) {
                    Composite.remove(engine.world, b); // Burn!
                    // Visual effect?
                }
            });
        }
    }
}

function isPointInZone(pos) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    switch (currentStage) {
        case 1: return pos.y < h / 2; // Top Half
        case 2: return pos.x < w / 2; // Left Half
        case 3: // Center Circle
            const d1 = (pos.x - w / 2) ** 2 + (pos.y - h / 2) ** 2;
            return d1 < 300 ** 2;
        case 4: // Tiny Window (Top Center Box)
            return pos.x > w / 2 - 50 && pos.x < w / 2 + 50 && pos.y < 200;
        case 5: // Top Left Corner
            return pos.x < 300 && pos.y < 300;
        case 6: // A: Close but small (Top Right), B: Far (Top Left)
            // Left Zone (Safe)
            if (pos.x < 300 && pos.y < h / 2) return true;
            // Right Zone (Risky/Hard)
            if (pos.x > w - 200 && pos.y < 300) return true;
            return false;
        case 7: // Left Strip
            return pos.x < 200;
        case 8: // Top Strip
            return pos.y < 150;
        case 9: // Corners
            return (pos.x < 200 && pos.y < 200) || (pos.x > w - 200 && pos.y < 200);
        case 10: // Tiny Spot in Top Left
            return pos.x < 100 && pos.y < 100;
        default: return true;
    }
}

function drawZone(ctx) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#00ff00';

    ctx.beginPath();
    switch (currentStage) {
        case 1: ctx.rect(0, 0, w, h / 2); break;
        case 2: ctx.rect(0, 0, w / 2, h); break;
        case 3: ctx.arc(w / 2, h / 2, 300, 0, 2 * Math.PI); break;
        case 4: ctx.rect(w / 2 - 50, 0, 100, 200); break;
        case 5: ctx.rect(0, 0, 300, 300); break;
        case 6:
            ctx.rect(0, 0, 300, h / 2);
            ctx.rect(w - 200, 0, 200, 300);
            break;
        case 7: ctx.rect(0, 0, 200, h); break;
        case 8: ctx.rect(0, 0, w, 150); break;
        case 9:
            ctx.rect(0, 0, 200, 200);
            ctx.rect(w - 200, 0, 200, 200);
            break;
        case 10: ctx.rect(0, 0, 100, 100); break;
    }
    ctx.fill();
    ctx.restore();
}

function createBasket(x, y) {
    const w = 200;
    const h = 150;
    const thick = 20;
    basketBottom = Bodies.rectangle(x, y + h / 2, w, thick, { isStatic: true, render: { fillStyle: '#888' } });
    basketLeft = Bodies.rectangle(x - w / 2 + thick / 2, y, thick, h, { isStatic: true, render: { fillStyle: '#888' } });
    basketRight = Bodies.rectangle(x + w / 2 - thick / 2, y, thick, h, { isStatic: true, render: { fillStyle: '#888' } });
    Composite.add(engine.world, [basketBottom, basketLeft, basketRight]);
}

function getRandomColor() {
    return `hsl(${Math.random() * 360}, 70%, 50%)`;
}

function checkWinCondition() {
    if (!basketBottom) return;
    const basketPos = basketBottom.position;
    const zone = {
        minX: basketPos.x - 80, maxX: basketPos.x + 80,
        minY: basketPos.y - 120, maxY: basketPos.y
    };

    const bodies = Composite.allBodies(engine.world);
    let count = 0;

    for (let b of bodies) {
        if (!b.isStatic && b.label !== 'lava') {
            if (b.position.x > zone.minX && b.position.x < zone.maxX &&
                b.position.y > zone.minY && b.position.y < zone.maxY) {
                count++;
            }
        }
    }

    if (count >= 1) {
        if (winZoneStartTimestamp === 0) winZoneStartTimestamp = Date.now();
        if (Date.now() - winZoneStartTimestamp > WIN_TIME_THRESHOLD) {
            gameClear();
        }
    } else {
        winZoneStartTimestamp = 0;
    }
}

// Event Listeners
retryBtn.addEventListener('click', resetGame);
startBtn.addEventListener('click', startGame);
nextStageBtn.addEventListener('click', nextStage);

// Init
init();
