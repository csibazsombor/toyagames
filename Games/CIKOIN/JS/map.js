import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
  getDatabase, ref, onValue 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAw2Z3KybdR_CJQ1e2_HnHAgKqC1WWxCRk",
  authDomain: "cikoin-firebase.firebaseapp.com",
  projectId: "cikoin-firebase",
  storageBucket: "cikoin-firebase.appspot.com",
  messagingSenderId: "929922401033",
  appId: "1:929922401033:web:46b70907bd41748459c9d8",
  measurementId: "G-74S2WKXHLH"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const TEAM_COLORS = {
  red: "#ff4d4d",
  blue: "#4d79ff",
  green: "#4dff4d",
  yellow: "#ffe44d",
  orange: "#ff9f4d",
  purple: "#b84dff",
  pink: "#ff4db8",
  gray: "#8d8d8d"
};

const CHARACTER_IMAGES = {
  ciko: "Characters/ciko.png",
  cloe: "Characters/cloe.png",
  "pici catto": "Characters/pici-catto.png",
  default: "Characters/ciko.png"
};

// ===============================================
// CREATE MAP
// ===============================================

function createMap() {
  const mapDiv = document.getElementById("map");
  
  if (!mapDiv) {
    console.error("Map element not found!");
    return;
  }
  
  mapDiv.innerHTML = "";
  
  // Map background - make it fixed and full screen
  mapDiv.style.cssText = `
    width: 100vw;
    height: 100vh;
    background: linear-gradient(to bottom, #87CEEB 0%, #b8e6f0 50%, #90EE90 100%);
    position: fixed;
    top: 0;
    left: 0;
    overflow: hidden;
    z-index: 1000;
  `;

  // Sun
  const sun = document.createElement("div");
  sun.style.cssText = `
    position: absolute;
    top: 50px;
    right: 80px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle, #FFD700 0%, #FFA500 100%);
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.6);
  `;
  mapDiv.appendChild(sun);

  // Clouds
  for (let i = 0; i < 3; i++) {
    const cloud = document.createElement("div");
    cloud.style.cssText = `
      position: absolute;
      top: ${60 + i * 80}px;
      left: ${100 + i * 300}px;
      width: 100px;
      height: 40px;
      background: white;
      border-radius: 50px;
      opacity: 0.8;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    `;
    
    const cloud2 = document.createElement("div");
    cloud2.style.cssText = `
      position: absolute;
      top: -15px;
      left: 20px;
      width: 60px;
      height: 50px;
      background: white;
      border-radius: 50%;
    `;
    cloud.appendChild(cloud2);
    
    const cloud3 = document.createElement("div");
    cloud3.style.cssText = `
      position: absolute;
      top: -10px;
      right: 20px;
      width: 50px;
      height: 40px;
      background: white;
      border-radius: 50%;
    `;
    cloud.appendChild(cloud3);
    
    mapDiv.appendChild(cloud);
  }

  // Ground
  const ground = document.createElement("div");
  ground.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(to bottom, #8B7355 0%, #654321 100%);
    border-top: 5px solid #5D4E37;
  `;

  // Grass decoration
  const grass = document.createElement("div");
  grass.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: #228B22;
    clip-path: polygon(0 100%, 2% 0, 4% 100%, 6% 0, 8% 100%, 10% 0, 12% 100%, 14% 0, 16% 100%, 18% 0, 20% 100%, 22% 0, 24% 100%, 26% 0, 28% 100%, 30% 0, 32% 100%, 34% 0, 36% 100%, 38% 0, 40% 100%, 42% 0, 44% 100%, 46% 0, 48% 100%, 50% 0, 52% 100%, 54% 0, 56% 100%, 58% 0, 60% 100%, 62% 0, 64% 100%, 66% 0, 68% 100%, 70% 0, 72% 100%, 74% 0, 76% 100%, 78% 0, 80% 100%, 82% 0, 84% 100%, 86% 0, 88% 100%, 90% 0, 92% 100%, 94% 0, 96% 100%, 98% 0, 100% 100%);
  `;
  ground.appendChild(grass);
  
  mapDiv.appendChild(ground);

  // Create player container
  const playerContainer = document.createElement("div");
  playerContainer.id = "map-players";
  playerContainer.style.cssText = `
    position: absolute;
    bottom: 220px;
    left: 0;
    right: 0;
    height: 300px;
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    padding: 0 100px;
  `;
  mapDiv.appendChild(playerContainer);
}

// ===============================================
// DISPLAY PLAYERS ON MAP
// ===============================================

function displayPlayersOnMap(roomCode) {
  onValue(ref(db, `rooms/${roomCode}/players`), (snap) => {
    const players = snap.val();
    const container = document.getElementById("map-players");
    
    if (!container) return;
    
    container.innerHTML = "";

    if (!players) return;

    const playerArray = Object.entries(players);
    
    playerArray.forEach(([username, info], index) => {
      const playerDiv = document.createElement("div");
      playerDiv.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      `;

      // Character image
      const characterImg = document.createElement("img");
      characterImg.src = CHARACTER_IMAGES[info.character] || CHARACTER_IMAGES.default;
      characterImg.alt = username;
      characterImg.style.cssText = `
        width: 120px;
        height: 120px;
        object-fit: contain;
        filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
        image-rendering: pixelated;
      `;
      
      // Handle image error
      characterImg.onerror = function() {
        this.style.cssText = `
          width: 120px;
          height: 120px;
          background: ${TEAM_COLORS[info.team]};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: white;
          font-weight: bold;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        this.alt = "";
        this.innerHTML = username.charAt(0).toUpperCase();
      };

      // Player name tag
      const nameTag = document.createElement("div");
      nameTag.textContent = username;
      nameTag.style.cssText = `
        background: ${TEAM_COLORS[info.team]};
        color: white;
        padding: 8px 20px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 18px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        text-transform: uppercase;
        letter-spacing: 1px;
      `;

      // Team indicator
      const teamIndicator = document.createElement("div");
      teamIndicator.textContent = `Team: ${info.team.toUpperCase()}`;
      teamIndicator.style.cssText = `
        background: rgba(255,255,255,0.9);
        color: ${TEAM_COLORS[info.team]};
        padding: 5px 15px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: bold;
        border: 2px solid ${TEAM_COLORS[info.team]};
      `;

      playerDiv.appendChild(characterImg);
      playerDiv.appendChild(nameTag);
      playerDiv.appendChild(teamIndicator);
      container.appendChild(playerDiv);
    });
  });
}

// ===============================================
// INITIALIZE MAP
// ===============================================

export function initializeMap(roomCode) {
  console.log("Initializing map for room:", roomCode);
  
  // Ensure game div and map are visible
  const menu = document.getElementById("menu");
  const room = document.getElementById("room");
  const gameDiv = document.getElementById("game");
  const mapDiv = document.getElementById("map");
  
  if (menu) {
    menu.style.display = "none";
    console.log("Menu hidden");
  }
  if (room) {
    room.style.display = "none";
    console.log("Room hidden");
  }
  if (gameDiv) {
    gameDiv.style.display = "block";
    gameDiv.style.width = "100%";
    gameDiv.style.height = "100vh";
    console.log("Game div shown");
  }
  
  if (!mapDiv) {
    console.error("Map div not found in HTML!");
    return;
  }
  
  console.log("Creating map...");
  // Create and display map
  createMap();
  
  console.log("Loading players...");
  displayPlayersOnMap(roomCode);
}

// Make it available globally
window.initializeMap = initializeMap;