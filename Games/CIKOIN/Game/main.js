import * as THREE from "three";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/loaders/FBXLoader.js";
import { CSS2DRenderer, CSS2DObject } 
  from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/renderers/CSS2DRenderer.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
  getDatabase, ref, set, get, update, onValue, push, onChildAdded
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";


const firebaseConfig = { 
  apiKey: "AIzaSyAw2Z3KybdR_CJQ1e2_HnHAgKqC1WWxCRk", 
  authDomain: "cikoin-firebase.firebaseapp.com", 
  projectId: "cikoin-firebase", 
  storageBucket: "cikoin-firebase.appspot.com", 
  messagingSenderId: "929922401033", 
  appId: "1:929922401033:web:46b70907bd41748459c9d8", 
  measurementId: "G-74S2WKXHLH" }; 
  const app = initializeApp(firebaseConfig); 
  const db = getDatabase(app); 

  // Room + Username 
  const ROOM = localStorage.getItem("room_code"); const USER = localStorage.getItem("username") || ("Player" + Math.floor(Math.random()*999));
  let isHost = false;
  onValue(ref(db, `rooms/${ROOM}/host`), snap=>{
  isHost = snap.val() === USER;
  console.log("Is Host?", isHost);
});
  
     // Read existing talent ONLY (do NOT rewrite it)
     const talent = localStorage.getItem("talent");
     
     console.log("🎯 Talent loaded:", talent);
     
     // Default multipliers
     let TALENT_SPEED_BOOST = 1;
     let TALENT_JUMP_BOOST  = 1;
     
     // Apply only when localStorage has a valid value
     if (talent === "Fighty") {
         TALENT_SPEED_BOOST = 1.3; // +10% speed
     } 
     else if (talent === "Jumpy") {
         TALENT_JUMP_BOOST = 1.22; // +10% jump
     }
     

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then(reg => {
    console.log("🛡 SW registered");

    reg.addEventListener("updatefound", () => {
      const newSW = reg.installing;

      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller) {
          console.log("📢 New update ready!");

          // Show popup
          document.getElementById("update-popup").style.display = "block";

          // When user clicks update → reload fully
          document.getElementById("update-btn").onclick = () => {
            newSW.postMessage("skipWaiting");
            window.location.reload(true);
          };
        }
      });
    });
  });
}

/* =========================================================
   TEAMWORK PUZZLE: Pressure Plates
========================================================= */
const plates = [];

function createPressurePlate(x, z, id) {
  const plateGroup = new THREE.Group();
  plateGroup.position.set(x, 0, z);
  scene.add(plateGroup);

  // Base plate
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.25, 24),
    new THREE.MeshStandardMaterial({ 
      color: 0x777777, 
      roughness: 0.8 
    })
  );
  base.position.y = 0.12;
  base.castShadow = true;
  base.receiveShadow = true;
  plateGroup.add(base);

  // Glowing ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.25, 32),
    new THREE.MeshBasicMaterial({
      color: 0x22ff22,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.21;
  plateGroup.add(ring);

  // Hint UI icon
  const lbl = document.createElement("div");
  lbl.textContent = "🟩 STEP";
  lbl.style.color = "white";
  lbl.style.fontSize = "16px";
  lbl.style.fontWeight = "700";
  lbl.style.textShadow = "0 0 6px #0f0";
  const plateLabel = new CSS2DObject(lbl);
  plateLabel.position.set(0, 1.6, 0);
  plateGroup.add(plateLabel);

  plates.push({
    id,
    group: plateGroup,
    base,
    ring,
    label: lbl,
    pos: new THREE.Vector3(x, 0, z),
    active: false
  });
}

let puzzleSolved = false;
let buildProgress = 0;
let houseBuilt = false;

onValue(ref(db, `rooms/${ROOM}/puzzles/plates`), snap => {
  const state = snap.val() || {};
  const allPressed = Object.values(state).length === 2 &&
                     Object.values(state).every(v => v);

  if (allPressed && !puzzleSolved) {
    puzzleSolved = true;
    portalActive = true;
    if (portalGroup) portalGroup.visible = true;

    showAnnouncement("🌀 A magical portal has appeared!");

    if (ROOM) set(ref(db, `rooms/${ROOM}/puzzles/solved`), true);
  }
});

// Restore puzzle portal state from DB on join
onValue(ref(db, `rooms/${ROOM}/puzzles/solved`), snap => {
  const solved = snap.val();
  if (!solved) return;

  puzzleSolved = true;
  portalActive = true;

  if (portalGroup) {
    portalGroup.visible = true;
    portalGlow.visible = true;
  }

  console.log("✨ Portal already unlocked from previous game!");
});


console.log("ROOM:", ROOM);
console.log("USER:", USER);

// If no room found, stop multiplayer gracefully
if (!ROOM) {
  console.warn("No room_code found in localStorage. Multiplayer disabled.");
}

// Create remote player dictionary
const otherPlayers = {};

// Ensure player entry exists in DB
if (ROOM && USER) {
  update(ref(db, `rooms/${ROOM}/players/${USER}`), {
    x: 0, y: 0, z: 0, rot: 0
    
  });

  // Everyone is in ONE team (Team Friends)
  update(ref(db, `rooms/${ROOM}/players/${USER}`), {
    team: "friends"
  });

}

// Function to create a remote player clone of your model
function createRemotePlayer() {
  const grp = new THREE.Group();

  // If your FBX model is loaded → clone
  if (window.originalPlayerModel) {
    const clone = window.originalPlayerModel.clone(true);
    clone.rotation.y = MODEL_FACE_ADJUST; // ✅ Make remote face same direction

    clone.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    grp.add(clone);
    // NAME + RANK LABEL
    const nameDiv = document.createElement("div");
    nameDiv.style.color = "white";
    nameDiv.style.fontWeight = "900";
    nameDiv.style.fontSize = "18px";
    nameDiv.style.textShadow = "0 2px 6px rgba(0,0,0,0.6)";
    nameDiv.style.textAlign = "center";
    nameDiv.innerHTML = "#?";
      
    const label = new CSS2DObject(nameDiv);
    label.position.set(0, 2.2, 0); 
    grp.add(label);
      
    grp.rankLabel = nameDiv;
    grp.playerName = null; // we fill this later

  } else {
    // Temporary placeholder (used only until FBX loads)
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x4db3ff, roughness: 0.8 })
    );
    body.position.y = 0.9;
    grp.add(body);
  }

  grp.position.set(0,0,0);
  scene.add(grp);
  return grp;
}

// Listen to database updates for other players
if (ROOM) {
  const playersRef = ref(db, `rooms/${ROOM}/players`);

  onValue(playersRef, snap => {
    const players = snap.val() || {};

    for (const name in players) {
      if (name === USER) continue;

      const data = players[name];

      // Create remote player if not existing yet
      if (!otherPlayers[name]) {
        otherPlayers[name] = {
          mesh: createRemotePlayer(),
          targetPos: new THREE.Vector3(),
          targetRot: new THREE.Quaternion(),
          coins: 0
        };
      }

      const p = otherPlayers[name];

      // Update player position & rotation
      p.targetPos.set(data.x, data.y, data.z);
      p.targetRot.setFromEuler(new THREE.Euler(0, data.rot, 0));



      // Update coins
      p.coins = data.coins || 0;
    }

    // Check removed players and delete them
    for (const name in otherPlayers) {
      if (name !== USER && !players[name]) {
        scene.remove(otherPlayers[name].mesh);
        delete otherPlayers[name];
      }
    }
  });

if (ROOM) {

  // Sync flower states
  onValue(ref(db, `rooms/${ROOM}/flowers`), snap => {
    const state = snap.val() || {};
    flowers.forEach(f => {
      if (state[f.id] === true && !f.collected) {
        f.collected = true;
        scene.remove(f.center);
        scene.remove(f.stem);
      }
    });
  });

  // Sync chest states
  onValue(ref(db, `rooms/${ROOM}/chests`), snap => {
    const state = snap.val() || {};
    chests.forEach(c => {
      if (state[c.id] === true && !c.opened) {
        c.opened = true;
        scene.remove(c.base);
      }
    });
  });

}

}


/* =========================================================
   BASIC SETUP
========================================================= */

const loaderText = document.getElementById("loader-text");
const loaderFill = document.getElementById("loader-fill");
const loaderPercent = document.getElementById("loader-percent");
const loadingScreen = document.getElementById("loading-screen");

let displayedProgress = 0;

function smoothProgress(real) {
  displayedProgress += (real - displayedProgress) * 0.12;
  loaderFill.style.width = displayedProgress + "%";
  loaderPercent.textContent = Math.round(displayedProgress) + "%";
}
const loadingManager = new THREE.LoadingManager();
const loader = new FBXLoader(loadingManager);
loader.load(
  "assets/character.fbx", 
  fbx => {
    playerRoot.remove(placeholderGroup);
    const box = new THREE.Box3().setFromObject(fbx);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.7 / size.y;
    fbx.scale.setScalar(scale);
    box.setFromObject(fbx);
    const min = box.min;
    fbx.position.y = -min.y * scale;
    fbx.rotation.y = MODEL_FACE_ADJUST;
    fbx.castShadow = true;
    fbx.receiveShadow = true;
    fbx.traverse(child => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
      
        // 🌸 Perfect cute matte-toy balance
        child.material.roughness = 0.32;     // a bit soft
        child.material.metalness = 0.05;     // tiny highlight
        child.material.envMapIntensity = 0.8; 
      
        // gentle warm self-light so shadows don't darken face
        child.material.emissive = new THREE.Color(0xffffff);
        child.material.emissiveIntensity = 0.005;
      }
    });


    model = fbx;
    playerRoot.add(model);
    // Disable unnecessary bones or advanced details
    fbx.traverse(o => {
      if (o.isMesh) {
        o.geometry.computeBoundsTree = undefined; // disable heavy BVH
        o.frustumCulled = true; // auto cull if off-screen
        o.castShadow = false; // huge perf boost
      }
    });

        // ✅ Store for cloning remote players
        window.originalPlayerModel = fbx;

        // 🔥 Replace placeholder remote players with the real model
        for (const name in otherPlayers) {
            const p = otherPlayers[name];
            if (!p.mesh) continue;
        
            // Remove placeholder
            p.mesh.clear();
        
            // Create real FBX clone
            const clone = fbx.clone(true);
            clone.rotation.y = MODEL_FACE_ADJUST;
        
            clone.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
          
            p.mesh.add(clone);
          }
          },
  undefined,
  err => console.error("Model load failed:", err)
  
);
// =========================
// Detailed Loading Manager
// =========================
let loadStages = [
  { keyword: ".jpg",     name: "🖼️ Loading Textures" },
  { keyword: ".png",     name: "🖼️ Loading Images" },
  { keyword: ".fbx",     name: "📦 Loading 3D Assets" },
  { keyword: "firebase", name: "⛓️ Connecting Multiplayer" },
  { keyword: "levels",   name: "🌍 Generating World" },
];

let currentStage = "⏳ Starting...";
let loadedFiles = 0;
let totalFiles = 0;



// First detect how many assets in total
loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  totalFiles = itemsTotal;
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  loadedFiles = itemsLoaded;
  totalFiles = itemsTotal;

  // Pick stage name by matching file extension/keyword
  let stage = loadStages.find(s => url.includes(s.keyword));
  currentStage = stage ? stage.name : "📦 Loading Resources";

  loaderText.textContent =
    `${currentStage} (${loadedFiles}/${totalFiles})`;

  let progress = (loadedFiles / totalFiles) * 100;
  smoothProgress(progress);

  loaderPercent.textContent = Math.round(displayedProgress) + "%";
};

// When EVERYTHING finished
loadingManager.onLoad = () => {
  loaderText.textContent = "🚀 Starting Adventure...";
  smoothProgress(100);

  // FUN FINAL HINT MESSAGES while fading
  setTimeout(() => {
    loaderText.textContent = "🌐 Syncing Multiplayer...";
  }, 400);

  setTimeout(() => {
    loaderText.textContent = "🎮 Ready!";
  }, 800);

  // Remove screen
  setTimeout(() => {
    loadingScreen.style.opacity = "0";
    setTimeout(() => loadingScreen.remove(), 600);
  }, 1000);
};

const tips = [
  "💡 Tip: Stand on plates together to unlock magic!",
  "🔍 Explore the map — secrets are hiding!",
  "😺 Befriend cats in the Cozy Village!",
  "⚡ Collect powerups for special boosts!",
  "🎉 Play with friends for more rewards!"
];

setInterval(() => {
  const random = tips[Math.floor(Math.random()*tips.length)];
  loaderText.textContent = random;
}, 4000);


// When loading is fully finished
loadingManager.onLoad = () => {
  const fade = setInterval(() => {
    smoothProgress(100);
    if (displayedProgress > 99.5) {
      clearInterval(fade);
      loadingScreen.style.opacity = "0";
        if(localStorage.getItem("username") == null)
        {
          alert("Offline mode");
        }
      setTimeout(() => loadingScreen.remove(), 650);
    }
  }, 33);

  // Start the actual game AFTER fade

};



const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0xb0e0f6, 40, 180);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias:true });
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0px";
labelRenderer.domElement.style.left = "0px";
labelRenderer.domElement.style.pointerEvents = "none";
labelRenderer.domElement.style.zIndex = "999999"; // <-- important
document.body.appendChild(labelRenderer.domElement);

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* LIGHTING */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const hemi = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.7);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff5e1, 1.2);
sun.position.set(25, 40, 20);
sun.castShadow = true;
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
scene.add(sun);


function isWinter() {
  const month = new Date().getMonth();
  return (month >= 11 || month <= 2);
}


/* CUTE MAP */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x90ee90,
    roughness: 0.8,
    metalness: 0
  })
);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);
// Place 3 teamwork puzzle plates
createPressurePlate(-5, 10, "P1");
createPressurePlate(-1, 10, "P2");

  const snowParticles = [];

  function createSnowParticles() {
    const snowGeo = new THREE.BufferGeometry();
    const count = 400;

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 40 + 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }

    snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
      transparent: true,
      opacity: 0.9
    });

    const snow = new THREE.Points(snowGeo, snowMat);
    scene.add(snow);
    snowParticles.push({ mesh: snow, positions });
  }
  
if (isWinter()) {
  console.log("❄️ Winter Mode Enabled!");

  const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.1,
    emissive: 0xeff7ff,
    emissiveIntensity: 0.05
  });

  // Add subtle snow sparkles using normal map noise
  const loader = new THREE.TextureLoader();
  loader.load("textures/snow.jpg", tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    snowMaterial.normalMap = tex;
    snowMaterial.normalScale.set(0.25, 0.25);
  });

  ground.material = snowMaterial;

  scene.fog.color.set(0xddeeff);
  scene.background.set(0xd0e6ff);

  hemi.intensity = 0.5;
  sun.color.set(0xcceaff);

  // Snow on trees 🌲❄️
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const col = obj.material.color.getHex();
      if (col === 0x228b22) obj.material.color.set(0xe0f2ff);
    }
  });

  createSnowParticles();
}

// ========================================
// SECRET COZY VILLAGE AREA (Hidden until unlocked)
// ========================================
const cozyGroup = new THREE.Group();
cozyGroup.visible = false; // 🔥 NOT visible until portal unlocks
scene.add(cozyGroup);

function createCozyVillage() {
  const spawnX = 80;
  const spawnZ = -40;

  // Ground pad
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(12, 32),
    new THREE.MeshStandardMaterial({ color: 0xe8d9b5, roughness: 0.9 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(spawnX, 0.01, spawnZ);
  pad.receiveShadow = true;
  cozyGroup.add(pad);

  // Lamps
  function lamp(x, z) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3a21 })
    );
    pole.position.set(x, 1.5, z);
    pole.castShadow = true;
    cozyGroup.add(pole);

    const light = new THREE.PointLight(0xffddaa, 1.4, 10);
    light.position.set(x, 3.1, z);
    light.castShadow = true;
    cozyGroup.add(light);
  }
  lamp(spawnX + 3, spawnZ + 3);
  lamp(spawnX - 3, spawnZ - 3);

  // Houses
  function house(x, z, color) {
    const h = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3, 5),
      new THREE.MeshStandardMaterial({ color })
    );
    base.position.y = 1.5;
    h.add(base);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.7, 2.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x7a3d15 })
    );
    roof.position.y = 4;
    roof.rotation.y = Math.PI / 4;
    h.add(roof);

    h.position.set(x, 0, z);
    h.traverse(o => o.castShadow = true);
    cozyGroup.add(h);
  }

  house(spawnX + 8, spawnZ + 6, 0xd4655b);
  house(spawnX - 8, spawnZ - 6, 0x7dcfb6);

  // Trees
  for (let i = 0; i < 8; i++) {
    const x = spawnX + (Math.random() - 0.5) * 25;
    const z = spawnZ + (Math.random() - 0.5) * 25;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b3e1d })
    );
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    cozyGroup.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2d7d46 })
    );
    leaves.position.set(x, 3.5, z);
    leaves.castShadow = true;
    cozyGroup.add(leaves);
  }

  // Bench
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.3, 1),
    new THREE.MeshStandardMaterial({ color: 0x4f331f })
  );
  bench.position.set(spawnX, 0.15, spawnZ - 6);
  bench.castShadow = true;
  cozyGroup.add(bench);
}
// ===========================================
// TEAMHOUSE CONSTRUCTION AREA
// ===========================================
const buildPlot = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 6),
  new THREE.MeshStandardMaterial({
    color: 0xc9c39f,
    transparent: true,
    opacity: 0.6
  })
);
buildPlot.rotation.x = -Math.PI/2;
buildPlot.position.set(80, 0.02, -55);
buildPlot.receiveShadow = true;
cozyGroup.add(buildPlot);

// Build markers where players must stand
const markA = new THREE.Mesh(
  new THREE.CircleGeometry(0.6, 16),
  new THREE.MeshBasicMaterial({ color: 0xff7777 })
);
markA.rotation.x = -Math.PI/2;
markA.position.set(82, 0.03, -55);
cozyGroup.add(markA);

const markB = new THREE.Mesh(
  new THREE.CircleGeometry(0.6, 16),
  new THREE.MeshBasicMaterial({ color: 0x77b5ff })
);
markB.rotation.x = -Math.PI/2;
markB.position.set(78, 0.03, -55);
cozyGroup.add(markB);


// ===========================================
// TEAMWORK INTERACTABLES
// ===========================================

// Multiplayer lever puzzle to unlock next area
let leverA, leverB, teamworkGate;
let leverState = { A:false, B:false };

function createLever(x, z, id) {
  const lever = new THREE.Mesh(
    new THREE.BoxGeometry(0.2,0.8,0.2),
    new THREE.MeshStandardMaterial({ color:0xaaaaaa })
  );
  lever.position.set(x,0.4,z);
  lever.castShadow = true;
  cozyGroup.add(lever);
  lever.userData.id = id;
  return lever;
}

leverA = createLever(80 + 4, -40);
leverB = createLever(80 - 4, -40);

// Gate blocking next expansion
teamworkGate = new THREE.Mesh(
  new THREE.BoxGeometry(6,3,0.8),
  new THREE.MeshStandardMaterial({ color:0x444488 })
);
teamworkGate.position.set(80,1.5,-50);
teamworkGate.castShadow = true;
cozyGroup.add(teamworkGate);

// 🔥 Fire Pit (team heal)
const fire = new THREE.Mesh(
  new THREE.CylinderGeometry(1,1,0.4,12),
  new THREE.MeshStandardMaterial({ color:0x993300 })
);
fire.position.set(75,0.2,-35);
fire.castShadow = true;
cozyGroup.add(fire);

// 🍰 Café Table (team reward)
const table = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2,1.2,0.2,12),
  new THREE.MeshStandardMaterial({ color:0xdeb887 })
);
table.position.set(85,0.1,-35);
table.castShadow = true;
cozyGroup.add(table);

// 🐈 Cat Adoption House
const catHouse = new THREE.Group();
const catBase = new THREE.Mesh(
  new THREE.BoxGeometry(2,1.5,2),
  new THREE.MeshStandardMaterial({ color:0xffb6c1 })
);
catBase.position.set(88,0.75,-45);
catHouse.add(catBase);
catHouse.position.set(88,0,-45);
catHouse.traverse(o=>o.castShadow=true);
cozyGroup.add(catHouse);



// 🌈 Cute Soft Modern Grid
const isWinterMode = typeof isWinter === "function" && isWinter();

const gridColor = isWinterMode ? 0xeaf6ff : 0xffffff; // Winter = Ice white
const fadeColor = isWinterMode ? 0xcce9ff : 0xccffcc; // Winter = Sky-pastel

const grid = new THREE.GridHelper(200, 120);
grid.position.y = 0.02;

const mat = grid.material;
mat.opacity = 0.16;
mat.transparent = true;
mat.depthWrite = false; // Avoid dark artifacts
mat.color.set(gridColor);

// Give different shade to center lines
grid.material.vertexColors = true;
grid.material.color.set(gridColor);
grid.material.groundColor = new THREE.Color(fadeColor);

// Soft emissive glow
grid.material.emissive = new THREE.Color(gridColor);
grid.material.emissiveIntensity = 0.02;

scene.add(grid);


// Collision objects array
const collisionObjects = [];

// Add cute obstacles with collision
const addCuteBox = (x, z, w, h, d, color) => {
  const geometry = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
  const material = new THREE.MeshStandardMaterial({ 
    color, roughness: 0.6, metalness: 0.1
  });
  const box = new THREE.Mesh(geometry, material);
  box.position.set(x, h/2, z);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
  
  // Add to collision array with bounding box
  collisionObjects.push({
    mesh: box,
    minX: x - w/2, maxX: x + w/2,
    minZ: z - d/2, maxZ: z + d/2,
    height: h
  });
  return box;
};

// Create cute colorful obstacles
addCuteBox(12, 12, 5, 3, 5, 0xff69b4);
addCuteBox(-15, -10, 4, 5, 4, 0x9370db);
addCuteBox(18, -18, 6, 2.5, 6, 0xffd700);
addCuteBox(-22, 15, 5, 4, 5, 0x87ceeb);
addCuteBox(0, -25, 4, 3, 4, 0xff6347);
addCuteBox(-25, -25, 3, 6, 3, 0x98fb98);
addCuteBox(25, 5, 4, 4, 4, 0xffa500);

// Add cute trees/cylinders
for(let i = 0; i < 10; i++) {
  const angle = (i / 10) * Math.PI * 2;
  const radius = 35 + Math.random() * 15;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.2, 7, 10), // thicker + taller
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  trunk.position.set(x, 3.5, z); // move up because it’s taller
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);
  
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(5, 12, 12), // bigger leaf puff
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
  );
  leaves.position.set(x, 7, z); // match new trunk height
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  scene.add(leaves);

  
  // Add tree collision
  collisionObjects.push({
    mesh: trunk,
    minX: x - 2.2, maxX: x + 2.2,
    minZ: z - 2.2, maxZ: z + 2.2,
    height: 8
  });

}
// ========================================
// PUZZLE REWARD: MAGIC PORTAL
// ========================================
let portal;
let portalGlow;
let portalActive = false;

function createPortal(x, z) {
  const portalGroup = new THREE.Group();
  portalGroup.position.set(x, 0, z);
  portalGroup.visible = false; // Hidden until solved

  // Portal ring (glowing halo)
  const ringGeo = new THREE.RingGeometry(2.4, 2.8, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide
  });
  portalGlow = new THREE.Mesh(ringGeo, ringMat);
  portalGlow.rotation.x = -Math.PI / 2;
  portalGlow.position.y = 0.05;
  portalGroup.add(portalGlow);

  // Portal glass (swirl surface)
  const portalGeo = new THREE.CircleGeometry(2.5, 64);
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0x5599ff,
    opacity: 0.7,
    transparent: true
  });
  portal = new THREE.Mesh(portalGeo, portalMat);
  portal.rotation.x = -Math.PI / 2;
  portal.position.y = 0.04;
  portalGroup.add(portal);

  scene.add(portalGroup);

  // Store for updates
  portalGroup.isPortal = true;
  return portalGroup;
}

// 🔥 Place portal far away — new secret area!
const portalGroup = createPortal(5, 5);

// DATABASE 
  onChildAdded(ref(db, `rooms/${ROOM}/events`), snap=>{
  const e = snap.val();
  if(e.type === "spawnCoin") spawnCoin();
  if(e.type === "coinBoost") coinBoostTimer = e.duration/1000;
  if(e.type === "message") showAnnouncement(e.text);
  if(e.type === "teleportVillage") {
  playerRoot.position.set(80, 0, -40);
  cozyGroup.visible = true;
}

});

  function showAnnouncement(msg){
    const a = document.getElementById("announcement");
    a.textContent = msg;
    a.style.display = "block";
    setTimeout(()=>a.style.display="none",3000);
  }

  function updatePressurePlate(id, active) {
    if (!ROOM) return;
    set(ref(db, `rooms/${ROOM}/puzzles/plates/${id}`), active);
  }
  
  // Restore village unlocked if teleported before
  onValue(ref(db, `rooms/${ROOM}/villageUnlocked`), snap => {
    const unlocked = snap.val();
    if (unlocked) {
      cozyGroup.visible = true;
      console.log("🏡 Village already unlocked!");
    }
  });

  onValue(ref(db, `rooms/${ROOM}/build`), snap => {
  const data = snap.val();
  if (!data) return;

  buildProgress = data.progress;
  if (buildProgress >= 100 && !houseBuilt) buildHouse();
});
// ========== BOUNCY MUSHROOMS ==========
const mushrooms = [];
const flowers = [];
const chests = [];
const platforms = [];
const butterflies = [];
function createMushroom(x, z) {
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff8dc, roughness: 0.7 })
  );
  stem.position.set(x, 0.6, z);
  stem.castShadow = true;
  scene.add(stem);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ 
      color: 0xff1493,
      emissive: 0xff69b4,
      emissiveIntensity: 0.2
    })
  );
  cap.position.set(x, 1.5, z);
  cap.castShadow = true;
  scene.add(cap);

  mushrooms.push({
    pos: new THREE.Vector3(x, 0, z),
    cap: cap    // ✅ Store cap mesh
  });
}

createMushroom(8, 8);
createMushroom(-12, 8);
createMushroom(15, -12);
createMushroom(-8, -15);
createMushroom(20, 20);

// ========== FLOWERS (collectible, synced) ==========
function createFlower(x, z, id) {
  const flowerGroup = new THREE.Group();
  flowerGroup.position.set(x, 0, z);
  scene.add(flowerGroup);

  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x1e8c3a })
  );
  stem.position.y = 0.7;
  stem.castShadow = true;
  flowerGroup.add(stem);

  // Flower color variations
  const petalColors = [
    0xff99cc, // pastel pink
    0xffd966, // warm yellow
    0x87cefa, // sky blue
    0xff6b6b, // rose red
    0xc084fc, // lilac purple
    0x98fb98  // mint green
  ];
  const petalColor = petalColors[Math.floor(Math.random() * petalColors.length)];

  // Petals (circle arrangement)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * 0.35;
    const pz = Math.sin(angle) * 0.35;

    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.35 })
    );
    petal.position.set(px, 1.35, pz);
    petal.castShadow = true;
    flowerGroup.add(petal);
  }

  // Center Ball
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffdd55,
      emissiveIntensity: 0.35,
      roughness: 0.2
    })
  );
  center.position.set(0, 1.35, 0);
  center.castShadow = true;
  flowerGroup.add(center);

  flowers.push({
    id,
    group: flowerGroup,
    pos: new THREE.Vector3(x, 1.35, z),
    collected: false
  });
}

for (let i = 0; i < 15; i++) {
  createFlower((Math.random()-0.5)*60, (Math.random()-0.5)*60, "F"+i);
}

// ========== TREASURE CHESTS (synced) ==========
function createChest(x, z, id) {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 1),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  base.position.set(x, 0.4, z);
  base.castShadow = true;
  scene.add(base);

  chests.push({ id, base, opened: false, pos: new THREE.Vector3(x, 0, z) });
}
createChest(5,-5,"C1");
createChest(-18,5,"C2");
createChest(22,-8,"C3");
createChest(-10,-20,"C4");


/* =========================================================
   PICKUPS: COINS + POWERUPS
========================================================= */

const coins = [];
function spawnCoin() {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0xffd700, metalness: 0.4, roughness: 0.2,
      emissive: 0xffaa00, emissiveIntensity: 0.3
    })
  );
  coin.position.set(
    (Math.random() - 0.5) * 70,
    1.5 + Math.random() * 2,
    (Math.random() - 0.5) * 70
  );
  coin.rotation.z = Math.PI / 2;
  coin.castShadow = true;
  scene.add(coin);
  coins.push({mesh: coin, collected: false, baseY: coin.position.y});
}
for(let i = 0; i < 24; i++) spawnCoin();

// PowerUps with types
const powerUps = [];
const POWER_TYPES = [
  { type: "speed",  color: 0x00e5ff, emissive: 0x00bcd4, label:"⚡" },
  { type: "shield", color: 0x7c3aed, emissive: 0x8b5cf6, label:"🛡️" },
  { type: "magnet", color: 0xff6b6b, emissive: 0xff8787, label:"🧲" },
  { type: "highjump", color: 0x22c55e, emissive: 0x34d399, label:"🦘" },
  // double jump remains always bundled with any pickup for 10s
];

function spawnPowerup() {
  const pick = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
  const star = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({ 
      color: pick.color, metalness: 0.5, roughness: 0.3,
      emissive: pick.emissive, emissiveIntensity: 0.6
    })
  );
  star.position.set(
    (Math.random() - 0.5) * 80,
    2 + Math.random() * 1,
    (Math.random() - 0.5) * 80
  );
  star.castShadow = true;
  scene.add(star);
  powerUps.push({mesh: star, collected: false, baseY: star.position.y, kind: pick.type, label: pick.label});
}
for (let i=0;i<6;i++) spawnPowerup();

const potionsList = [];

function spawnPotion() {
  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.7, 12),
    new THREE.MeshStandardMaterial({
      color: 0xff4d6d,
      emissive: 0xff4d6d,
      emissiveIntensity: 0.4,
      roughness: 0.8,
    })
  );
  bottle.position.set(
    (Math.random() - 0.5) * 70,
    1.1,
    (Math.random() - 0.5) * 70
  );
  bottle.castShadow = true;
  scene.add(bottle);
  potionsList.push({ mesh: bottle, collected: false });
}

// Spawn 2 potions around map
for (let i = 0; i < 2; i++) spawnPotion();

/* =========================================================
   CLOUDS
========================================================= */
const clouds = [];
for(let i = 0; i < 8; i++) {
  const cloudGroup = new THREE.Group();
  for(let j = 0; j < 3; j++) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(2 + Math.random() * 1.5, 8, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0xffffff, transparent: true, opacity: 0.8, roughness: 1
      })
    );
    sphere.position.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 1,
      (Math.random() - 0.5) * 2
    );
    cloudGroup.add(sphere);
  }
  cloudGroup.position.set(
    (Math.random() - 0.5) * 150,
    15 + Math.random() * 10,
    (Math.random() - 0.5) * 150
  );
  scene.add(cloudGroup);  
  clouds.push({
    group: cloudGroup,
    speed: 0.5 + Math.random() * 1,
    startX: cloudGroup.position.x
  });
}

/* =========================================================
   PLAYER
========================================================= */
const playerRoot = new THREE.Group();
playerRoot.position.set(0, 0, 0);
scene.add(playerRoot);
// TEAMHOUSE BUILDING
const nearA = playerRoot.position.distanceTo(markA.position) < 1.2;
let friendNearB = false;

const MAX_NET_DISTANCE = 40;

for (const name in otherPlayers) {
  const p = otherPlayers[name];
  if (!p.mesh) continue;

  // Distance-based optimization
  const dist = p.mesh.position.distanceTo(playerRoot.position);
  if (dist > MAX_NET_DISTANCE) {
    // Hide or disable expensive features when far away
    p.mesh.visible = false;
    continue;
  } else {
    p.mesh.visible = true;
  }

  // Smooth movement (interpolation)
  p.mesh.position.lerp(p.targetPos, 0.12);
  p.mesh.quaternion.slerp(p.targetRot, 0.12);

  // Smooth Y bobbing + animation
  // (if you kept your existing movement animation)
}


if (nearA && friendNearB) {
  buildProgress += dt * 10; // teamwork = faster
  showAnnouncement("🏗 Building together!");
}

if (buildProgress >= 100) {
  buildProgress = 100;
  buildHouse();
 
}

function buildHouse() {
  if (houseBuilt) return;
  houseBuilt = true;
  cozyGroup.visible = true;

  showAnnouncement("🏡 Home Built Together! 💕");

  const home = new THREE.Group();

  // House base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xffe0c8 })
  );
  base.position.y = 2;
  base.castShadow = true;
  home.add(base);

  // Cute roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.8, 3.3, 4),
    new THREE.MeshStandardMaterial({ color: 0xc2544f })
  );
  roof.position.y = 5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  home.add(roof);

  home.position.set(80, 0, -55);
  cozyGroup.add(home);
}

createCozyVillage();
cozyGroup.visible = false;
// Player collision capsule
const PLAYER_RADIUS = 0.5;
const PLAYER_HEIGHT = 1.7;
const PLAYER_COLLISION_RADIUS = 0.8; // how close players can get before pushing

let model;
let walkTime = 0;

const MODEL_FACE_ADJUST = THREE.MathUtils.degToRad(-90);

// Cute placeholder
const placeholderGroup = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.4, 0.8, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xff69b4 })
);
body.position.y = 0.9;
body.castShadow = true;
placeholderGroup.add(body);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xffb6c1 })
);
head.position.y = 1.5;
head.castShadow = true;
placeholderGroup.add(head);
playerRoot.add(placeholderGroup);


// Floating HP Bar Above Player
const hpBarContainer = document.createElement("div");
hpBarContainer.style.position = "absolute";
hpBarContainer.style.width = "70px";        // <-- ADD THIS
hpBarContainer.style.height = "10px";       // <-- ADD THIS
hpBarContainer.style.background = "rgba(0,0,0,0.45)";
hpBarContainer.style.border = "2px solid white";
hpBarContainer.style.borderRadius = "6px";
hpBarContainer.style.overflow = "hidden";
hpBarContainer.style.backdropFilter = "blur(4px)";

const hpBarFill = document.createElement("div");
hpBarFill.style.height = "100%";
hpBarFill.style.width = "100%";
hpBarFill.style.borderRadius = "4px";
hpBarFill.style.background = "#34d399"; // green

hpBarContainer.appendChild(hpBarFill);

const hpLabel = new CSS2DObject(hpBarContainer);
hpLabel.position.set(0, PLAYER_HEIGHT + 0.6, 0); // stays same
playerRoot.add(hpLabel);

function updateHP() {
  const ratio = health / 100;
  hpBarFill.style.width = (ratio * 100) + "%";

  if (ratio > 0.6) hpBarFill.style.background = "#34d399";
  else if (ratio > 0.3) hpBarFill.style.background = "#f59e0b";
  else hpBarFill.style.background = "#ef4444";
}




// NAME + RANK LABEL
const nameDiv = document.createElement("div");
nameDiv.style.color = "white";
nameDiv.style.fontWeight = "900";
nameDiv.style.fontSize = "18px";
nameDiv.style.textShadow = "0 2px 6px rgba(0,0,0,0.6)";
nameDiv.style.textAlign = "center";
nameDiv.innerHTML = `#? ${USER}`;

const nameLabel = new CSS2DObject(nameDiv);
nameLabel.position.set(0, PLAYER_HEIGHT + 1.1, 0); // above HP bar
playerRoot.add(nameLabel);

playerRoot.rankLabel = nameDiv; // store reference for updates

/* =========================================================
   INPUT
========================================================= */
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const keys = { w:0, a:0, s:0, d:0, space:0 };

addEventListener("keydown", e => { 
  const k = e.key.toLowerCase();
  if(k in keys) keys[k] = 1;
  if(e.code === "Space") keys.space = 1;
});

addEventListener("keyup", e => { 
  const k = e.key.toLowerCase();
  if(k in keys) keys[k] = 0;
  if(e.code === "Space") keys.space = 0;
});

function usePotion() {
  if (potions > 0 && health < 100) {
    potions--;
    health = Math.min(100, health + 30);
    updateHP();         // already exists
    updateInventoryUI();
  }
}

function updateInventoryUI() {
  const inv = document.getElementById("inventory");
  inv.textContent = `🍎 ${potions}`;
}

addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "q") {
    usePotion();
  }
});


const moveVec = new THREE.Vector2();

const debug = document.getElementById("debug");
const staminaFill = document.getElementById("staminaFill");

if(isMobile) {
  const controls = document.getElementById("controls");
  if (controls) controls.style.display = "none";

  const jumpBtn = document.getElementById("jumpBtn");
  jumpBtn.style.display = "flex";
  jumpBtn.style.alignItems = "center";
  jumpBtn.style.justifyContent = "center";
  
  const gp = document.getElementById("gamepad");
  const stick = document.getElementById("stick");
  gp.style.display = "block";

  const JOYSTICK_RADIUS = 70;
  const STICK_MAX_DISTANCE = 50;
  const SENSITIVITY = 0.3; // Lower = less sensitive (0.5 = half speed, 1.0 = full)
  let activeTouch = null;
  
  const updateJoystick = (touch) => {
    const rect = gp.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if(distance > STICK_MAX_DISTANCE) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * STICK_MAX_DISTANCE;
      dy = Math.sin(angle) * STICK_MAX_DISTANCE;
    }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    // Apply sensitivity to movement vector
    moveVec.set((dx / STICK_MAX_DISTANCE) * SENSITIVITY, (-dy / STICK_MAX_DISTANCE) * SENSITIVITY);
  };
  
  const resetJoystick = () => {
    stick.style.transform = "translate(0px, 0px)";
    stick.style.transition = "transform 0.15s ease-out";
    setTimeout(() => { stick.style.transition = "none"; }, 150);
    moveVec.set(0, 0);
    activeTouch = null;
  };
  
  gp.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if(activeTouch === null && e.touches.length > 0) {
      activeTouch = e.touches[0].identifier;
      stick.style.transition = "none"; // Instant response on touch
      updateJoystick(e.touches[0]);
    }
  }, {passive: false});
  
  gp.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if(activeTouch !== null) {
      for(let i = 0; i < e.touches.length; i++) {
        if(e.touches[i].identifier === activeTouch) {
          updateJoystick(e.touches[i]);
          break;
        }
      }
    }
  }, {passive: false});
  
  gp.addEventListener("touchend", (e) => {
    if(activeTouch !== null) {
      for(let i = 0; i < e.changedTouches.length; i++) {
        if(e.changedTouches[i].identifier === activeTouch) {
          resetJoystick();
          break;
        }
      }
    }
  }, {passive: false});
  
  gp.addEventListener("touchcancel", (e) => {
    if(activeTouch !== null) {
      resetJoystick();
    }
  }, {passive: false});

  // Jump button for mobile
  let jumpActive = false;
  jumpBtn.addEventListener("touchstart", (e) => {
    e.preventDefault(); e.stopPropagation();
    jumpActive = true; keys.space = 1;
  }, {passive:false});
  jumpBtn.addEventListener("touchend", (e) => {
    e.preventDefault(); e.stopPropagation();
    jumpActive = false; keys.space = 0;
  }, {passive:false});
}



/* =========================================================
   CAMERA
========================================================= */
let camYaw = 0, camPitch = -0.3;
let dragging = false, lastX = 0, lastY = 0;

addEventListener("mousedown", e => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
});
addEventListener("mouseup", () => dragging = false);
addEventListener("mousemove", e => {
  if(!dragging) return;
  camYaw -= (e.clientX - lastX) * 0.003;
  camPitch -= (e.clientY - lastY) * 0.003;
  camPitch = Math.max(-1.2, Math.min(0.4, camPitch));
  lastX = e.clientX; lastY = e.clientY;
});

let touchStartX = 0, touchStartY = 0;
let isCameraTouch = false;
addEventListener("touchstart", e => {
  if(e.target.closest("#gamepad") || e.target.closest("#jumpBtn")) return;
  if(e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isCameraTouch = true;
  }
});
addEventListener("touchmove", e => {
  if(!isCameraTouch || e.target.closest("#gamepad")) return;
  if(e.touches.length === 1) {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    camYaw -= dx * 0.005;
    camPitch -= dy * 0.005;
    camPitch = Math.max(-1.2, Math.min(0.4, camPitch));
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
});
addEventListener("touchend", () => { isCameraTouch = false; });

/* =========================================================
   COLLISION
========================================================= */
function checkCollision(newPos) {
  for(const obj of collisionObjects) {
    if(newPos.x + PLAYER_RADIUS > obj.minX &&
       newPos.x - PLAYER_RADIUS < obj.maxX &&
       newPos.z + PLAYER_RADIUS > obj.minZ &&
       newPos.z - PLAYER_RADIUS < obj.maxZ) {
      return obj;
    }
  }
  return null;
}
function resolveCollision(pos, collision) {
  const centerX = (collision.minX + collision.maxX) / 2;
  const centerZ = (collision.minZ + collision.maxZ) / 2;
  const dx = pos.x - centerX;
  const dz = pos.z - centerZ;
  const overlapX = (collision.maxX - collision.minX) / 2 + PLAYER_RADIUS - Math.abs(dx);
  const overlapZ = (collision.maxZ - collision.minZ) / 2 + PLAYER_RADIUS - Math.abs(dz);
  if(overlapX < overlapZ) pos.x += overlapX * Math.sign(dx);
  else pos.z += overlapZ * Math.sign(dz);
}

/* =========================================================
   MOVEMENT + PHYSICS + STATS
========================================================= */
const up = new THREE.Vector3(0, 1, 0);
let vel = new THREE.Vector3();
let verticalVel = 0;

// 🌍 Same fast speed on all devices
const WALK_BASE = 5 * TALENT_SPEED_BOOST;
const RUN_BASE  = 8 * TALENT_SPEED_BOOST;

let WALK = WALK_BASE;
let RUN  = RUN_BASE;

const ACCEL = 1;
const DRAG = 0.93;   // keep momentum

const GRAVITY = -30;
const JUMP_FORCE = 9 * TALENT_JUMP_BOOST;

let stamina = 3, STAMINA_MAX = 3;
const DRAIN = 1.1, REGEN_MOVE = 0.7, REGEN_IDLE = 1.8;

// Player stats
let health = 100; // %
let invulnTimer = 0;
let potions = 0;

let isGrounded = true;
let jumpRequested = false;
let coinsCollected = 0;

// Powerup state
let powerUpActive = false;
let powerUpTimer = 0;
let doubleJumpAvailable = false;
let hasDoubleJumped = false;

// Extra powerups
let speedBoostTimer = 0;
let shieldTimer = 0;
let magnetTimer = 0;
let highJumpTimer = 0;
let coinBoostTimer = 0; // 🔥 NEW: Global coin boost timer

// Magnet parameters
const MAGNET_RADIUS = 12;
const MAGNET_PULL   = 12; // units/s toward player


// Send my position to database
let lastSentPos = new THREE.Vector3();
let lastSentRot = 0;

function sendPlayerData() {
  if (!ROOM || !USER) return;

  const dx = Math.abs(playerRoot.position.x - lastSentPos.x);
  const dz = Math.abs(playerRoot.position.z - lastSentPos.z);
  const drot = Math.abs(playerRoot.rotation.y - lastSentRot);

  // Only update if moved enough
  if (dx < 0.03 && dz < 0.03 && drot < 0.02) return;

  update(ref(db, `rooms/${ROOM}/players/${USER}`), {
    x: playerRoot.position.x,
    y: playerRoot.position.y,
    z: playerRoot.position.z,
    rot: playerRoot.rotation.y
  });

  lastSentPos.copy(playerRoot.position);
  lastSentRot = playerRoot.rotation.y;
}

/* =========================================================
   ADMIN PANEL
========================================================= */
document.getElementById("spawnCoinBtn").onclick = () => {
  push(ref(db, `rooms/${ROOM}/events`), {
    type:"spawnCoin",
    time:Date.now(),
    creator:USER
  });
};

document.getElementById("boostBtn").onclick = () => {
  push(ref(db, `rooms/${ROOM}/events`), {
    type:"coinBoost",
    duration:20000,
    creator:USER
  });
};

document.getElementById("msgBtn").onclick = () => {
  const text = prompt("Message:");
  if (!text) return;
  push(ref(db, `rooms/${ROOM}/events`), {
    type:"message",
    text,
    creator:USER
  });
  document.getElementById("removeCoinsBtn").onclick = () => {
  set(ref(db, `rooms/${ROOM}/players`), {});
  showAnnouncement("🧹 Coins wiped!");
};

document.getElementById("resetFlowersBtn").onclick = () => {
  set(ref(db, `rooms/${ROOM}/flowers`), null);
  showAnnouncement("🌼 Flowers reset!");
};

document.getElementById("resetChestsBtn").onclick = () => {
  set(ref(db, `rooms/${ROOM}/chests`), null);
  showAnnouncement("📦 Chests reset!");
};

document.getElementById("forcePortalBtn").onclick = () => {
  set(ref(db, `rooms/${ROOM}/puzzles/solved`), true);
  showAnnouncement("🌀 Portal forced!");
};

document.getElementById("unlockVillageBtn").onclick = () => {
  set(ref(db, `rooms/${ROOM}/villageUnlocked`), true);
  showAnnouncement("🏡 Village unlocked!");
};

document.getElementById("tpVillageBtn").onclick = () => {
  push(ref(db, `rooms/${ROOM}/events`), {
    type:"teleportVillage",
    time:Date.now()
  });
};

document.getElementById("clearEventsBtn").onclick = () => {
  set(ref(db, `rooms/${ROOM}/events`), null);
  showAnnouncement("🧹 Events cleared!");
};

};
  
// ===== ADMIN SECRET ACCESS =====
window.unlockAdmin = function(password) {
  const SECRET = "3549151"; // change anytime

  if (password !== SECRET) {
    console.warn("❌ Wrong admin password");
    return;
  }

  if (!ROOM || !USER) {
    console.warn("⚠ No active room or user.");
    return;
  }

  console.log("✔ Admin unlocked!");
  isHost = true;

  // Update Firebase to make this player the host
  set(ref(db, `rooms/${ROOM}/host`), USER);

  // Show admin panel if exists
  const panel = document.getElementById("adminPanel");
  if (panel) panel.style.display = "block";
};
// Hide by default
const adminPanel = document.getElementById("adminPanel");
adminPanel.style.display = "none";

function toggleAdminPanel() {
  if (!isHost) return;
  adminPanel.style.display = 
    adminPanel.style.display === "none" ? "block" : "none";

}
addEventListener("keydown", e => {
  if (e.key === "Enter") {
    toggleAdminPanel();
  }
});


/* =========================================================
   LOOP
========================================================= */
let last = performance.now();
// Network rate limiter — last time we sent data to DB
let lastSend = 0;

function loop() {

  updateHP();

  // Healing when near teammates
  for (const name in otherPlayers) {
    const p = otherPlayers[name];
    if (!p.mesh) continue;

    const dist = playerRoot.position.distanceTo(p.mesh.position);

    if (dist < 3 && health < 100) {
      health = Math.min(100, health + 10 * dt);
      updateHP();
    }
  }

  const now = performance.now();
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

// ✅ Remote walk animation
for (const name in otherPlayers) {
  const p = otherPlayers[name];
  if (!p.mesh) continue;

  const isRemoteMoving = (
    Math.abs(p.mesh.position.x - p.x) > 0.01 ||
    Math.abs(p.mesh.position.z - p.z) > 0.01
  );

  if (!p.walkTime) p.walkTime = 0;

// Correct remote walk animation
if (isRemoteMoving) {
    p.walkTime += dt * 3;
    const bob = Math.sin(p.walkTime) * 0.03;
    const sway = Math.sin(p.walkTime * 2) * 0.03;

    if (p.mesh.children.length > 0) {
        const mdl = p.mesh.children[0]; // FBX inside group
        mdl.position.y = bob;       // OK
        mdl.rotation.z = sway;      // OK
    }
} else {
    if (p.mesh.children.length > 0) {
        const mdl = p.mesh.children[0];
        mdl.position.y += (0 - mdl.position.y) * 0.12;
        mdl.rotation.z += (0 - mdl.rotation.z) * 0.12;
    }
}
}




for (const name in otherPlayers) {
  const p = otherPlayers[name];
  if (!p.mesh) continue;

  // Smooth position + rotation based on target vectors
  p.mesh.position.lerp(p.targetPos, 0.12);
  p.mesh.quaternion.slerp(p.targetRot, 0.12);
}




  // Send to Firebase only every 100ms (10/s instead of 60)
  let updateInterval = (vel.length() > 0.1 ? 90 : 250); // 250ms idle

  if (now - lastSend > updateInterval) {
    sendPlayerData();
    lastSend = now;
  }



  // Animate clouds
  clouds.forEach(cloud => {
    cloud.group.position.x += cloud.speed * dt;
    if(cloud.group.position.x > 100) cloud.group.position.x = -100;
  });

  // Animate coins (+ magnet)
  coins.forEach((coin, i) => {
    if(coin.collected) return;
    coin.mesh.rotation.y += dt * 2;
    coin.mesh.position.y = coin.baseY + Math.sin(now * 0.002 + i) * 0.3;

    // Magnet pull
    if (magnetTimer > 0) {
      const toPlayer = new THREE.Vector3().subVectors(playerRoot.position, coin.mesh.position);
      const dist = toPlayer.length();
      if (dist < MAGNET_RADIUS) {
        toPlayer.normalize();
        coin.mesh.position.addScaledVector(toPlayer, MAGNET_PULL * dt);
      }
    }

    
    // Collect
    const dist = playerRoot.position.distanceTo(coin.mesh.position);
    if (dist < 1.3) {
      coin.collected = true;
      scene.remove(coin.mesh);
    
      // ✅ Increase local coin count
      coinsCollected += (coinBoostTimer > 0 ? 2 : 1); // 2x coins if boosted
    
      // ✅ Write to database
      if (ROOM) {
        update(ref(db, `rooms/${ROOM}/players/${USER}`), { coins: coinsCollected });
      }
    
      // ✅ Respawn new coin later
      setTimeout(spawnCoin, 1200);
    
      // ✨ Sparkle
      for(let j = 0; j < 6; j++) {
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(0.08),
          new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        particle.position.copy(coin.mesh.position);
        scene.add(particle);
        setTimeout(() => scene.remove(particle), 400);
      }
    }

  });
  coinBoostTimer = Math.max(0, coinBoostTimer - dt);

    // Collect flowers
    flowers.forEach(f => {
      if (f.collected) return;
      if (playerRoot.position.distanceTo(f.pos) < 1.4) {
        f.collected = true;
        scene.remove(f.group);
        coinsCollected += 3;
        if (ROOM) set(ref(db, `rooms/${ROOM}/flowers/${f.id}`), true);
      }
    });

    // Open chests
    chests.forEach(c => {
      if (c.opened) return;
      if (playerRoot.position.distanceTo(c.pos) < 2.0) {
        c.opened = true;
        scene.remove(c.base);
        coinsCollected += 10;
        if (ROOM) set(ref(db, `rooms/${ROOM}/chests/${c.id}`), true);
      }
    });

    // Bounce Mushrooms (juicy)
    mushrooms.forEach(m => {
      const dist = playerRoot.position.distanceTo(m.pos);
      if (dist < 1.6 && isGrounded) {
        verticalVel = 28; // stronger bounce
        isGrounded = false;
      
        // ✅ Animate mushroom cap (cute squash effect)
        m.cap.scale.set(1.3, 0.5, 1.3);
        setTimeout(() => {
          m.cap.scale.set(1, 1, 1);
        }, 150);
      }
    });


    // Collect potions
    potionsList.forEach((p) => {
      if (p.collected) return;
      const dist = playerRoot.position.distanceTo(p.mesh.position);
      if (dist < 1.4) {
        p.collected = true;
        scene.remove(p.mesh);
        potions++;
        updateInventoryUI();
        setTimeout(spawnPotion, 6000); // respawn after delay
      }
    });

  // Animate & collect powerups
  powerUps.forEach((p, i) => {
    if(p.collected) return;
    p.mesh.rotation.y += dt * 3;
    p.mesh.rotation.x += dt * 2;
    p.mesh.position.y = p.baseY + Math.sin(now * 0.003 + i) * 0.5;
    const dist = playerRoot.position.distanceTo(p.mesh.position);
    if(dist < 2.0) {
      p.collected = true;
      scene.remove(p.mesh);

      // Any pickup enables double-jump for the duration
      doubleJumpAvailable = true;
      powerUpActive = true;
      powerUpTimer = 10;

      // Apply specific effect
      if (p.kind === "speed") {
        speedBoostTimer = 10;
      } else if (p.kind === "shield") {
        shieldTimer = 10;
      } else if (p.kind === "magnet") {
        magnetTimer = 10;
      } else if (p.kind === "highjump") {
        highJumpTimer = 10;
      }

      // Respawn another powerup later
      setTimeout(spawnPowerup, 4000);
    }
  });

  // Power-up timers tick
  const tickTimer = (v) => Math.max(0, v - dt);
  powerUpTimer  = tickTimer(powerUpTimer);
  speedBoostTimer = tickTimer(speedBoostTimer);
  shieldTimer   = tickTimer(shieldTimer);
  magnetTimer   = tickTimer(magnetTimer);
  highJumpTimer = tickTimer(highJumpTimer);
  if (powerUpTimer === 0) powerUpActive = false;
  if (powerUpTimer === 0) doubleJumpAvailable = false;

  // Same speed control on both platforms
  let ix, iy;

  if (isMobile) {
    ix = moveVec.x;
    iy = moveVec.y;
  } else {
  ix = (keys.d - keys.a) * 0.6;
  iy = (keys.w - keys.s) * 0.6;


    // Keyboard reaches 1 instantly — limit to same mobile range
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
}


  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right = new THREE.Vector3().crossVectors(up, forward).negate();

  const input = new THREE.Vector3()
    .addScaledVector(right, ix)
    .addScaledVector(forward, iy);

  const moving = input.lengthSq() > 0.0004;
  let sprint = moving && stamina > 0.1;


  // Effective speeds
  const speedMult = (powerUpActive ? 1.35 : 1) * (speedBoostTimer>0 ? 1.55 : 1);
  const targetSpeed = (sprint ? RUN : WALK) * speedMult;

    // ABSOLUTE CONTROLLED MOVEMENT 🔒
    const MAX_WALK = 10 * TALENT_SPEED_BOOST;   // SUPER slow walk speed
    const MAX_RUN  = 15 * TALENT_SPEED_BOOST;   // Slight sprint boost
    const isSprint = stamina > 0.1 && moving;

    const finalSpeed = isSprint ? MAX_RUN : MAX_WALK;

    if (moving) {
        input.normalize();
        vel.copy(input).multiplyScalar(finalSpeed); // DIRECT SPEED — NO ACCELERATION
    } else {
        vel.set(0, 0, 0); // stop instantly when no input
    }


  vel.multiplyScalar(DRAG);

  vel.multiplyScalar(DRAG);
  if (cozyGroup.visible) {
  // BUILD Saving — correct location (inside loop)
if (ROOM && buildProgress > 0 && buildProgress < 100) {
  update(ref(db, `rooms/${ROOM}/build`), { progress: buildProgress });
}

// TEAMWORK INTERACTIONS
const distLeverA = playerRoot.position.distanceTo(leverA.position);
const distLeverB = playerRoot.position.distanceTo(leverB.position);

// Player can activate lever while standing close
if (distLeverA < 1.5 && keys.e) {
  leverState.A = true;
}
if (distLeverB < 1.5 && keys.e) {
  leverState.B = true;
}

// Sync next area unlock if both activated
if (leverState.A && leverState.B) {
  teamworkGate.position.y += 0.1; // gate lifts!
}

// 🌟 Team healing at campfire
const distFire = playerRoot.position.distanceTo(fire.position);
if (distFire < 2) {
  for (const name in otherPlayers) {
    const p = otherPlayers[name];
    if (!p.mesh) continue;
    if (p.mesh.position.distanceTo(fire.position) < 2) {
      health = Math.min(100, health + 15 * dt);
      updateHP();
    }
  }
}

// Team sitting reward at café
const distTable = playerRoot.position.distanceTo(table.position);
if (distTable < 1.8) {
  for (const name in otherPlayers) {
    const p = otherPlayers[name];
    if (!p.mesh) continue;
    if (p.mesh.position.distanceTo(table.position) < 1.8) {
      coinsCollected += 0.1; // slow farm but ONLY together
    }
  }
}

// Cat adoption if friend nearby
const distCat = playerRoot.position.distanceTo(catHouse.position);
if (distCat < 2.5) {
  let friendHere = false;
  for (const _ in otherPlayers) friendHere = true;

  if (friendHere && keys.f) {
    // TODO: spawn a cute pet cat follower!
    showAnnouncement("🐱 Yay! You adopted a village cat!");
  }
}
}



  // Jump (double/high jump)
  if(keys.space && !jumpRequested) {
    if(isGrounded) {
      verticalVel = JUMP_FORCE * (highJumpTimer>0 ? 1.25 : 1.0);
      isGrounded = false;
      jumpRequested = true;
      hasDoubleJumped = false;
    } else if(doubleJumpAvailable && !hasDoubleJumped) {
      verticalVel = JUMP_FORCE * (0.9) * (highJumpTimer>0 ? 1.25 : 1.0);
      hasDoubleJumped = true;
      jumpRequested = true;
    }
  }
  if(!keys.space) jumpRequested = false;

  // Gravity
  verticalVel += GRAVITY * dt;

  // Calculate new position
  const newPos = playerRoot.position.clone();
  newPos.addScaledVector(vel, dt);
  newPos.y += verticalVel * dt;

  // Collide with world
  const collision = checkCollision(newPos);
  if(collision) resolveCollision(newPos, collision);

  // Apply position
  playerRoot.position.copy(newPos);

    // ✅ Multiplayer player-to-player collision
    for (const name in otherPlayers) {
    const p = otherPlayers[name];
    if (!p.mesh) continue;

    const dx = playerRoot.position.x - p.mesh.position.x;
    const dz = playerRoot.position.z - p.mesh.position.z;

        const distSq = dx*dx + dz*dz;
    
      if (distSq < PLAYER_COLLISION_RADIUS * PLAYER_COLLISION_RADIUS) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = PLAYER_COLLISION_RADIUS - dist;
      
        const pushX = (dx / dist) * (overlap * 0.5);
        const pushZ = (dz / dist) * (overlap * 0.5);
      
        // Push me
        playerRoot.position.x += pushX;
        playerRoot.position.z += pushZ;
      
        // Push the remote visually (optional, smooth)
        p.mesh.position.x -= pushX * 0.4;
        p.mesh.position.z -= pushZ * 0.4;
      }
    }

  // Ground check
  if (playerRoot.position.y <= 0.01) {
    if (verticalVel < 0) verticalVel = 0;
    playerRoot.position.y = 0.01;
    if (!isGrounded) {
      isGrounded = true;
      hasDoubleJumped = false;
    }
  }


  // Face movement
  if (moving) {
    const yaw = Math.atan2(input.x, input.z);

    // Smooth rotation without snapping
    const current = playerRoot.rotation.y;
    const diff = yaw - current;

    // Normalize angle difference (-PI to PI)
    const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff));

    playerRoot.rotation.y = current + wrapped * 0.15; // 0.1 = slow turn, 0.3 = fast turn
  }

  // === PRESSURE PLATE ACTIVATION ===
  plates.forEach(p => {
    const stepping = playerRoot.position.distanceTo(p.pos) < 1.3;
  
    if (stepping !== p.active) {
      p.active = stepping;
      updatePressurePlate(p.id, p.active);
    }
  
    // Visual feedback
    p.base.material.color.set(p.active ? 0x00ff00 : 0x777777);
    p.ring.material.opacity = p.active ? 1.0 : 0.3;
  });


  
    // ✅ Walk cycle animation
    if (moving) {
      if (model) {
        walkTime += dt * (sprint ? 5 : 3); // slower walk + sprint scale
        const bob = Math.sin(walkTime) * 0.03;   // smaller up/down
        const sway = Math.sin(walkTime * 2) * 0.03; // smaller tilt
        model.position.y = bob;
        model.rotation.z = sway;
      }
    } else {
      if (model) {
        model.position.y += (0 - model.position.y) * 0.12;
        model.rotation.z += (0 - model.rotation.z) * 0.12;
      }
    }
// Portal animation
if (portalActive && portalGroup) {
  portal.rotation.z += dt * 1.5;
  portalGlow.material.opacity = 0.5 + Math.sin(now * 0.005) * 0.3;

  const dist = playerRoot.position.distanceTo(portalGroup.position);

  if (dist < 2.5) {
    showAnnouncement("🌌 Teleporting...");
    
  // Teleported → unlock cozy village for everyone
  playerRoot.position.set(80, 0, -40);
    
  cozyGroup.visible = true;
  portalActive = false;
    
  if (ROOM)
    set(ref(db, `rooms/${ROOM}/villageUnlocked`), true);
  
  }
}



    // Stamina
    if (moving) {
      if (sprint && stamina > 0.1) {
        stamina -= DRAIN * dt; // drain stamina while sprinting
      } else {
        stamina += REGEN_MOVE * dt; // regen slowly while moving
      }
    } else {
      stamina += REGEN_IDLE * dt; // regen quickly when standing still
    }

    stamina = Math.max(0, Math.min(STAMINA_MAX, stamina));

    // If stamina is empty, force walk
    if (stamina <= 0.1) {
      sprint = false;
    }


  staminaFill.style.width = `${(stamina/STAMINA_MAX) * 100}%`;
  if(stamina < 1) {
    staminaFill.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
  } else if(stamina < 2.5) {
    staminaFill.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
  } else {
    staminaFill.style.background = "linear-gradient(90deg, #fbbf24, #f59e0b)";
  }

// ===== RANK UPDATE =====
if (ROOM) {
    const scoreList = [];

    // Add MYSELF once only
    scoreList.push({
      name: USER,
      coins: coinsCollected,
      mesh: playerRoot
    });

    // Add others
    Object.keys(otherPlayers).forEach(name => {
      const p = otherPlayers[name];
      if (!p.mesh) return;
      scoreList.push({
        name,
        coins: p.coins || 0,
        mesh: p.mesh
      });
    });

    // Sort correct order
    scoreList.sort((a, b) => b.coins - a.coins);

    // Apply rank numbers to correct player mesh
    scoreList.forEach((entry, index) => {
      if (!entry.mesh.rankLabel) return;
      entry.mesh.rankLabel.innerHTML = `#${index+1} ${entry.name}`;
    });

  
}

let teamScore = coinsCollected;
for (const name in otherPlayers) teamScore += otherPlayers[name].coins || 0;
document.getElementById("teamScore").textContent = `TEAM SCORE: ${teamScore}`;




  // Lose condition (very simple)
  if (health <= 0) {
    //textContent = "💀 You were caught! Reload the page to retry.";
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    return; // stop updating
    
  }

  // Camera follow
  const lookHeight = 1.3;
  const target = playerRoot.position.clone().add(new THREE.Vector3(0, lookHeight, 0));
  const camDist = 8;
  const camHeight = 3;
  const camOffset = new THREE.Vector3(
    Math.sin(camYaw) * Math.cos(camPitch) * camDist,
    Math.sin(camPitch) * camDist + camHeight,
    Math.cos(camYaw) * Math.cos(camPitch) * camDist
  );
  const desiredCamPos = target.clone().sub(camOffset);
  camera.position.lerp(desiredCamPos, 0.12);
  camera.lookAt(target);

  // Debug HUD
  const p1 = (powerUpActive ? `⭐ ${powerUpTimer.toFixed(0)}s` : ``);
  const tags = [];
  if (speedBoostTimer>0) tags.push(`⚡`);
  if (shieldTimer>0) tags.push(`🛡️`);
  if (magnetTimer>0) tags.push(`🧲`);
  if (highJumpTimer>0) tags.push(`🦘`);
  const tagStr = tags.join(" ");
  //debug.textContent = `🪙 ${coinsCollected}   ${p1} ${tagStr}`;
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera); // <-- THIS MAKES HP VISIBLE

    requestAnimationFrame(loop);
  }
loop();


addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
