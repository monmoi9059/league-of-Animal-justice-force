import { players, gameState } from './state.js';

export function updateUI() {
    // Show P1 stats or summary
    let p1 = players && players[0];
    if (!p1) return;

    let hearts = "❤".repeat(Math.max(0, p1.health));
    // Append other players hearts?
    if (players.length > 1) {
        hearts += " | ";
        for(let i=1; i<players.length; i++) {
            hearts += "P" + (i+1) + ":" + "❤".repeat(Math.max(0, players[i].health)) + " ";
        }
    }

    document.getElementById('healthDisplay').innerText = hearts;
    document.getElementById('scoreDisplay').innerText = gameState.score;
    document.getElementById('rescueDisplay').innerText = gameState.rescues;
    document.getElementById('livesDisplay').innerText = gameState.lives;
    document.getElementById('levelDisplay').innerText = gameState.currentLevel;

    let charName = p1.charData ? p1.charData.name : "UNKNOWN";
    if (players.length > 1) charName += " + TEAM";

    document.getElementById('charName').innerText = charName;
    if(p1.charData) document.getElementById('charName').style.color = p1.charData.cSkin;
}
