import { InputSystem } from './systems/input.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Projectile } from './entities/projectile.js';
import { Physics } from './systems/physics.js';
import { SkillSystem } from './systems/skill.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.lastTime = 0;
        this.input = new InputSystem();
        // Start off-screen, target position is near bottom
        this.player = new Player(this.width / 2, this.height - 150, true, this.height);

        this.enemies = [];
        this.projectiles = [];

        this.isPaused = false;
        this.isGameOver = false;

        // UI Elements
        this.healthBar = document.getElementById('health-bar');
        this.xpBar = document.getElementById('xp-bar');
        this.levelDisplay = document.getElementById('level-display');
        this.skillOverlay = document.getElementById('skill-selection-overlay');
        this.skillCardsContainer = document.getElementById('skill-cards');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.restartBtn = document.getElementById('restart-btn');

        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => this.restart());
        }

        this.stars = [];
        this.initStars(100);

        this.wave = 1;
        this.spawnEnemies(3);
    }

    initStars(count) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 100 + 50, // Parallax speed
                brightness: Math.random()
            });
        }
    }

    updateStars(deltaTime) {
        this.stars.forEach(star => {
            star.y += star.speed * deltaTime;
            // Reset if goes off screen
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
                star.speed = Math.random() * 100 + 50;
            }
        });
    }

    drawStars(ctx) {
        ctx.save();
        this.stars.forEach(star => {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (this.width - 60) + 30;
            const y = Math.random() * (this.height / 3) + 30; // Spawn in top third
            this.enemies.push(new Enemy(x, y));
        }
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    restart() {
        // Restart off-screen, target position is near bottom
        this.player = new Player(this.width / 2, this.height - 150, true, this.height);
        this.enemies = [];
        this.projectiles = [];
        this.wave = 1;
        this.spawnEnemies(3);
        this.isPaused = false;
        this.isGameOver = false;
        this.gameOverOverlay.classList.add('hidden');
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(timestamp) {
        if (this.isPaused || this.isGameOver) {
            this.lastTime = timestamp;
            if (!this.isGameOver && !this.isPaused) requestAnimationFrame(this.loop.bind(this));
            return;
        }

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();
        this.updateUI();

        if (!this.isPaused && !this.isGameOver) {
            requestAnimationFrame(this.loop.bind(this));
        }
    }

    updateUI() {
        if (this.xpBar && this.levelDisplay) {
            const xpPercent = (this.player.xp / this.player.xpToNextLevel) * 100;
            this.xpBar.style.width = `${xpPercent}%`;
            this.levelDisplay.textContent = `Lv. ${this.player.level}`;
        }
    }

    showSkillSelection() {
        this.isPaused = true;
        this.skillOverlay.classList.remove('hidden');
        this.skillCardsContainer.innerHTML = '';

        const skills = SkillSystem.getRandomSkills(3);
        skills.forEach(skill => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            card.innerHTML = `<h3>${skill.name}</h3><p>${skill.description}</p>`;
            card.addEventListener('click', () => {
                skill.apply(this.player);
                this.skillOverlay.classList.add('hidden');
                this.isPaused = false;
                this.lastTime = performance.now();
                requestAnimationFrame(this.loop.bind(this));
            });
            this.skillCardsContainer.appendChild(card);
        });
    }

    update(deltaTime) {
        this.updateStars(deltaTime);

        let nearestEnemy = null;
        let minDistance = Infinity;

        this.enemies.forEach(enemy => {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDistance) {
                minDistance = dist;
                nearestEnemy = enemy;
            }
        });

        this.player.update(deltaTime, this.input, this.width, this.height, nearestEnemy, (x, y, tx, ty, isPlayer, damage) => {
            const proj = new Projectile(x, y, tx, ty, isPlayer);
            if (damage) proj.damage = damage;
            this.projectiles.push(proj);
        });

        this.enemies.forEach(enemy => enemy.update(deltaTime, this.player));
        this.projectiles.forEach(proj => proj.update(deltaTime, this.width, this.height));

        this.projectiles.forEach(proj => {
            if (proj.isPlayerProjectile) {
                this.enemies.forEach(enemy => {
                    if (!proj.markedForDeletion && !enemy.markedForDeletion && Physics.checkCollision(proj, enemy)) {
                        enemy.takeDamage(proj.damage);
                        proj.markedForDeletion = true;

                        if (enemy.hp <= 0) {
                            const leveledUp = this.player.gainXp(20 + this.wave * 5);
                            if (leveledUp) {
                                this.showSkillSelection();
                            }
                        }
                    }
                });
            }
        });

        this.enemies.forEach(enemy => {
            if (Physics.checkCollision(this.player, enemy)) {
                this.player.takeDamage(10);
                if (this.player.hp <= 0) {
                    this.isGameOver = true;
                    this.gameOverOverlay.classList.remove('hidden');
                }
            }
        });

        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);

        if (this.enemies.length === 0 && !this.isPaused) {
            this.wave++;
            this.spawnEnemies(this.wave + 2);
        }
    }

    draw() {
        // Clear screen to transparent so CSS background shows
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.drawStars(this.ctx);
        this.drawGrid();

        this.enemies.forEach(e => e.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.player.draw(this.ctx);
    }
}
