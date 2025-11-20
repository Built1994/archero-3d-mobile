export class Projectile {
    constructor(x, y, targetX, targetY, isPlayerProjectile = true) {
        this.x = x;
        this.y = y;
        this.speed = 400;
        this.radius = 5;
        this.isPlayerProjectile = isPlayerProjectile;
        this.damage = 10;
        this.markedForDeletion = false;

        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
    }

    update(deltaTime, gameWidth, gameHeight) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Check if out of bounds
        if (this.x < 0 || this.x > gameWidth || this.y < 0 || this.y > gameHeight) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isPlayerProjectile ? '#f1c40f' : '#e74c3c';
        ctx.fill();
        ctx.closePath();
    }
}
