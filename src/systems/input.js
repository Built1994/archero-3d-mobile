export class InputSystem {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false
        };

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
    }

    getAxis() {
        let x = 0;
        let y = 0;

        if (this.keys.ArrowLeft || this.keys.a) x -= 1;
        if (this.keys.ArrowRight || this.keys.d) x += 1;
        if (this.keys.ArrowUp || this.keys.w) y -= 1;
        if (this.keys.ArrowDown || this.keys.s) y += 1;

        // Normalize vector if moving diagonally
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }

        return { x, y };
    }
}
