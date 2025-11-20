
class InputSystem {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }

    getAxis() {
        const axis = { x: 0, y: 0 };
        if (this.keys['ArrowUp'] || this.keys['w']) axis.y -= 1;
        if (this.keys['ArrowDown'] || this.keys['s']) axis.y += 1;
        if (this.keys['ArrowLeft'] || this.keys['a']) axis.x -= 1;
        if (this.keys['ArrowRight'] || this.keys['d']) axis.x += 1;

        // Normalize
        if (axis.x !== 0 && axis.y !== 0) {
            const length = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
            axis.x /= length;
            axis.y /= length;
        }

        return axis;
    }
}

class Physics {
    static checkCollision(circle, rect) {
        // Circle (Player/Projectile) vs Rect (Enemy)
        // In 3D, we still use the 2D logic for gameplay balance
        const closestX = Math.max(rect.x - rect.width / 2, Math.min(circle.x, rect.x + rect.width / 2));
        const closestY = Math.max(rect.y - rect.height / 2, Math.min(circle.y, rect.y + rect.height / 2));

        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;

        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        return distanceSquared < (circle.radius * circle.radius);
    }

    static checkCircleCollision(c1, c2) {
        const dx = c1.x - c2.x;
        const dy = c1.y - c2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < c1.radius + c2.radius;
    }
}

const SKILLS = [
    {
        id: 'multishot',
        name: '멀티샷',
        description: '화살을 한 발 더 발사합니다.',
        apply: (player) => {
            player.projectileCount = (player.projectileCount || 1) + 1;
        }
    },
    {
        id: 'attack_boost',
        name: '공격력 증가',
        description: '공격력이 상승합니다.',
        apply: (player) => {
            player.damage = Math.floor(player.damage * 1.25);
        }
    },
    {
        id: 'speed_boost',
        name: '공격 속도 증가',
        description: '공격 속도가 빨라집니다.',
        apply: (player) => {
            player.attackSpeed *= 0.75; // Lower is faster
        }
    },
    {
        id: 'ricochet',
        name: '도탄',
        description: '화살이 근처 적에게 튕깁니다.',
        apply: (player) => {
            player.hasRicochet = true;
        }
    },
    {
        id: 'hp_boost',
        name: '최대 체력 증가',
        description: '최대 체력이 50 증가하고 회복합니다.',
        apply: (player) => {
            player.maxHp += 50;
            player.hp += 50;
        }
    },
    {
        id: 'hp_heal',
        name: 'HP 회복',
        description: '체력을 50 회복합니다.',
        apply: (player) => {
            player.hp = Math.min(player.hp + 50, player.maxHp);
        }
    }
];

class SkillSystem {
    static getRandomSkills(count = 3) {
        const shuffled = [...SKILLS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}

// --- Entities ---

class Projectile {
    constructor(x, y, targetX, targetY, isPlayerProjectile = true, scene) {
        this.x = x;
        this.y = y;
        this.speed = 400;
        this.radius = 5;
        this.isPlayerProjectile = isPlayerProjectile;
        this.damage = 10;
        this.markedForDeletion = false;
        this.scene = scene;

        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;

        // 3D Mesh
        const geometry = new THREE.SphereGeometry(3, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: isPlayerProjectile ? 0xf1c40f : 0xe74c3c
        });
        this.mesh = new THREE.Mesh(geometry, material);

        // Map 2D (x, y) to 3D (x, 0, z)
        // Game Width 480 -> -240 to 240
        // Game Height 800 -> -400 to 400
        this.mesh.position.set(this.x - 240, 0, this.y - 400);
        this.scene.add(this.mesh);
    }

    update(deltaTime, gameWidth, gameHeight) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Update 3D position
        this.mesh.position.set(this.x - 240, 0, this.y - 400);

        // Check if out of bounds (extended range so projectiles can travel far)
        const margin = 500; // Extra margin beyond game bounds
        if (this.x < -margin || this.x > gameWidth + margin ||
            this.y < -margin || this.y > gameHeight + margin) {
            this.markedForDeletion = true;
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }

    // Cleanup when deleted by collision
    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }

    draw(ctx) {
        // No 2D drawing needed
    }
}

class Enemy {
    constructor(x, y, scene) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 80;
        this.hp = 30;
        this.maxHp = 30;
        this.markedForDeletion = false;
        this.scene = scene;

        // 3D Mesh (UFO)
        this.mesh = new THREE.Group();

        // Dome
        const domeGeo = new THREE.SphereGeometry(10, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshPhongMaterial({ color: 0x74b9ff, shininess: 100, transparent: true, opacity: 0.8 });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.rotation.x = -Math.PI / 2;
        dome.position.y = 2;
        this.mesh.add(dome);

        // Saucer
        const saucerGeo = new THREE.CylinderGeometry(5, 15, 5, 16);
        const saucerMat = new THREE.MeshPhongMaterial({ color: 0x636e72 });
        const saucer = new THREE.Mesh(saucerGeo, saucerMat);
        this.mesh.add(saucer);

        // Lights (Small spheres)
        for (let i = 0; i < 5; i++) {
            const lightGeo = new THREE.SphereGeometry(2, 8, 8);
            const lightMat = new THREE.MeshBasicMaterial({ color: 0xff7675 });
            const light = new THREE.Mesh(lightGeo, lightMat);
            const angle = (i / 5) * Math.PI * 2;
            light.position.set(Math.cos(angle) * 12, 0, Math.sin(angle) * 12);
            this.mesh.add(light);
        }

        // Health Bar (3D Sprite)
        const barGeo = new THREE.PlaneGeometry(30, 5);
        const barMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.hpBar = new THREE.Mesh(barGeo, barMat);
        this.hpBar.position.set(0, 20, 0);
        this.hpBar.rotation.x = -Math.PI / 4;
        this.mesh.add(this.hpBar);

        this.mesh.position.set(this.x - 240, 0, this.y - 400);
        this.scene.add(this.mesh);
    }

    update(deltaTime, player) {
        // Simple Chaser AI
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed * deltaTime;
            this.y += (dy / distance) * this.speed * deltaTime;
        }

        // Update 3D position
        this.mesh.position.set(this.x - 240, 0, this.y - 400);

        // Rotate UFO
        this.mesh.rotation.y += 2 * deltaTime;

        // Update HP Bar scale
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        this.hpBar.scale.x = hpPercent;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.markedForDeletion = true;
            this.destroy();
        }
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }

    draw(ctx) {
        // No 2D draw
    }
}

class Player {
    constructor(x, y, startOffScreen = false, gameHeight = 800, scene) {
        this.targetY = y;
        this.x = x;
        this.scene = scene;

        if (startOffScreen) {
            this.y = gameHeight + 100;
            this.isEntering = true;
        } else {
            this.y = y;
            this.isEntering = false;
        }

        this.radius = 15;
        this.speed = 200;
        this.isMoving = false;

        // Combat stats
        this.maxHp = 500;
        this.hp = 500;
        this.attackSpeed = 0.5;
        this.attackTimer = 0;
        this.damage = 10;
        this.projectileCount = 1;
        this.hasRicochet = false;

        this.invincibilityTimer = 0;

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;

        // 3D Mesh (Spaceship)
        this.mesh = new THREE.Group();

        // Body
        const bodyGeo = new THREE.ConeGeometry(8, 30, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xecf0f1, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = -Math.PI / 2;
        this.mesh.add(body);

        // Wings
        const wingGeo = new THREE.BoxGeometry(30, 2, 10);
        const wingMat = new THREE.MeshPhongMaterial({ color: 0x3498db });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.z = 5;
        this.mesh.add(wings);

        // Engine Glow
        const engineGeo = new THREE.ConeGeometry(4, 10, 8);
        const engineMat = new THREE.MeshBasicMaterial({ color: 0xe67e22 });
        this.engine = new THREE.Mesh(engineGeo, engineMat);
        this.engine.rotation.x = Math.PI / 2;
        this.engine.position.z = 15;
        this.mesh.add(this.engine);

        // Cockpit
        const cockpitGeo = new THREE.SphereGeometry(4, 8, 8);
        const cockpitMat = new THREE.MeshPhongMaterial({ color: 0x3498db });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 3, -5);
        this.mesh.add(cockpit);

        this.mesh.position.set(this.x - 240, 0, this.y - 400);
        this.scene.add(this.mesh);
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level++;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        if (this.invincibilityTimer > 0) return;

        this.hp -= amount;
        this.invincibilityTimer = 1.0;
    }

    update(deltaTime, input, gameWidth, gameHeight, nearestEnemy, createProjectileCallback) {
        // Entrance Animation
        if (this.isEntering) {
            const entranceSpeed = 300;
            this.y -= entranceSpeed * deltaTime;
            this.isMoving = true;

            if (this.y <= this.targetY) {
                this.y = this.targetY;
                this.isEntering = false;
                this.isMoving = false;
            }
            this.updateMesh();
            return;
        }

        // Update invincibility timer
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= deltaTime;
        }

        const axis = input.getAxis();

        if (axis.x !== 0 || axis.y !== 0) {
            this.isMoving = true;
            this.x += axis.x * this.speed * deltaTime;
            this.y += axis.y * this.speed * deltaTime;

            // Boundary checks
            this.x = Math.max(this.radius, Math.min(gameWidth - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(gameHeight - this.radius, this.y));

            // Bank effect (Roll)
            this.mesh.rotation.z = -axis.x * 0.5;
        } else {
            this.isMoving = false;
            // Reset bank
            this.mesh.rotation.z *= 0.9;
        }

        this.updateMesh();

        // Attack Logic
        this.attackTimer -= deltaTime;
        if (this.attackTimer <= 0 && nearestEnemy) {
            this.shoot(nearestEnemy, createProjectileCallback);
            this.attackTimer = this.attackSpeed;
        }
    }

    updateMesh() {
        this.mesh.position.set(this.x - 240, 0, this.y - 400);

        // Blink if invincible
        if (this.invincibilityTimer > 0) {
            this.mesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
            this.mesh.visible = true;
        }

        // Engine flicker
        this.engine.scale.setScalar(0.8 + Math.random() * 0.4);
    }

    shoot(target, createProjectileCallback) {
        const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);

        for (let i = 0; i < this.projectileCount; i++) {
            let angleOffset = 0;
            if (this.projectileCount > 1) {
                const spread = 0.2;
                angleOffset = (i - (this.projectileCount - 1) / 2) * spread;
            }

            const finalAngle = baseAngle + angleOffset;
            const tx = this.x + Math.cos(finalAngle) * 100;
            const ty = this.y + Math.sin(finalAngle) * 100;

            createProjectileCallback(this.x, this.y, tx, ty, true, this.damage);
        }
    }

    draw(ctx) {
        // No 2D draw
    }

    destroy() {
        if (this.mesh) this.scene.remove(this.mesh);
    }
}

// --- Game Loop ---

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 480;
        this.height = 800;

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050510, 0.001);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 2000);
        this.camera.position.set(0, 800, 400);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0x050510, 1);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 100);
        this.scene.add(dirLight);

        // Starfield
        this.initStars();

        this.lastTime = 0;
        this.input = new InputSystem();

        this.player = new Player(this.width / 2, this.height - 150, true, this.height, this.scene);

        this.enemies = [];
        this.projectiles = [];

        this.isPaused = false;
        this.isGameOver = false;

        // UI Elements
        this.xpBar = document.getElementById('xp-bar');
        this.levelDisplay = document.getElementById('level-display');
        this.skillOverlay = document.getElementById('skill-selection-overlay');
        this.skillCardsContainer = document.getElementById('skill-cards');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.restartBtn = document.getElementById('restart-btn');

        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => this.restart());
        }

        this.wave = 1;
        this.spawnEnemies(3);
    }

    initStars() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 1000; i++) {
            vertices.push(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 400,
                (Math.random() - 0.5) * 2000
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
        this.starField = new THREE.Points(geometry, material);
        this.scene.add(this.starField);
    }

    spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (this.width - 60) + 30;
            const y = Math.random() * (this.height / 3) + 30;
            this.enemies.push(new Enemy(x, y, this.scene));
        }
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    restart() {
        if (this.player) this.player.destroy();
        this.enemies.forEach(e => e.destroy());
        this.projectiles.forEach(p => p.destroy());

        this.player = new Player(this.width / 2, this.height - 150, true, this.height, this.scene);
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

        // Update Health Bar and Text
        const healthBar = document.getElementById('health-bar');
        const healthText = document.getElementById('health-text');
        if (healthBar && healthText) {
            const hpPercent = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
            healthBar.style.width = `${hpPercent}%`;
            healthText.textContent = `${Math.ceil(this.player.hp)}/${this.player.maxHp}`;
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
        // Animate Starfield
        this.starField.position.z += 100 * deltaTime;
        if (this.starField.position.z > 500) {
            this.starField.position.z = -500;
        }

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
            const proj = new Projectile(x, y, tx, ty, isPlayer, this.scene);
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
                        proj.destroy();

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
        this.renderer.render(this.scene, this.camera);
    }
}

// --- Initialization ---

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.start();
});
