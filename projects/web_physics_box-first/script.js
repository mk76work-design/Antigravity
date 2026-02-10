// Module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

// Create an engine
const engine = Engine.create();

// Create a renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#222'
    }
});

// Create ground
const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, 60, {
    isStatic: true,
    render: {
        fillStyle: '#444'
    }
});

// Add all of the bodies to the world
Composite.add(engine.world, ground);

// Run the renderer
Render.run(render);

// Create runner
const runner = Runner.create();

// Run the engine
Runner.run(runner, engine);

// Function to create a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

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

// Keep the mouse in sync with rendering
render.mouse = mouse;

// Handle clicks to spawn boxes
render.canvas.addEventListener('mousedown', function (event) {
    // Check if we clicked on a body (handled by MouseConstraint usually, but we want to spawn if not dragging)
    // For simplicity, just spawn a box where clicked

    // We only spawn if we are not interacting with an existing body would be better, 
    // but the requirement says "Click to generate a square box".
    // Let's spawn it at the mouse position.

    // Adjust for canvas position if needed, but here canvas is full screen
    const x = event.clientX;
    const y = event.clientY;

    const size = 50;
    const box = Bodies.rectangle(x, y, size, size, {
        render: {
            fillStyle: getRandomColor()
        }
    });

    Composite.add(engine.world, box);
});

// Handle window resize
window.addEventListener('resize', function () {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;

    // Reposition ground
    Matter.Body.setPosition(ground, {
        x: window.innerWidth / 2,
        y: window.innerHeight
    });

    // Resize ground width would require creating a new body or scaling, 
    // typically easiest to just scaling or creating new.
    // Matter.Body.scale(ground, window.innerWidth / originalWidth, 1);
    // For this simple demo, we won't perfectly handle resize for the ground to avoid complexity,
    // but we updated the canvas size.
});
