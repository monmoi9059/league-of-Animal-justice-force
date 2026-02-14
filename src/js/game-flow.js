import { gameState } from './state.js';

export function winGame() {
    gameState.running = false;
    // Calculate Stats
    // gameState.levelCompleteStats.kills is already tracked in enemies.js
    let kills = gameState.levelCompleteStats.kills;

    document.getElementById('lcKills').innerText = kills;
    document.getElementById('lcRescues').innerText = gameState.rescues;
    document.getElementById('lcTime').innerText = Math.floor((10000 - gameState.frame)/60); // Bonus

    document.getElementById('levelCompleteOverlay').style.display = 'flex';
}

export function endGame() {
    gameState.running = false;
    document.getElementById('ovTitle').innerText = "MISSION FAILED";
    document.getElementById('ovTitle').style.color = "red";
    document.getElementById('ovMsg').innerText = "Out of lives. The pound awaits.";
    document.getElementById('gameOverOverlay').style.display = 'flex';
}
