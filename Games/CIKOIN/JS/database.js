import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

/* =========================
   FIREBASE
========================= */
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

/* =========================
   DOM HELPERS & GUARDS
========================= */
const $ = (id) => document.getElementById(id);

// cache elements (may be null if not on page)
const elCreate = $("create-server");
const elJoin   = $("join-server");
const elStart  = $("start_match");
const elPlayers= $("players");
const elRoomUi = $("room-code");
const elCodeIn = $("code-value");
const elPlayer = $("player");   // username input
// NOTE: do NOT fix character.value per your request
// const character = $("character"); // <-- intentionally NOT added

// safe call helpers
const safePlaygame = () => { if (typeof window.playgame === "function") window.playgame(); };
const safeInitMap  = (code) => { if (typeof window.initializeMap === "function") window.initializeMap(code); };

/* =========================
   ROOM CODE
========================= */
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* =========================
   LISTENERS
========================= */
function listenEnoughPlayer(roomCode) {
  onValue(ref(db, `rooms/${roomCode}/enough_player`), (snap) => {
    window.enough_player = snap.val() ?? 0;
    console.log("👥 Players in room:", window.enough_player);

    if (!elStart) return; // no button on this page

    const disabled = window.enough_player < 2;
    elStart.disabled = disabled;
    elStart.style.opacity = disabled ? "0.5" : "1";
    elStart.style.pointerEvents = disabled ? "none" : "all";
  });
}

function listenMatchState(roomCode) {
  onValue(ref(db, `rooms/${roomCode}/match_state`), (snap) => {
    if (snap.val() === "running") {
      console.log("🔥 MATCH START SIGNAL RECEIVED");
      safeInitMap(roomCode); // prefer initializeMap over start_match
    }
  });
}

function setStartButtonVisibility(roomCode, username) {
  if (!elStart) return;
  onValue(ref(db, `rooms/${roomCode}/host`), (snap) => {
    const host = snap.val();
    elStart.style.display = (username === host) ? "block" : "none";
  });
}

function listenForPlayers(roomCode) {
  if (!elPlayers) return;
  onValue(ref(db, `rooms/${roomCode}/players`), (snap) => {
    const players = snap.val() || {};
    elPlayers.innerHTML = "";

    Object.keys(players).forEach((username) => {
      const el = document.createElement("div");
      el.textContent = username;
      el.style.background = "#ffdab0ff";
      el.style.color = "white";
      el.style.padding = "6px 12px";
      el.style.margin = "4px";
      el.style.borderRadius = "10px";
      elPlayers.appendChild(el);
    });
  });
}

/* =========================
   CREATE / JOIN
========================= */
async function createRoom(username) {
  const roomCode = generateRoomCode();

  // if collision ever happens, just overwrite (extremely unlikely)
  await set(ref(db, `rooms/${roomCode}`), {
    host: username,
    enough_player: 1,
    match_state: "waiting",
    players: {
      [username]: {
        // DO NOT fix character.value here as requested
        character: (window.character && character.value) ?? "default"
      }
    }
  });

  return roomCode;
}

async function joinRoom(code, username) {
  const roomRef = ref(db, `rooms/${code}`);
  const roomSnap = await get(roomRef);
  if (!roomSnap.exists()) return false;

  const room = roomSnap.val();

  // same username already there
  if (room.players && room.players[username]) return "username_taken";

  // add player
  await update(ref(db, `rooms/${code}/players`), {
    [username]: {
      // DO NOT fix character.value here as requested
      character: (window.character && character.value) ?? "default"
    }
  });

  // recompute enough_player safely
  const playersSnap = await get(ref(db, `rooms/${code}/players`));
  const count = playersSnap.exists() ? Object.keys(playersSnap.val()).length : 0;
  await update(roomRef, { enough_player: count });

  return true;
}

/* =========================
   UI BINDINGS (guarded)
========================= */
function attachHandlers() {
  // start button: set initial disabled visual state (if present)
  if (elStart) {
    elStart.disabled = true;
    elStart.style.opacity = "0.5";
    elStart.style.pointerEvents = "none";

    elStart.onclick = async () => {
      const codeText = elRoomUi ? elRoomUi.textContent : "";
      const code = (codeText || "").replace("Room code: ", "").trim();
      if (!code) {
        alert("Room code missing.");
        return;
      }

      if ((window.enough_player ?? 0) < 2) {
        alert("⚠️ Need at least 2 players to start the game!");
        return;
      }

      await update(ref(db, `rooms/${code}`), { match_state: "running" });
    };
  }

  if (elCreate) {
    elCreate.onclick = async () => {
      const user = (elPlayer?.value || "").trim();
      if (!user) { alert("Please enter your name."); return; }

      const code = await createRoom(user);

      if (elRoomUi) elRoomUi.textContent = "Room code: " + code;

      listenForPlayers(code);
      listenEnoughPlayer(code);
      listenMatchState(code);
      setStartButtonVisibility(code, user);

      safePlaygame();
    };
  }

  if (elJoin) {
    elJoin.onclick = async () => {
      const user = (elPlayer?.value || "").trim();
      if (!user) { alert("Please enter your name."); return; }

      const raw = (elCodeIn?.value || "").trim();
      if (!raw) { alert("Enter a room code."); return; }
      const code = raw.toUpperCase();

      const result = await joinRoom(code, user);

      if (result === true) {
        if (elRoomUi) elRoomUi.textContent = "Room code: " + code;
        listenForPlayers(code);
        listenEnoughPlayer(code);
        listenMatchState(code);
        setStartButtonVisibility(code, user);
        safePlaygame();
      } else if (result === "username_taken") {
        alert("This username is already taken!");
      } else {
        alert("Room not found!");
      }
    };
  }
}

// Run when DOM is ready so elements exist
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachHandlers);
} else {
  attachHandlers();
}