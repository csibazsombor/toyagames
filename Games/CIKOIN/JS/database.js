import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAw2Z3KybdR_CJQ1e2_HnHAgKqC1WWxCRk",
  authDomain: "cikoin-firebase.firebaseapp.com",
  projectId: "cikoin-firebase",
  storageBucket: "cikoin-firebase.appspot.com", // ✅ fixed
  messagingSenderId: "929922401033",
  appId: "1:929922401033:web:46b70907bd41748459c9d8",
  measurementId: "G-74S2WKXHLH"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  console.log("Room created:", roomCode);
  return roomCode;
}

// --- JOIN ROOM ---
async function joinRoom(code, username) {
  const roomRef = ref(db, "rooms/" + code);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return false; // room does not exist

  const roomData = snapshot.val();
  const newTeam = team.value;

  // Username already used?
  if (roomData.players && roomData.players[username]) {
    return "username_taken";
  }

  // Team already taken?
  if (roomData.players) {
    for (const p in roomData.players) {
      if (roomData.players[p].team === newTeam) {
        return "team_taken";
      }
    }
  }

  // Add new player
  const playersRef = ref(db, "rooms/" + code + "/players");
  await update(playersRef, {
    [username]: {
      team: newTeam,
      character: character.value,
    },
  });

  return true;
}





// Example usage:
document.getElementById("create-server").onclick = async () => {
  const user = player.value;
  const code = await createRoom(user);
  alert("Your room code is: " + code);
    playgame();
};

document.getElementById("join-server").onclick = async () => {
  const user = player.value.trim();
  const code = document.getElementById("code-value").value.toUpperCase();
  const result = await joinRoom(code, user);

  if (result === true) {
    playgame();
  } 
  else if (result === "username_taken") {
    alert("This username is already in the server! Choose a different name.");
  }
  else if (result === "team_taken") {
    alert("This team/color is already taken! Choose a different one.");
  }
  else if (result === false) {
    alert("Room not found!");
  }
};
