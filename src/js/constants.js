// --- CONSTANTS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const debugHUD = document.getElementById('debugHUD');
const TILE_SIZE = 40;
const GRAVITY = 0.6;
const FRICTION = 0.85;
const ACCELERATION = 0.8;
const JUMP_FORCE = -13;
const TERMINAL_VELOCITY = 15;
const LEVEL_WIDTH = 400;
const LEVEL_HEIGHT = 60;
const FPS = 60;
const INTERVAL = 1000 / FPS;

// --- ASSETS ---
const C = {
    dirtBase: "#5d4037", dirtLight: "#8d6e63", grassTop: "#4caf50",
    stoneBase: "#546e7a", stoneLight: "#78909c",
    skyTop: "#1e3c72", skyBot: "#2a5298",
    checkpoint: "#00ff41", leash: "#555", tank: "#e74c3c", ladder: "#d35400"
};

// --- ROSTER ---
const CHARACTERS = [
    { id: 'pug', name: 'IRON MUTT', type: 'dog_flat', cSkin: '#f3cf98', cDark: '#3b302a', cSuit: '#b0c4de', pType: 'laser', pColor: '#a020f0' },
    { id: 'raccoon', name: 'CPT TRASH', type: 'raccoon', cSkin: '#888', cDark: '#444', cSuit: '#555', pType: 'boomerang', pColor: '#aaa' },
    { id: 'cat', name: 'BAT CAT', type: 'cat', cSkin: '#222', cDark: '#000', cSuit: '#111', pType: 'boomerang', pColor: '#ff69b4' },
    { id: 'corgi', name: 'THOR-GI', type: 'dog_pointy', cSkin: '#E3C099', cDark: '#FFF', cSuit: '#333', pType: 'boomerang', pColor: '#00FFFF' },
    { id: 'hulk', name: 'HULK-POODLE', type: 'poodle', cSkin: '#00FF00', cDark: '#006400', cSuit: '#800080', pType: 'melee_smash', pColor: '#00FF00' },
    { id: 'spider', name: 'SPIDER-PIG', type: 'pig', cSkin: '#FFC0CB', cDark: '#FF69B4', cSuit: '#FF0000', pType: 'gun', pColor: '#FFF' },
    { id: 'wolvie', name: 'WOLVER-WEENIE', type: 'dog_long', cSkin: '#8B4513', cDark: '#000', cSuit: '#FFFF00', pType: 'melee_slash', pColor: '#C0C0C0' },
    { id: 'dead', name: 'DEAD-POODLE', type: 'poodle', cSkin: '#FF0000', cDark: '#000', cSuit: '#333', pType: 'gun', pColor: '#FF0000' },
    { id: 'cap', name: 'CAPTAIN EAGLE', type: 'bird', cSkin: '#FFF', cDark: '#A52A2A', cSuit: '#0000FF', pType: 'boomerang', pColor: '#FFF' },
    { id: 'ironmouse', name: 'IRON-MOUSE', type: 'rodent', cSkin: '#808080', cDark: '#404040', cSuit: '#FF0000', pType: 'laser', pColor: '#FFFF00' },
    { id: 'widow', name: 'BLACK WIDOW-PUG', type: 'dog_flat', cSkin: '#000', cDark: '#111', cSuit: '#222', pType: 'gun', pColor: '#00FFFF' },
    { id: 'hawkeye', name: 'HAWK-HEDGEHOG', type: 'hedgehog', cSkin: '#D2B48C', cDark: '#8B4513', cSuit: '#800080', pType: 'grenade', pColor: '#DDD' },
    { id: 'strange', name: 'DR STRANGE-CAT', type: 'cat', cSkin: '#444', cDark: '#222', cSuit: '#0000FF', pType: 'magic', pColor: '#FFA500' },
    { id: 'panther', name: 'BLACK PANTHER', type: 'cat', cSkin: '#111', cDark: '#000', cSuit: '#222', pType: 'melee_slash', pColor: '#800080' },
    { id: 'ant', name: 'ANT-EATER-MAN', type: 'anteater', cSkin: '#808080', cDark: '#404040', cSuit: '#FF0000', pType: 'melee_smash', pColor: '#FF0000' },
    { id: 'starlord', name: 'STAR-LORD-FOX', type: 'fox', cSkin: '#FF8C00', cDark: '#8B0000', cSuit: '#8B4513', pType: 'laser', pColor: '#FFFF00' },
    { id: 'gamora', name: 'GAMORA-GECKO', type: 'lizard', cSkin: '#00FF00', cDark: '#006400', cSuit: '#000', pType: 'melee_slash', pColor: '#00FF00' },
    { id: 'drax', name: 'DRAX-BULLDOG', type: 'dog_flat', cSkin: '#008000', cDark: '#FF0000', cSuit: '#000080', pType: 'melee_slash', pColor: '#CCC' },
    { id: 'groot', name: 'GROOT-BARK', type: 'tree', cSkin: '#8B4513', cDark: '#A0522D', cSuit: '#654321', pType: 'melee_smash', pColor: '#8B4513' },
    { id: 'rocket', name: 'ROCKET-RABBIT', type: 'rabbit', cSkin: '#A9A9A9', cDark: '#696969', cSuit: '#FF4500', pType: 'grenade', pColor: '#FF4500' },
    { id: 'vision', name: 'VISION-ZEBRA', type: 'horse', cSkin: '#FFC0CB', cDark: '#008000', cSuit: '#FFFF00', pType: 'laser', pColor: '#FFFF00' },
    { id: 'scarlet', name: 'SCARLET-SKUNK', type: 'skunk', cSkin: '#000', cDark: '#FFF', cSuit: '#FF0000', pType: 'magic', pColor: '#FF0000' },
    { id: 'quick', name: 'QUICK-CHEETAH', type: 'cat', cSkin: '#D3D3D3', cDark: '#A9A9A9', cSuit: '#87CEEB', pType: 'melee_slash', pColor: '#87CEEB' },
    { id: 'winter', name: 'WINTER-WOLF', type: 'dog_pointy', cSkin: '#FFF', cDark: '#808080', cSuit: '#000', pType: 'gun', pColor: '#C0C0C0' },
    { id: 'falcon', name: 'FALCON-PIGEON', type: 'bird', cSkin: '#808080', cDark: '#696969', cSuit: '#FF0000', pType: 'gun', pColor: '#CCC' },
    { id: 'war', name: 'WAR-RHINO', type: 'rhino', cSkin: '#708090', cDark: '#2F4F4F', cSuit: '#000', pType: 'grenade', pColor: '#999' },
    { id: 'dare', name: 'DAREDEVIL-DOG', type: 'dog_pointy', cSkin: '#B22222', cDark: '#800000', cSuit: '#FF0000', pType: 'melee_slash', pColor: '#FF0000' },
    { id: 'punish', name: 'PUNISHER-PENGUIN', type: 'bird', cSkin: '#000', cDark: '#FFF', cSuit: '#000', pType: 'spread', pColor: '#FFF' },
    { id: 'shang', name: 'SHANG-CHI-PANDA', type: 'bear', cSkin: '#000', cDark: '#FFF', cSuit: '#FF0000', pType: 'melee_smash', pColor: '#FFD700' },
    { id: 'eternal', name: 'ETERNAL-ELEPHANT', type: 'elephant', cSkin: '#808080', cDark: '#696969', cSuit: '#FFD700', pType: 'magic', pColor: '#FFD700' },
    { id: 'moon', name: 'MOON-OWL', type: 'bird', cSkin: '#FFF', cDark: '#EEE', cSuit: '#DDD', pType: 'boomerang', pColor: '#FFF' },
    { id: 'shehulk', name: 'SHE-HULK-HAMSTER', type: 'rodent', cSkin: '#32CD32', cDark: '#006400', cSuit: '#800080', pType: 'melee_smash', pColor: '#00FF00' },
    { id: 'ghost', name: 'GHOST-GOAT', type: 'goat', cSkin: '#FFF', cDark: '#FF4500', cSuit: '#000', pType: 'melee_slash', pColor: '#FF4500' }
];
