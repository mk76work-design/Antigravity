/**
 * Super Mario World Style Physics Engine
 * 
 * Physics Constants & Configuration
 */
const PHYSICS = {
    gravity: 0.4,          // 重力
    accelGround: 0.15,      // 地上加速度 (Walking)
    accelRun: 0.25,        // 地上加速度 (Running)
    accelAir: 0.15,         // 空中加速度 (Air control)
    frictionGround: 0.90,  // 地上摩擦 (停止時)
    frictionAir: 0.99,     // 空中抵抗 (ほぼなし)
    skidFriction: 0.85,    // ターン時のブレーキ摩擦
    maxSpeedWalk: 3.5,     // 通常最高速度
    maxSpeedRun: 6.0,      // ダッシュ最高速度
    jumpForce: -9.5,       // ジャンプ力 (負の値で上昇)
    jumpCutoff: 0.5,      // ジャンプボタンを離した時の減衰率
    groundY: 500           // デフォルトの地面の高さ（プラットフォームがない場合）
};

/**
 * InputHandler: Manages keyboard input
 */
class InputHandler {
    constructor() {
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent scrolling with arrows and space
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.code) > -1) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            // Trigger jump release event
            if (e.code === 'Space') {
                this.onJumpRelease && this.onJumpRelease();
            }
        });
    }

    isDown(key) {
        // Map common keys
        if (key === 'left') return this.keys['ArrowLeft'] || this.keys['KeyA'];
        if (key === 'right') return this.keys['ArrowRight'] || this.keys['KeyD'];
        if (key === 'up') return this.keys['ArrowUp'] || this.keys['KeyW'];
        if (key === 'down') return this.keys['ArrowDown'] || this.keys['KeyS'];
        if (key === 'jump') return this.keys['Space'] || this.keys['KeyZ'];
        if (key === 'dash') return this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyX'];
        return false;
    }
}

/**
 * Player: The main character class with physics logic
 */
class Player {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Velocity
        this.vx = 0;
        this.vy = 0;
        
        this.grounded = false;
        this.facingRight = true;
        this.isDashing = false;
        
        // Debug state for visualization
        this.state = "idle";
    }

    update(input) {
        // 1. INPUT HANDLING & ACCELERATION
        const left = input.isDown('left');
        const right = input.isDown('right');
        const jump = input.isDown('jump');
        const dash = input.isDown('dash');

        this.isDashing = dash;
        
        // Target Max Speed based on Dash
        const currentMaxSpeed = dash ? PHYSICS.maxSpeedRun : PHYSICS.maxSpeedWalk;
        // Acceleration based on State
        let currentAccel = this.grounded ? (dash ? PHYSICS.accelRun : PHYSICS.accelGround) : PHYSICS.accelAir;

        // Apply Horizontal Force
        if (right) {
            // Turning (Skid) logic
            if (this.vx < 0 && this.grounded) {
                this.vx *= PHYSICS.skidFriction; // Apply skid friction
            }
            this.vx += currentAccel;
            this.facingRight = true;
            this.state = "walk/run";
        } 
        else if (left) {
            // Turning (Skid) logic
            if (this.vx > 0 && this.grounded) {
                this.vx *= PHYSICS.skidFriction;
            }
            this.vx -= currentAccel;
            this.facingRight = false;
            this.state = "walk/run";
        } 
        else {
            // No input - Friction
            this.vx *= (this.grounded ? PHYSICS.frictionGround : PHYSICS.frictionAir);
            this.state = "idle";
        }

        // Clamp Velocity to Max Speed
        // (Allow exceeding max speed if purely from momentum, but clamp acceleration)
        if (Math.abs(this.vx) > currentMaxSpeed) {
            // Soft clamp: if we are over speed, we just rely on friction to slow us down, 
            // but we don't snap immediately. 
            // However, we shouldn't continue accelerating past it.
            if (right && this.vx > currentMaxSpeed) this.vx = currentMaxSpeed;
            if (left && this.vx < -currentMaxSpeed) this.vx = -currentMaxSpeed;
        }

        // Snap to 0 if very slow
        if (Math.abs(this.vx) < 0.05) this.vx = 0;


        // 2. JUMPING
        // Initial Jump
        if (jump && this.grounded) {
             // Basic implementation: check if just pressed could be handled in input handler logic,
             // but here we check 'grounded' which acts as a debounce since vy will make not grounded immediately.
             // Ideally we might want a 'justPressed' check to prevent holding space to bunny hop if not desired,
             // but SMW usually allows holding to bounce on enemies, though for ground jumps you usually repess.
             // For simplicity, we'll assume the player has to release space to jump again or we check checks.
             // A simple way is a flag or just checking if vy is 0 (approx). 
             // To be robust, let's use a "jumpRequest" flag handled externally or assume continuous hold jumps for now (bunny hop).
             // Better: add a cooldown or justPressed logic.
        }
        
        // NOTE: The 'justPressed' logic is better handled by state in InputHandler or Game.
        // For this prototype, let's modify InputHandler to support 'trigger' or handle it here with a flag.
    }
    
    // Separated Jump Trigger from continuous update to handle one-time impulse
    jump() {
        if (this.grounded) {
            this.vy = PHYSICS.jumpForce;
            this.grounded = false;
            this.state = "jump";
        }
    }
    
    // Called when Space is released (Variable Jump Height)
    stopJump() {
        if (this.vy < -2) { // Moving up efficiently
            this.vy *= PHYSICS.jumpCutoff;
        }
    }

    applyPhysics() {
        // Gravity
        this.vy += PHYSICS.gravity;
        
        // Terminal velocity (optional but good for stability)
        if (this.vy > 15) this.vy = 15;

        // Apply Velocity
        this.x += this.vx;
        this.y += this.vy;
    }
    
    checkCollisions(platforms) {
        this.grounded = false;
        
        // Simple AABB vs Platforms
        for (let p of platforms) {
            // Check for overlap
            if (this.x < p.x + p.w &&
                this.x + this.width > p.x &&
                this.y < p.y + p.h &&
                this.y + this.height > p.y) {
                
                // Resolution: Find the smallest penetration
                // Calculate overlap on each axis
                const overlapX = (this.width + p.w) / 2 - Math.abs((this.x + this.width / 2) - (p.x + p.w / 2));
                const overlapY = (this.height + p.h) / 2 - Math.abs((this.y + this.height / 2) - (p.y + p.h / 2));

                if (overlapX < overlapY) {
                    // Horizontal collision
                    if (this.vx > 0) this.x = p.x - this.width;
                    else this.x = p.x + p.w;
                    this.vx = 0;
                } else {
                    // Vertical collision
                    if (this.vy > 0) { // Falling onto platform
                        this.y = p.y - this.height;
                        this.grounded = true;
                        this.vy = 0;
                    } else { // Hitting head
                        this.y = p.y + p.h;
                        this.vy = 0;
                    }
                }
            }
        }
        
        // Canvas Boundaries
        if (this.x < 0) { this.x = 0; this.vx = 0; }
        // if (this.x + this.width > 800) { this.x = 800 - this.width; this.vx = 0; } // Optional: world wrap or stop
        
        // Floor Safety (bottom of screen)
        if (this.y + this.height > 600) {
            this.y = 600 - this.height;
            this.grounded = true;
            this.vy = 0;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Draw Shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(this.x + 5, this.y + 5, this.width, this.height);

        // Draw Player Body
        ctx.fillStyle = this.isDashing ? "#ff4757" : "#ff6b81"; // Reddish for Mario-like
        if (this.state === "jump") ctx.fillStyle = "#eccc68";
        
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw Direction Indicator (Eye)
        ctx.fillStyle = "white";
        const eyeOffset = this.facingRight ? this.width - 12 : 4;
        ctx.fillRect(this.x + eyeOffset, this.y + 6, 8, 8);
        
        ctx.restore();
    }
}

/**
 * Game: Manages the loop and world
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.input = new InputHandler();
        this.player = new Player(100, 400, 32, 48); // Mario is roughly 2:3 aspect? Let's use 32x48
        
        // Connect jump release
        this.input.onJumpRelease = () => {
            this.player.stopJump();
        };

        // Track previous jump button state to prevent auto-fire
        this.wasJumpPressed = false;
        
        this.platforms = [
            { x: 0, y: 550, w: 800, h: 50 },     // Ground
            { x: 200, y: 450, w: 100, h: 20 },
            { x: 350, y: 380, w: 100, h: 20 },
            { x: 500, y: 300, w: 150, h: 20 },
            { x: 100, y: 250, w: 50, h: 20 },
        ];

        this.lastTime = 0;
        
        // Start Loop
        requestAnimationFrame(this.loop.bind(this));
    }

    update() {
        // Handle Jump Trigger (Just Pressed)
        const jumpPressed = this.input.isDown('jump');
        if (jumpPressed && !this.wasJumpPressed) {
            this.player.jump();
        }
        this.wasJumpPressed = jumpPressed;

        this.player.update(this.input);
        this.player.applyPhysics(); // Update positions before collision
        this.player.checkCollisions(this.platforms);
    }

    draw() {
        // Clear background
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw Platforms
        this.ctx.fillStyle = "#2ecc71"; // Green pipes/grass style
        this.ctx.strokeStyle = "#27ae60";
        this.ctx.lineWidth = 2;
        
        for (let p of this.platforms) {
            this.ctx.fillRect(p.x, p.y, p.w, p.h);
            this.ctx.strokeRect(p.x, p.y, p.w, p.h);
            
            // pattern detail (dots)
            this.ctx.fillStyle = "rgba(0,0,0,0.1)";
            this.ctx.fillRect(p.x + 5, p.y + 5, p.w - 10, p.h - 10);
            this.ctx.fillStyle = "#2ecc71"; // reset
        }

        // Draw Player
        this.player.draw(this.ctx);
        
        // Draw Stats / Debug
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "16px monospace";
        this.ctx.textAlign = "left";
        this.ctx.fillText(`VX: ${this.player.vx.toFixed(2)}`, 10, 20);
        this.ctx.fillText(`VY: ${this.player.vy.toFixed(2)}`, 10, 40);
        this.ctx.fillText(`Grounded: ${this.player.grounded}`, 10, 60);
        this.ctx.fillText(`Dash: ${this.player.isDashing}`, 10, 80);
    }

    loop(timestamp) {
        // Simple dt (optional implementation for robustness, currently fixed step assumption)
        // For physics stability in this prototype, we'll assume 60FPS but could add delta
        this.update();
        this.draw();
        
        requestAnimationFrame(this.loop.bind(this));
    }
}

// Init Game
window.onload = () => {
    const game = new Game();
};
