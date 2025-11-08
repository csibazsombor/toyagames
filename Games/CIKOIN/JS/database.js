import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

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

// ===============================================
// ROOM CODE GENERATOR
// ===============================================
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ===============================================
// LISTEN PLAYER COUNT (also controls button disable)
// ===============================================
function listenEnoughPlayer(roomCode) {
  onValue(ref(db, `rooms/${roomCode}/enough_player`), (snap) => {
    window.enough_player = snap.val() ?? 0;
    console.log("👥 Players in room:", window.enough_player);

    const btn = document.getElementById("start_match");
    if (!btn) return;
    if (window.enough_player < 2) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
    } else {
      btn.disabled = false;
      btn.style.pointerEvents = "all";
      btn.style.opacity = "1";
    }
  });
}

// ===============================================
// SYNC MATCH START TO EVERY PLAYER
// ===============================================
function listenMatchState(roomCode) {
  onValue(ref(db, `rooms/${roomCode}/match_state`), (snap) => {
    if (snap.val() === "running") {
      console.log("🔥 MATCH START SIGNAL RECEIVED");
      // Initialize the map instead of calling start_match
      if (window.initializeMap) {
        window.initializeMap(roomCode);
      }
    }
  });
}

// ===============================================
// HOST ONLY SEES START BUTTON
// ===============================================
function setStartButtonVisibility(roomCode, username) {
  onValue(ref(db, `rooms/${roomCode}/host`), (snap) => {
    const host = snap.val();
    const btn = document.getElementById("start_match");
    if (!btn) return;
    btn.style.display = (username === host) ? "block" : "none";
  });
}

// ===============================================
// CREATE ROOM
// ===============================================
async function createRoom(username) {
  const roomCode = generateRoomCode();
  await set(ref(db, `rooms/${roomCode}`), {
    host: username,
    enough_player: 1,
    match_state: "waiting",
    players: {
      [username]: {
        character: (window.character?.value ?? "default")
      }
    }
  });
  return roomCode;
}

function setRoomCodeDisplay(code){
  const el = document.getElementById("room-code");
  el.dataset.code = code;                        // <-- FIX
  el.textContent = "Room code: " + code;
  el.style.display = "block";
  document.getElementById("players").style.display = "block";
}

// ===============================================
// JOIN ROOM
// ===============================================
async function joinRoom(code, username) {
  const roomSnap = await get(ref(db, `rooms/${code}`));
  if (!roomSnap.exists()) return false;

  const room = roomSnap.val();
  if (room.players && room.players[username]) return "username_taken";

  await update(ref(db, `rooms/${code}/players`), {
    [username]: {
      character: (window.character?.value ?? "default")
    }
  });

  const players = await get(ref(db, `rooms/${code}/players`));
  await update(ref(db, `rooms/${code}`), {
    enough_player: Object.keys(players.val() || {}).length
  });

  return true;
}

// ===============================================
// DISPLAY PLAYER LIST LIVE
// ===============================================
function listenForPlayers(roomCode) {
  onValue(ref(db, `rooms/${roomCode}/players`), (snap) => {
    const players = snap.val() || {};
    const div = document.getElementById("players");
    if (!div) return;

    div.innerHTML = "";
    for (const username in players) {
      const el = document.createElement("div");
      el.textContent = username;
      el.style.background = "#ffdab0ff"; // kept as-is
      el.style.color = "white";
      el.style.padding = "6px 12px";
      el.style.margin = "4px";
      el.style.borderRadius = "10px";
      div.appendChild(el);
    }
  });
}

// ===============================================
// CREATE SERVER BUTTON
// ===============================================
document.getElementById("create-server").onclick = async () => {
  const user = player.value.trim();
  const code = await createRoom(user);

  localStorage.setItem("room_code", code); // save

  // ✅ Show UI before playgame
  setRoomCodeDisplay(code);
  document.getElementById("room-code").style.display = "block";
  document.getElementById("players").style.display = "block";

  listenForPlayers(code);
  listenEnoughPlayer(code);
  listenMatchState(code);
  setStartButtonVisibility(code, user);

  playgame(); // now UI already visible
};


// ===============================================
// JOIN SERVER BUTTON
// ===============================================
document.getElementById("join-server").onclick = async () => {
  const user = player.value.trim();
  const code = document.getElementById("code-value").value.trim().toUpperCase();
  const result = await joinRoom(code, user);

  if (result === true) {
    localStorage.setItem("room_code", code); // save

    // ✅ Show UI before playgame
    setRoomCodeDisplay(code);
    document.getElementById("room-code").style.display = "block";
    document.getElementById("players").style.display = "block";

    listenForPlayers(code);
    listenEnoughPlayer(code);
    listenMatchState(code);
    setStartButtonVisibility(code, user);

    playgame();
  } else if (result === "username_taken") {
    alert("This username is already taken!");
  } else {
    alert("Room not found!");
  }
};


// ===============================================
// ✅ HOST START MATCH (only if 2+ players)
// ===============================================
document.getElementById("start_match").onclick = () => {
  if (window.enough_player < 2) {
    alert("⚠️ Need at least 2 players to start the game!");
    return;
  }

  // Prefer localStorage; fall back to DOM label text
  const lsCode = localStorage.getItem("room_code");
  const domText = document.getElementById("room-code")?.textContent || "";
  const parsedFromDom = domText.startsWith("Room code: ")
    ? domText.replace("Room code: ", "")
    : "";

  const code = lsCode || parsedFromDom;
  if (!code) {
    alert("Room code missing.");
    return;
  }

  update(ref(db, `rooms/${code}`), { match_state: "running" });
};
