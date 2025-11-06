import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
  getDatabase, ref, set, get, update, onValue 
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

// ✅ This is the variable you want
let enough_player = 0;

// ✅ TEAM COLORS
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

// ✅ ROOM CODE GENERATOR
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ✅ LISTEN TO ENOUGH_PLAYER UPDATES
function listenEnoughPlayer(roomCode) {
  const countRef = ref(db, `rooms/${roomCode}/enough_player`);
  onValue(countRef, (snapshot) => {
window.enough_player = snapshot.val() ?? 0;
console.log("Players in room:", window.enough_player);

  });
}

// ✅ CREATE ROOM
async function createRoom(username) {
  const roomCode = generateRoomCode();

  await set(ref(db, `rooms/${roomCode}`), {
    host: username,
    enough_player: 1, // ✅ Create immediately
    players: {
      [username]: {
        team: team.value ?? "gray",
        character: character.value ?? "default"
      }
    }
  });

  return roomCode;
}

// ✅ JOIN ROOM + UPDATE PLAYER COUNT
async function joinRoom(code, username) {
  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return false;

  const roomData = snapshot.val();
  const newTeam = team.value ?? "gray";

  // Username taken?
  if (roomData.players && roomData.players[username]) return "username_taken";

  // Team in use?
  for (const p in roomData.players) {
    if (roomData.players[p].team === newTeam) return "team_taken";
  }

  // Add player
  await update(ref(db, `rooms/${code}/players`), {
    [username]: {
      team: newTeam,
      character: character.value ?? "default"
    }
  });

  // ✅ Recount players and update enough_player
  const playersRef = ref(db, `rooms/${code}/players`);
  const playersSnapshot = await get(playersRef);

  if (playersSnapshot.exists()) {
    const count = Object.keys(playersSnapshot.val()).length;
    await update(ref(db, `rooms/${code}`), { enough_player: count });
  }

  return true;
}

// ✅ REALTIME PLAYER LIST
function listenForPlayers(roomCode) {
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  onValue(playersRef, (snapshot) => {
    const playersData = snapshot.val();
    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = "";

    for (const username in playersData) {
      const entry = document.createElement("div");
      entry.textContent = username;
      entry.style.background = TEAM_COLORS[playersData[username].team];
      entry.style.color = "white";
      entry.style.padding = "6px 12px";
      entry.style.margin = "4px 4px";
      entry.style.borderRadius = "10px";
      playersDiv.appendChild(entry);
    }
  });
}

// ✅ BUTTONS
document.getElementById("create-server").onclick = async () => {
  const user = player.value.trim();
  const code = await createRoom(user);

  document.getElementById("room-code").textContent = "Room code: " + code;

  listenForPlayers(code);
  listenEnoughPlayer(code); // ✅ Sync variable live
  playgame();
  beep();
};

document.getElementById("join-server").onclick = async () => {
  const user = player.value.trim();
  const code = document.getElementById("code-value").value.trim().toUpperCase();
  document.getElementById("start_match").style.display = "none";
  document.getElementById("room-code").textContent = "Room code: " + code;

  const result = await joinRoom(code, user);

  if (result === true) {
    listenForPlayers(code);
    listenEnoughPlayer(code); // ✅ Sync variable live
    playgame();
    beep();
  }
  else if (result === "username_taken") alert("This username is already taken!");
  else if (result === "team_taken") alert("This team is already chosen!");
  else alert("Room not found!");
};
