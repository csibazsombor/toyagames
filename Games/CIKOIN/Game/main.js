import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

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
  onValue(ref(db, `rooms/${ROOM}/host`), snap => {
  isHost = (snap.val() === USER);
  console.log("Is Host?", isHost);

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
}

// Function to create a remote player clone of your model
function createRemotePlayer() {
  const grp = new THREE.Group();

  // If your FBX model is loaded → clone
  if (window.originalPlayerModel) {
    const clone = window.originalPlayerModel.clone(true);
    clone.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    grp.add(clone);
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
  onValue(ref(db, `rooms/${ROOM}/players`), snap => {
    const players = snap.val() || {};

    for (const name in players) {
      if (name === USER) continue; // don't create duplicate of yourself

      // Create remote player if not already exists
      if (!otherPlayers[name]) {
        otherPlayers[name] = {
          mesh: createRemotePlayer(),
          x: 0, y: 0, z: 0, rot: 0
        };
      }

      // Store latest network positions
      otherPlayers[name].x = players[name].x;
      otherPlayers[name].y = players[name].y;
      otherPlayers[name].z = players[name].z;
      otherPlayers[name].rot = players[name].rot;
    }
  });
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

// When something loads
loadingManager.onProgress = (url, loaded, total) => {
  let name = url.split('/').pop();

  if (name.endsWith(".fbx")) name = "Character Model";
  else if (name.match(/\.(png|jpg|jpeg)$/i)) name = "Textures";
  else if (name.length > 20) name = "Resources";

  loaderText.textContent = "Loading " + name + "...";
  smoothProgress((loaded / total) * 100);
};

// When loading is fully finished
loadingManager.onLoad = () => {
  const fade = setInterval(() => {
    smoothProgress(100);
    if (displayedProgress > 99.5) {
      clearInterval(fade);
      loadingScreen.style.opacity = "0";
      setTimeout(() => loadingScreen.remove(), 650);
    }
  }, 33);

  // Start the actual game AFTER fade

};

const loader = new FBXLoader(loadingManager);



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

const healthFill = document.getElementById("healthFill");

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);

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

// Cute grid pattern
const grid = new THREE.GridHelper(200, 100, 0xffffff, 0xccffcc);
grid.position.y = 0.02;
grid.material.opacity = 0.3;
grid.material.transparent = true;
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
    new THREE.CylinderGeometry(0.8, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  trunk.position.set(x, 2, z);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);
  
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
  );
  leaves.position.set(x, 5.5, z);
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  scene.add(leaves);
  
  // Add tree collision
  collisionObjects.push({
    mesh: trunk,
    minX: x - 1.5, maxX: x + 1.5,
    minZ: z - 1.5, maxZ: z + 1.5,
    height: 6
  });
}

/* =========================================================
   PICKUPS: COINS + POWERUPS
========================================================= */
const coins = [];
function spawnCoin() {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0xffd700, metalness: 0.8, roughness: 0.2,
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

// Player collision capsule
const PLAYER_RADIUS = 0.5;
const PLAYER_HEIGHT = 1.7;

let model;

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
      if(child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    model = fbx;
    playerRoot.add(model);
        // ✅ Store for cloning remote players
    window.originalPlayerModel = fbx;
  },
  undefined,
  err => console.error("Model load failed:", err)
);

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
    moveVec.set(dx / STICK_MAX_DISTANCE, -dy / STICK_MAX_DISTANCE);
  };
  
  const resetJoystick = () => {
    stick.style.transform = "translate(0px, 0px)";
    stick.style.transition = "transform 0.1s ease-out";
    setTimeout(() => { stick.style.transition = "none"; }, 100);
    moveVec.set(0, 0);
    activeTouch = null;
  };
  
  gp.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if(activeTouch === null && e.touches.length > 0) {
      activeTouch = e.touches[0].identifier;
      updateJoystick(e.touches[0]);
    }
  }, {passive: false});
  
  document.addEventListener("touchmove", (e) => {
    if(activeTouch !== null) {
      for(let i = 0; i < e.touches.length; i++) {
        if(e.touches[i].identifier === activeTouch) {
          e.preventDefault();
          updateJoystick(e.touches[i]);
          break;
        }
      }
    }
  }, {passive: false});
  
  document.addEventListener("touchend", () => { if(activeTouch!==null) resetJoystick(); });
  document.addEventListener("touchcancel", () => { if(activeTouch!==null) resetJoystick(); });

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

// 🚀 Faster player
const WALK_BASE = 210;   // was 80
const RUN_BASE  = 350;   // was 120
let WALK = WALK_BASE;
let RUN  = RUN_BASE;

const ACCEL = 60, DRAG = 0.88;
const GRAVITY = -30;
const JUMP_FORCE = 9;

let stamina = 5, STAMINA_MAX = 5;
const DRAIN = 1.0, REGEN_MOVE = 0.7, REGEN_IDLE = 1.8;

let health = 100; // %
let invulnTimer = 0;

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

// Magnet parameters
const MAGNET_RADIUS = 12;
const MAGNET_PULL   = 12; // units/s toward player


/* =========================================================
   LOOP
========================================================= */
let last = performance.now();

function loop() {
        updateHP();
for (const name in otherPlayers) {
  const p = otherPlayers[name];
  if (!p.mesh) continue;

  // Smooth movement
  p.mesh.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.15);

  // Smooth rotation
const targetQ = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0,1,0), p.rot + MODEL_FACE_ADJUST);
p.mesh.quaternion.slerp(targetQ, 0.15);

}
// Send my position to database
if (ROOM && USER) {
  update(ref(db, `rooms/${ROOM}/players/${USER}`), {
    x: playerRoot.position.x,
    y: playerRoot.position.y,
    z: playerRoot.position.z,
    rot: playerRoot.rotation.y
  });
}

// Smoothly move remote players
for (const name in otherPlayers) {
  const p = otherPlayers[name];
  if (!p.mesh) continue;

  p.mesh.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.18);

  const targetRot = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0,1,0), p.rot);

  p.mesh.quaternion.slerp(targetRot, 0.15);
}

  const now = performance.now();
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

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
    if(dist < 1.3) {
      coin.collected = true;
      coinsCollected++;
      scene.remove(coin.mesh);
      // Re-spawn a coin after a short delay
      setTimeout(spawnCoin, 1200);

      // Tiny sparkle
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

  // Input vectors
  const ix = isMobile ? moveVec.x : (keys.d - keys.a);
  const iy = isMobile ? moveVec.y : (keys.w - keys.s);

  const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right = new THREE.Vector3().crossVectors(up, forward).negate();

  const input = new THREE.Vector3()
    .addScaledVector(right, ix)
    .addScaledVector(forward, iy);

  const moving = input.lengthSq() > 0.0004;
  const sprint = moving && (isMobile || stamina > 0);

  // Effective speeds
  const speedMult = (powerUpActive ? 1.25 : 1) * (speedBoostTimer>0 ? 1.35 : 1);
  const targetSpeed = (sprint ? RUN : WALK) * speedMult;

  // Horizontal movement
  if(moving) {
    input.normalize();
    vel.addScaledVector(input, ACCEL * dt);
    if(vel.length() > targetSpeed) vel.setLength(targetSpeed);
  }
  vel.multiplyScalar(DRAG);

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

  // Ground check
  if(playerRoot.position.y <= 0) {
    playerRoot.position.y = 0;
    verticalVel = 0;
    isGrounded = true;
    hasDoubleJumped = false;
  }

  // Face movement
  if(moving) {
    const yaw = Math.atan2(input.x, input.z);
    playerRoot.quaternion.slerp(
      new THREE.Quaternion().setFromAxisAngle(up, yaw), 
      0.2
    );
  }

  // Stamina
  if(sprint) {
    const drainRate = isMobile ? DRAIN * 0.6 : DRAIN;
    stamina -= drainRate * dt;
  } else if(moving) {
    stamina += REGEN_MOVE * dt;
  } else {
    stamina += REGEN_IDLE * dt;
  }
  stamina = Math.max(0, Math.min(STAMINA_MAX, stamina));
  staminaFill.style.width = `${(stamina/STAMINA_MAX) * 100}%`;
  if(stamina < 1) {
    staminaFill.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
  } else if(stamina < 2.5) {
    staminaFill.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
  } else {
    staminaFill.style.background = "linear-gradient(90deg, #fbbf24, #f59e0b)";
  }



  // Lose condition (very simple)
  if (health <= 0) {
    debug.textContent = "💀 You were caught! Reload the page to retry.";
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
  debug.textContent = `🪙 ${coinsCollected}   ${p1} ${tagStr}`;

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
