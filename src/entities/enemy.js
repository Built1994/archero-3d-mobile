export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 80;
        this.hp = 30;
        this.maxHp = 30;
        this.color = '#e74c3c';
        this.markedForDeletion = false;
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
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        // UFO Drawing
        ctx.save();
        ctx.translate(this.x, this.y);

        // Dome (Glass)
        ctx.beginPath();
        ctx.arc(0, -5, 10, Math.PI, 0);
        ctx.fillStyle = '#74b9ff';
        ctx.fill();
        ctx.strokeStyle = '#dfe6e9';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Body (Saucer)
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#636e72';
        ctx.fill();
        ctx.strokeStyle = '#2d3436';
        ctx.stroke();

        // Lights
        const lightCount = 5;
        for (let i = 0; i < lightCount; i++) {
            const angle = (i / lightCount) * Math.PI * 2;
            const lx = Math.cos(angle) * 15;
            const ly = Math.sin(angle) * 6;

            ctx.beginPath();
            ctx.arc(lx, ly, 2, 0, Math.PI * 2);
            ctx.fillStyle = (Date.now() % 500 < 250) ? '#ff7675' : '#fab1a0'; // Blinking effect
            ctx.fill();
        }

        ctx.restore();

        // Health bar
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 15, this.y - 25, 30, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 15, this.y - 25, 30 * hpPercent, 5);
    }
}
