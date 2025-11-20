import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    // Set canvas resolution to match CSS size (or higher for retina)
    canvas.width = 480;
    canvas.height = 800;

    const game = new Game(canvas);
    game.start();
});
