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

// ✅ TEAM COLORS (edit these if needed)
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

// --- GENERATE ROOM CODE ---
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// --- CREATE ROOM ---
async function createRoom(username) {
  const roomCode = generateRoomCode();
  await set(ref(db, "rooms/" + roomCode), {
    host: username,
    players: {
      [username]: {
        team: team.value,
        character: character.value,
      }
    }
  });
  return roomCode;
}

// --- JOIN ROOM ---
async function joinRoom(code, username) {
  const roomRef = ref(db, "rooms/" + code);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return false;

  const roomData = snapshot.val();
  const newTeam = team.value;

  // Username taken?
  if (roomData.players && roomData.players[username]) {
    return "username_taken";
  }

  // Team already used?
  for (const p in roomData.players) {
    if (roomData.players[p].team === newTeam) {
      return "team_taken";
    }
  }

  await update(ref(db, "rooms/" + code + "/players"), {
    [username]: {
      team: newTeam,
      character: character.value,
    },
  });

  return true;
}

// --- REALTIME PLAYER LIST ---
function listenForPlayers(roomCode) {
  const playersRef = ref(db, "rooms/" + roomCode + "/players");

  onValue(playersRef, (snapshot) => {
    const playersData = snapshot.val();
    const playersDiv = document.getElementById("players");
    playersDiv.innerHTML = "";

    for (const username in playersData) {
      const entry = document.createElement("div");
      const teamName = playersData[username].team;

      entry.textContent = username;
      entry.style.background = TEAM_COLORS[teamName] || "#ffffff";
      entry.style.color = "white";
      entry.style.padding = "6px 12px";
      entry.style.margin = "4px 0";
      entry.style.borderRadius = "9999px";
      entry.style.fontWeight = "600";
      entry.style.display = "inline-block";
      entry.style.width = "fit-content";

      playersDiv.appendChild(entry);
    }
  });
}

// --- UI BUTTONS ---
document.getElementById("create-server").onclick = async () => {
  const user = player.value.trim();
  const code = await createRoom(user);

  document.getElementById("room-code").textContent = "Room code: " + code;

  listenForPlayers(code);
  playgame();
};

document.getElementById("join-server").onclick = async () => {
  const user = player.value.trim();
  const code = document.getElementById("code-value").value.toUpperCase();
  document.getElementById("room-code").textContent = "Room code: " + code;
  const result = await joinRoom(code, user);

  if (result === true) {
    listenForPlayers(code);
    playgame();
  } 
  else if (result === "username_taken") {
    alert("This username is already taken! Choose another.");
  }
  else if (result === "team_taken") {
    alert("This team is already chosen! Choose another.");
  }
  else if (result === false) {
    alert("Room not found!");
  }
};
