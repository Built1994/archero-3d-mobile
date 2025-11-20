export class Player {
    constructor(x, y, startOffScreen = false, gameHeight = 800) {
        this.targetY = y;
        this.x = x;

        if (startOffScreen) {
            this.y = gameHeight + 100; // Start below screen
            this.isEntering = true;
        } else {
            this.y = y;
            this.isEntering = false;
        }

        this.radius = 15;
        this.speed = 200; // pixels per second
        this.color = '#3498db';
        this.isMoving = false;

        // Combat stats
        this.maxHp = 500;
        this.hp = 500;
        this.attackSpeed = 0.5; // Seconds between shots
        this.attackTimer = 0;
        this.damage = 10;
        this.projectileCount = 1;
        this.hasRicochet = false;

        this.invincibilityTimer = 0; // New: Invincibility timer

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level++;
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
            return true; // Leveled up
        }
        return false;
    }

    takeDamage(amount) {
        if (this.invincibilityTimer > 0) return; // Ignore damage if invincible

        this.hp -= amount;
        this.invincibilityTimer = 1.0; // Set 1 second invincibility
    }

    update(deltaTime, input, gameWidth, gameHeight, nearestEnemy, createProjectileCallback) {
        // Entrance Animation
        if (this.isEntering) {
            const entranceSpeed = 300;
            this.y -= entranceSpeed * deltaTime;
            this.isMoving = true; // Show engine flame

            if (this.y <= this.targetY) {
                this.y = this.targetY;
                this.isEntering = false;
                this.isMoving = false;
            }
            return; // Skip input and shooting while entering
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
        } else {
            this.isMoving = false;
        }

        // Attack Logic
        this.attackTimer -= deltaTime;
        if (this.attackTimer <= 0 && nearestEnemy) {
            this.shoot(nearestEnemy, createProjectileCallback);
            this.attackTimer = this.attackSpeed;
        }
    }
}
