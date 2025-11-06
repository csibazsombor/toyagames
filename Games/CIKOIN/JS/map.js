import { 
  getDatabase, ref, onValue 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const db = getDatabase();

let roomCode = "";

// Character images
const CHAR_IMAGES = {
  "ciko": "../Characters/ciko.png",
  "pici catto": "../Characters/pici-catto.png",
  "default": "../Characters/ciko.png"
};

// Team spawn positions
const SPAWNS = {
  red: { x: window.innerWidth * 0.30, y: window.innerHeight * 0.55 },
  blue: { x: window.innerWidth * 0.70, y: window.innerHeight * 0.55 }
};


export function initMap(code) {
  roomCode = code;

  const playersRef = ref(db, `rooms/${roomCode}/players`);
  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    drawPlayers(players);
  });
}

window.addEventListener("resize", () => {
  SPAWNS.red.x = window.innerWidth * 0.30;
  SPAWNS.red.y = window.innerHeight * 0.55;
  SPAWNS.blue.x = window.innerWidth * 0.70;
  SPAWNS.blue.y = window.innerHeight * 0.55;
});

function drawPlayers(players) {
  const map = document.getElementById("map");
  map.innerHTML = "";

  for (const username in players) {
    const p = players[username];
    
    const img = document.createElement("img");
    img.className = "player-sprite";

    img.src = CHAR_IMAGES[p.character] ?? CHAR_IMAGES.default;

    // Place by team
    const pos = SPAWNS[p.team] ?? { x: 300, y: 200 };
    img.style.left = pos.x + "px";
    img.style.top = pos.y + "px";

    map.appendChild(img);
  }
}
