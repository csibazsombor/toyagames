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
  const playerRoot = new THREE.Group();
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

    // TEAM CARRY sync
    onValue(ref(db, `rooms/${ROOM}/carry`), snap => {
        const data = snap.val() || {};
        for (const name in otherPlayers) {
            const p = otherPlayers[name];
            if (!p.mesh) continue;

            p.isCarrying = data[name]?.carrying || false;
            p.carryingWho = data[name]?.who || null;
        }
    });

    onValue(ref(db, `rooms/${ROOM}/bridge`), snap => {
        const data = snap.val() || {};

        logsPlaced = data.logs || 0;
        bridgeProgress = data.progress || 0;

        if (bridgeProgress >= 100 && !bridgeBuilt) {
            buildBridge();
        }
    });


  }

  }


  /* =========================================================
    BASIC SETUP
  ========================================================= */
  // Collision objects array
  const collisionObjects = [];  
  const loaderText = document.getElementById("loader-text");
  const loaderFill = document.getElementById("loader-fill");
  const loaderPercent = document.getElementById("loader-percent");
  const loadingScreen = document.getElementById("loading-screen");

  // --------------------------------------------
  // CUTE PLACEHOLDER PLAYER (no name collision)
  // --------------------------------------------
  const placeholderGroup = new THREE.Group();

  const placeholderBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.8, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xff69b4 })
  );
  placeholderBody.position.y = 0.9;
  placeholderGroup.add(placeholderBody);

  const placeholderHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffb6c1 })
  );
  placeholderHead.position.y = 1.5;
  placeholderGroup.add(placeholderHead);

  playerRoot.add(placeholderGroup);


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
      
      }});

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
    "💡 Stand on plates together to unlock magic!",
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


  const platforms = [];
  const butterflies = [];

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
      
    });

    // Everyone is in ONE team (Team Friends)
    update(ref(db, `rooms/${ROOM}/players/${USER}`), {
      team: "friends"
    });

  }
  
createPressurePlate(0, 18, "P1");
createPressurePlate(4, 18, "P2");

/* =========================================================
   🌸 CUTE EXPANDED MAP - COMPLETE SETUP 🌸
   
   📍 WHERE TO PLACE THIS CODE:
   Find the line in your main.js that says:
   
   // Add cute trees/cylinders
   for(let i = 0; i < 10; i++) {
   
========================================================= */

/* =========================================================
   GROUND PLANE (Larger)
========================================================= */
const groundSize = 300;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(groundSize, groundSize),
  new THREE.MeshStandardMaterial({ 
    color: 0x90ee90,
    roughness: 0.9
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

/* =========================================================
   🌳 FOREST BIOME (Dense Trees)
========================================================= */
function createTree(x, z, size = 1) {

  // HIGH DETAIL
  const trunkHD = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6 * size, 0.5 * size, 5 * size, 12),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  const leavesHD = new THREE.Mesh(
    new THREE.SphereGeometry(2.5 * size, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
  );
  leavesHD.position.y = 5 * size;

  const hd = new THREE.Group();
  trunkHD.position.y = 2.5 * size;
  leavesHD.position.y = 5.5 * size;
  hd.add(trunkHD, leavesHD);

  // LOW DETAIL (simple shapes)
  const trunkLD = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6 * size, 0.6 * size, 5 * size, 6),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  const leavesLD = new THREE.Mesh(
    new THREE.SphereGeometry(2.5 * size, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
  );
  const ld = new THREE.Group();
  trunkLD.position.y = 2.5 * size;
  leavesLD.position.y = 5.5 * size;
  ld.add(trunkLD, leavesLD);

  const lod = makeLOD([
    { obj: hd, distance: 0 },
    { obj: ld, distance: 30 }  // switches at 30 units
  ]);

  lod.position.set(x, 0, z);
  scene.add(lod);

  collisionObjects.push({
    mesh: lod,
    minX: x - 1.2 * size,
    maxX: x + 1.2 * size,
    minZ: z - 1.2 * size,
    maxZ: z + 1.2 * size,
    height: 6 * size
  });
}


// Dense forest area (top-right quadrant)
for (let i = 0; i < 35; i++) {
  const x = 30 + Math.random() * 70;
  const z = -30 - Math.random() * 70;
  const size = 0.8 + Math.random() * 0.5;
  createTree(x, z, size);
}

/* =========================================================
   🏔️ MOUNTAIN AREA (Rocky Hills)
========================================================= */
function createRock(x, z) {
  const size = 2 + Math.random() * 3;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.9
    })
  );
  rock.position.set(x, size * 0.5, z);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);

  collisionObjects.push({
    mesh: rock,
    minX: x - size,
    maxX: x + size,
    minZ: z - size,
    maxZ: z + size,
    height: size
  });
}

// Mountain cluster (bottom-left)
for (let i = 0; i < 20; i++) {
  const x = -60 - Math.random() * 40;
  const z = 20 + Math.random() * 50;
  createRock(x, z);
}

// =============================================
// UNIVERSAL LOD HELPER
// =============================================
function makeLOD(levels) {
  // levels = [ { obj, distance }, ... ]
  const lod = new THREE.LOD();
  levels.forEach(l => lod.addLevel(l.obj, l.distance));
  return lod;
}

/* =========================================================
   🌊 POND AREA (Water Feature)
========================================================= */
const pond = new THREE.Mesh(
  new THREE.CircleGeometry(12, 32),
  new THREE.MeshStandardMaterial({
    color: 0x4a90e2,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.3
  })
);
pond.rotation.x = -Math.PI / 2;
pond.position.set(-40, 0.05, -40);
pond.receiveShadow = true;
scene.add(pond);

// Lily pads
for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2;
  const radius = 5 + Math.random() * 5;
  const lily = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x90ee90 })
  );
  lily.rotation.x = -Math.PI / 2;
  lily.position.set(
    -40 + Math.cos(angle) * radius,
    0.08,
    -40 + Math.sin(angle) * radius
  );
  lily.castShadow = true;
  scene.add(lily);
}

/* =========================================================
   🌺 FLOWER GARDEN (Colorful Area)
========================================================= */
const gardenCenter = { x: 50, z: 40 };

for (let i = 0; i < 30; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 20;
  const x = gardenCenter.x + Math.cos(angle) * radius;
  const z = gardenCenter.z + Math.sin(angle) * radius;

  const colors = [0xff69b4, 0xffd700, 0xff6347, 0x9370db, 0x00ced1];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const flowerDeco = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  flowerDeco.position.set(x, 0.3, z);
  flowerDeco.castShadow = true;
  scene.add(flowerDeco);
}

/* =========================================================
   🦋 BUTTERFLIES (Animated)
========================================================= */
function createButterfly(x, y, z) {
  const butterfly = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.08, 0.3, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c1810 })
  );
  butterfly.add(body);

  // Wings
  const wingGeo = new THREE.CircleGeometry(0.4, 8);
  const wingColors = [0xff69b4, 0xffd700, 0x9370db, 0x00ced1];
  const wingColor = wingColors[Math.floor(Math.random() * wingColors.length)];

  const leftWing = new THREE.Mesh(
    wingGeo,
    new THREE.MeshStandardMaterial({ 
      color: wingColor,
      side: THREE.DoubleSide
    })
  );
  leftWing.position.set(-0.25, 0, 0);
  leftWing.rotation.y = Math.PI / 6;
  butterfly.add(leftWing);

  const rightWing = new THREE.Mesh(
    wingGeo,
    new THREE.MeshStandardMaterial({ 
      color: wingColor,
      side: THREE.DoubleSide
    })
  );
  rightWing.position.set(0.25, 0, 0);
  rightWing.rotation.y = -Math.PI / 6;
  butterfly.add(rightWing);

  butterfly.position.set(x, y, z);
  scene.add(butterfly);

  return {
    group: butterfly,
    leftWing,
    rightWing,
    speed: 2 + Math.random() * 3,
    time: Math.random() * 100,
    baseY: y,
    pathRadius: 5 + Math.random() * 10,
    centerX: x,
    centerZ: z
  };
}

// Spawn butterflies around the map
for (let i = 0; i < 15; i++) {
  const x = (Math.random() - 0.5) * 200;
  const y = 2 + Math.random() * 4;
  const z = (Math.random() - 0.5) * 200;
  butterflies.push(createButterfly(x, y, z));
}

/* =========================================================
   🏛️ RUINS AREA (Ancient Structures)
========================================================= */
function createPillar(x, z) {
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.9, 6, 8),
    new THREE.MeshStandardMaterial({ 
      color: 0xd3d3d3,
      roughness: 0.9
    })
  );
  pillar.position.set(x, 3, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);

  collisionObjects.push({
    mesh: pillar,
    minX: x - 1,
    maxX: x + 1,
    minZ: z - 1,
    maxZ: z + 1,
    height: 6
  });
}

// Ancient ruins (top-left)
const ruinsPattern = [
  [-60, -60], [-50, -60], [-60, -50], [-50, -50],
  [-55, -65], [-55, -45], [-65, -55], [-45, -55]
];
ruinsPattern.forEach(([x, z]) => createPillar(x, z));

/* =========================================================
   🏰 CASTLE STRUCTURE (Central Landmark)
========================================================= */
function createCastle() {
  const castle = new THREE.Group();

  // Main tower
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 6, 15, 8),
    new THREE.MeshStandardMaterial({ color: 0xc0c0c0 })
  );
  tower.position.y = 7.5;
  tower.castShadow = true;
  castle.add(tower);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(6, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b0000 })
  );
  roof.position.y = 16;
  roof.castShadow = true;
  castle.add(roof);

  // Side towers
  [-8, 8].forEach(offset => {
    const sideTower = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3.5, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xc0c0c0 })
    );
    sideTower.position.set(offset, 5, 0);
    sideTower.castShadow = true;
    castle.add(sideTower);

    const sideRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b0000 })
    );
    sideRoof.position.set(offset, 11, 0);
    sideRoof.castShadow = true;
    castle.add(sideRoof);
  });

  castle.position.set(0, 0, 0);
  scene.add(castle);

  // Collision for castle
  collisionObjects.push({
    mesh: tower,
    minX: -10,
    maxX: 10,
    minZ: -10,
    maxZ: 10,
    height: 15
  });
}

createCastle();

  let lastSentPos = new THREE.Vector3();
  let lastSentRot = 0;

// SAFE SPAWN OUTSIDE CASTLE (castle covers -10 → +10)
const SAFE_SPAWN = new THREE.Vector3(-25, 0.05, -25);

// Apply spawn
playerRoot.position.copy(SAFE_SPAWN);

// Sync to Firebase
if (ROOM && USER) {
  update(ref(db, `rooms/${ROOM}/players/${USER}`), {
    x: SAFE_SPAWN.x,
    y: SAFE_SPAWN.y,
    z: SAFE_SPAWN.z,
    rot: 0
  });
}

// Prevent first network sync from snap-back
lastSentPos.copy(SAFE_SPAWN);
lastSentRot = 0;


/* =========================================================
   🎪 CARNIVAL AREA (Fun Zone)
========================================================= */
function createTent(x, z, color) {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  base.position.set(x, 0.25, z);
  base.castShadow = true;
  scene.add(base);

  const tent = new THREE.Mesh(
    new THREE.ConeGeometry(4, 6, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  tent.position.set(x, 4, z);
  tent.castShadow = true;
  scene.add(tent);

  collisionObjects.push({
    mesh: base,
    minX: x - 4,
    maxX: x + 4,
    minZ: z - 4,
    maxZ: z + 4,
    height: 6
  });
}

createTent(70, -70, 0xff1493);
createTent(60, -80, 0x9370db);
createTent(80, -80, 0xffd700);

/* =========================================================
   🌲 PINE FOREST (Different Tree Type)
========================================================= */
function createPineTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a2511 })
  );
  trunk.position.set(x, 2, z);
  trunk.castShadow = true;
  scene.add(trunk);

  // Layered pine leaves
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2 - i * 0.4, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x0f5f1a })
    );
    cone.position.set(x, 4 + i * 1.5, z);
    cone.castShadow = true;
    scene.add(cone);
  }

  collisionObjects.push({
    mesh: trunk,
    minX: x - 1,
    maxX: x + 1,
    minZ: z - 1,
    maxZ: z + 1,
    height: 7
  });
}

// Pine forest (bottom-right)
for (let i = 0; i < 25; i++) {
  const x = 40 + Math.random() * 50;
  const z = 40 + Math.random() * 50;
  createPineTree(x, z);
}

/* =========================================================
   🌟 FLOATING PLATFORMS
========================================================= */
function createFloatingPlatform(x, y, z, size = 4) {
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(size, size, 0.5, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.3
    })
  );
  platform.position.set(x, y, z);
  platform.castShadow = true;
  platform.receiveShadow = true;
  scene.add(platform);

  platforms.push({
    mesh: platform,
    baseY: y,
    time: Math.random() * 100
  });
}

createFloatingPlatform(20, 3, 20, 3);
createFloatingPlatform(-20, 4, -20, 3);
createFloatingPlatform(30, 5, -30, 2.5);
createFloatingPlatform(-30, 3.5, 30, 3.5);

/* =========================================================
   🎨 DECORATIVE ELEMENTS
========================================================= */

// Lanterns around the map
function createLantern(x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c1810 })
  );
  pole.position.set(x, 2, z);
  pole.castShadow = true;
  scene.add(pole);

  const lantern = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.8, 0.6),
    new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      emissive: 0xff6600,
      emissiveIntensity: 0.5
    })
  );
  lantern.position.set(x, 4.2, z);
  scene.add(lantern);

  const light = new THREE.PointLight(0xffa500, 0.8, 10);
  light.position.set(x, 4.2, z);
  scene.add(light);
}

// Place lanterns strategically
const lanternPositions = [
  [15, 15], [-15, 15], [15, -15], [-15, -15],
  [40, 0], [-40, 0], [0, 40], [0, -40]
];
lanternPositions.forEach(([x, z]) => createLantern(x, z));

// Bushes
function createBush(x, z) {
  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
  );
  bush.position.set(x, 0.5, z);
  bush.scale.set(1, 0.6, 1);
  bush.castShadow = true;
  scene.add(bush);
}

for (let i = 0; i < 40; i++) {
  const x = (Math.random() - 0.5) * 250;
  const z = (Math.random() - 0.5) * 250;
  createBush(x, z);
}

/* =========================================================
   ✨ ANIMATION FUNCTIONS
   
   📍 ADD THESE TO YOUR MAIN GAME LOOP
   Find the line: function loop() {
   Then add these calls inside that function (after dt calculation):
   
   // Animate butterflies
   butterflies.forEach(b => {
     b.time += dt * b.speed;
     const angle = b.time * 0.5;
     b.group.position.x = b.centerX + Math.cos(angle) * b.pathRadius;
     b.group.position.z = b.centerZ + Math.sin(angle) * b.pathRadius;
     b.group.position.y = b.baseY + Math.sin(b.time * 2) * 0.5;
     const flap = Math.sin(now * 0.01 + b.time) * 0.4;
     b.leftWing.rotation.y = Math.PI / 6 + flap;
     b.rightWing.rotation.y = -Math.PI / 6 - flap;
     b.group.rotation.y = angle + Math.PI / 2;
   });
   
   // Animate platforms
   platforms.forEach(p => {
     p.time += dt;
     p.mesh.position.y = p.baseY + Math.sin(p.time * 0.8) * 0.4;
     p.mesh.rotation.y += dt * 0.3;
   });
========================================================= */

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



  const gridColor = 0xffffff; 
  const fadeColor = 0xccffcc; 

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
  const portalGroup = createPortal(2, 25);

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
  const particles = [];
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
// Current issue: Can double jump infinitely if powerup timer resets
// Fix:
let canDoubleJump = false;
  let hasDoubleJumped = false;
// When picking up powerup:
canDoubleJump = true;
let isGrounded = true;
// In jump logic:
if (!isGrounded && canDoubleJump && !hasDoubleJumped) {
  verticalVel = JUMP_FORCE * 0.9;
  hasDoubleJumped = true;
  canDoubleJump = false; // Consume double jump
}  
let powerUpTimer = 0;
// Reset on ground:
if (isGrounded) {
  hasDoubleJumped = false;
  if (powerUpTimer > 0) canDoubleJump = true;
}
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
// Expand the cat adoption feature:
let myPet = null;

function spawnPet(type) {
  const pet = new THREE.Group();
  
  // Cat body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.4, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xff9966 })
  );
  pet.add(body);
  
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25),
    new THREE.MeshStandardMaterial({ color: 0xff9966 })
  );
  head.position.set(0, 0.3, 0.5);
  pet.add(head);
  
  // Ears
  const ear1 = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.2, 3),
    new THREE.MeshStandardMaterial({ color: 0xff9966 })
  );
  ear1.position.set(-0.15, 0.45, 0.5);
  pet.add(ear1);
  
  const ear2 = ear1.clone();
  ear2.position.x = 0.15;
  pet.add(ear2);
  
  scene.add(pet);
  myPet = { mesh: pet, followDist: 3 };
}

// In loop, make pet follow:
if (myPet) {
  const target = playerRoot.position.clone();
  target.y = 0;
  
  const dist = myPet.mesh.position.distanceTo(target);
  
  if (dist > myPet.followDist) {
    const dir = target.clone().sub(myPet.mesh.position).normalize();
    myPet.mesh.position.addScaledVector(dir, 4 * dt);
    
    // Face player
    myPet.mesh.lookAt(target);
  }
  
  // Bounce animation
  myPet.mesh.position.y = 0.2 + Math.sin(now * 0.005) * 0.1;
}
  /* =========================================================
    PLAYER
  ========================================================= */
  scene.add(playerRoot);


// === CO-OP LOG / BRIDGE SYSTEM ===
let bridgeLogs = [];
let logsPlaced = 0;
let bridgeBuilt = false;
let isCarryingLog = false;
let carryingLogObj = null;

const LOGS_NEEDED = 5;
const bridgeSpot = new THREE.Vector3(10, 0, -10);

// Mobile button
let mobilePickupBtn = document.getElementById("pickupLogBtn");

// ✨ Waypoint Indicator
const waypointGroup = new THREE.Group();
waypointGroup.visible = false;

const wpRing = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 2, 32),
    new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    })
);
wpRing.rotation.x = -Math.PI / 2;
waypointGroup.add(wpRing);

const wpPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 2.5, 16),
    new THREE.MeshBasicMaterial({
        color: 0xffdd88,
        transparent: true,
        opacity: 0.85
    })
);
wpPillar.position.y = 1.3;
waypointGroup.add(wpPillar);

waypointGroup.position.copy(bridgeSpot);
scene.add(waypointGroup);


// === Animate waypoint ===
function updateWaypoint() {
    if (!waypointGroup.visible) return;

    const t = performance.now() * 0.003;

    wpPillar.position.y = 1.3 + Math.sin(t) * 0.25;
    wpRing.material.opacity = 0.7 + Math.sin(t * 1.6) * 0.3;
}


// === Spawn logs near trees ===
function spawnBridgeLogsUnderTrees() {
    const logsToSpawn = 5;
    const treePositions = [];

    scene.traverse(obj => {
        if (obj.isMesh &&
            obj.geometry.type === "CylinderGeometry" &&
            obj.material.color.getHex() === 0x8b4513) 
        {
            treePositions.push(obj.position.clone());
        }
    });

    for (let i = 0; i < logsToSpawn; i++) {
        if (treePositions.length === 0) break;

        const idx = Math.floor(Math.random() * treePositions.length);
        const base = treePositions[idx];
        treePositions.splice(idx, 1);

        const angle = Math.random() * Math.PI * 2;
        const dist = 2 + Math.random();

        const pos = new THREE.Vector3(
            base.x + Math.cos(angle) * dist,
            0.35,
            base.z + Math.sin(angle) * dist
        );

        const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 2.5, 12),
            new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
        );
        log.rotation.z = Math.PI / 2;
        log.position.copy(pos);
        log.castShadow = true;

        scene.add(log);
        bridgeLogs.push({ id: "LOG" + i, mesh: log, carried: false });
    }
}


// === FIXED SINGLE VERSION ===

function pickUpLog(log) {
    isCarryingLog = true;
    carryingLogObj = log;
    log.carried = true;
    log.mesh.visible = false;
    waypointGroup.visible = true;
    showAnnouncement("🪵 Carry the log to the glowing marker!");
}

function checkLogDropOff() {
    if (!isCarryingLog || !carryingLogObj) return;

    const d = playerRoot.position.distanceTo(bridgeSpot);
    if (d < 2) {

        isCarryingLog = false;
        waypointGroup.visible = false;

        logsPlaced++;

        update(ref(db, `rooms/${ROOM}/bridge`), {
            logs: logsPlaced,
            progress: Math.min(100, logsPlaced / LOGS_NEEDED * 100)
        });

        showAnnouncement(`🪵 Delivered! (${logsPlaced}/${LOGS_NEEDED})`);

        if (logsPlaced >= LOGS_NEEDED && !bridgeBuilt) {
            buildBridge();
        }
    }
}


// === INTERACTION HANDLER (PC + MOBILE) ===
function updateLogInteraction() {
    let nearest = null;
    let distMin = 999;

    bridgeLogs.forEach(log => {
        if (log.carried) return;

        const d = playerRoot.position.distanceTo(log.mesh.position);
        if (d < distMin) {
            distMin = d;
            nearest = log;
        }
    });

    // Mobile button
    if (isMobile && nearest && distMin < 1.6 && !isCarryingLog) {
        mobilePickupBtn.style.display = "block";
        mobilePickupBtn.dataset.id = nearest.id;
    } else {
        mobilePickupBtn.style.display = "none";
    }

    // PC pickup
    if (!isMobile && nearest && distMin < 1.6 && keys.f && !isCarryingLog) {
        pickUpLog(nearest);
    }
}


// === MOBILE BUTTON HANDLER ===
mobilePickupBtn.onclick = () => {
    const id = mobilePickupBtn.dataset.id;
    const log = bridgeLogs.find(l => l.id === id);
    if (log) pickUpLog(log);
};

// --- MARKERS ---
const markAPos = markA.position.clone();
const markBPos = markB.position.clone();
// TEAMWORK HOUSE BUILDING
const nearA = playerRoot.position.distanceTo(markAPos) < 1.3;
const friendNearB = isFriendNear(markBPos);

if (nearA && friendNearB && !houseBuilt) {
    buildProgress += dt * 15; // teamwork speed
    if (ROOM) update(ref(db, `rooms/${ROOM}/build`), { progress: buildProgress });
}

if (buildProgress >= 100 && !houseBuilt) {
    buildHouse();
}




// === BUILD BRIDGE ===
function buildBridge() {
    bridgeBuilt = true;

    const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.4, 3),
        new THREE.MeshStandardMaterial({
            color: 0xb37a3c,
            emissive: 0x6a3f1b,
            emissiveIntensity: 0.25
        })
    );
    bridge.position.copy(bridgeSpot);
    bridge.position.y = 0.15;

    scene.add(bridge);
    showAnnouncement("🌉 Bridge completed! Teamwork!!");
}

spawnBridgeLogsUnderTrees();

  if (nearA && friendNearB) {
    buildProgress += dt * 10; // teamwork = faster
    showAnnouncement("🏗 Building together!");
  }

  if (buildProgress >= 100) {
    buildProgress = 100;
    buildHouse();
  
  }
/* =========================================================
   TEAMWORK FIXED CORE
========================================================= */

// --- TEAMWORK HOUSE BUILD ---
function isFriendNear(pos, range = 1.3) {
    for (const name in otherPlayers) {
        const p = otherPlayers[name];
        if (!p.mesh) continue;
        if (p.mesh.position.distanceTo(pos) < range) return true;
    }
    return false;
}


// --- UNIQUE buildHouse() ---
function buildHouse() {
    if (houseBuilt) return;
    houseBuilt = true;

    showAnnouncement("🏡 Home Built Together!");

    const home = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(6, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0xffe0c8 })
    );
    base.position.y = 2;
    home.add(base);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4.8, 3.3, 4),
        new THREE.MeshStandardMaterial({ color: 0xc2544f })
    );
    roof.position.y = 5;
    roof.rotation.y = Math.PI / 4;
    home.add(roof);

    home.position.set(80, 0, -55);
    cozyGroup.add(home);

    // Sync to DB
    if (ROOM) update(ref(db, `rooms/${ROOM}/build`), { progress: 100 });
}

// --- FIXED lever puzzle sync ---
function setLever(id, value) {
    if (!ROOM) return;
    update(ref(db, `rooms/${ROOM}/levers`), { [id]: value });
}

// Listen from DB
onValue(ref(db, `rooms/${ROOM}/levers`), snap => {
    const d = snap.val() || {};

    const A = d.A || false;
    const B = d.B || false;

    if (A && B) {
        teamworkGate.position.y = 2; // fully open
    }
});

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
  const keys = { w:0, a:0, s:0, d:0, space:0, f:0, e:0 };

  addEventListener("keydown", e => { 
      const k = e.key.toLowerCase();
      if(k in keys) keys[k] = 1;
  });
  addEventListener("keyup", e => { 
      const k = e.key.toLowerCase();
      if(k in keys) keys[k] = 0;
  });

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
  
// TEAMWORK LEVERS
if (keys.e) {
    if (playerRoot.position.distanceTo(leverA.position) < 1.5) {
        setLever("A", true);
    }
    if (playerRoot.position.distanceTo(leverB.position) < 1.5) {
        setLever("B", true);
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


  let jumpRequested = false;
  let coinsCollected = 0;

  // Powerup state
  let powerUpActive = false;

  let doubleJumpAvailable = false;


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
// SPAWN COIN
document.getElementById("spawnCoinBtn").onclick = () => {
    push(ref(db, `rooms/${ROOM}/events`), { type: "spawnCoin" });
};

// BOOST COINS (x2 for 20 seconds)
document.getElementById("boostBtn").onclick = () => {
    push(ref(db, `rooms/${ROOM}/events`), { type: "coinBoost", duration: 20000 });
};

// SEND MESSAGE
document.getElementById("msgBtn").onclick = () => {
    const text = prompt("Message:");
    if (!text) return;
    push(ref(db, `rooms/${ROOM}/events`), { type: "message", text });
};

// WIPE ALL COINS
document.getElementById("removeCoinsBtn").onclick = () => {
    set(ref(db, `rooms/${ROOM}/players`), {});
    showAnnouncement("🧹 All coins wiped!");
};

// RESET FLOWERS
document.getElementById("resetFlowersBtn").onclick = () => {
    set(ref(db, `rooms/${ROOM}/flowers`), null);
    showAnnouncement("🌸 Flowers reset!");
};

// RESET CHESTS
document.getElementById("resetChestsBtn").onclick = () => {
    set(ref(db, `rooms/${ROOM}/chests`), null);
    showAnnouncement("📦 Chests reset!");
};

// FORCE PORTAL OPEN
document.getElementById("forcePortalBtn").onclick = () => {
    set(ref(db, `rooms/${ROOM}/puzzles/solved`), true);
    showAnnouncement("🌀 Portal opened!");
};

// UNLOCK VILLAGE
document.getElementById("unlockVillageBtn").onclick = () => {
    set(ref(db, `rooms/${ROOM}/villageUnlocked`), true);
    showAnnouncement("🏡 Village unlocked!");
};

// TELEPORT EVERYONE TO VILLAGE
document.getElementById("tpVillageBtn").onclick = () => {
    push(ref(db, `rooms/${ROOM}/events`), { type: "teleportVillage" });
};

// CLEAR ALL EVENTS
document.getElementById("clearEventsBtn").onclick = () => {
    set(ref(db, `rooms/${ROOM}/events`), null);
    showAnnouncement("🧹 Events cleared!");
};

    
// ===============================
// ADMIN PANEL – CLEAN FINAL CODE
// ===============================

// Panel reference
const adminPanel = document.getElementById("adminPanel");
adminPanel.style.display = "none";   // hidden by default

// Unlock admin by password
window.unlockAdmin = function(password) {
    const SECRET = "3549151";  // your admin password

    if (password !== SECRET) {
        console.warn("❌ Wrong admin password");
        return;
    }

    console.log("✔ Admin unlocked!");
    isHost = true;

    // Save to Firebase (optional)
    if (ROOM) set(ref(db, `rooms/${ROOM}/host`), USER);

    // Show panel immediately
    adminPanel.style.display = "block";
};

// Toggle panel with ENTER key
addEventListener("keydown", e => {
    if (e.key === "Enter" && isHost) {
        adminPanel.style.display =
            adminPanel.style.display === "none" ? "block" : "none";
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


// Replace existing mushroom check:
mushrooms.forEach(m => {
  const dist = playerRoot.position.distanceTo(m.pos);
  if (dist < 1.6 && isGrounded) {
    verticalVel = 28;
    isGrounded = false;
    
    // 🔥 Squash animation (already good)
    m.cap.scale.set(1.3, 0.5, 1.3);
    
    // 🔥 NEW: Particle burst
    for (let i = 0; i < 12; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.12),
        new THREE.MeshBasicMaterial({ 
          color: 0xff69b4,
          transparent: true,
          opacity: 0.8
        })
      );
      
      const angle = (i / 12) * Math.PI * 2;
      particle.position.copy(m.pos);
      particle.userData.vel = new THREE.Vector3(
        Math.cos(angle) * 5,
        Math.random() * 3 + 2,
        Math.sin(angle) * 5
      );
      
      scene.add(particle);
      particles.push(particle); // Track for animation
    }
    
    setTimeout(() => {
      m.cap.scale.set(1, 1, 1);
    }, 150);
  }
});

// In loop, animate particles:
particles.forEach((p, i) => {
  p.position.add(p.userData.vel.clone().multiplyScalar(dt));
  p.userData.vel.y -= 9.8 * dt; // gravity
  p.material.opacity -= dt * 2;
  
  if (p.material.opacity <= 0) {
    scene.remove(p);
    p.geometry.dispose();
    p.material.dispose();
    particles.splice(i, 1);
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

      function buildBridge() {
          if (bridgeBuilt) return;
          bridgeBuilt = true;
      
          const bridge = new THREE.Mesh(
              new THREE.BoxGeometry(6, 0.4, 2.5),
              new THREE.MeshStandardMaterial({ color: 0xb37a3c })
          );
          bridge.position.copy(bridgeSpot);
          bridge.position.y = 0.15;
          bridge.castShadow = true;
        
          scene.add(bridge);
        
          showAnnouncement("🌉 Bridge Built Together!");
      }
      
      updateLogInteraction();
      checkLogDropOff();
      updateWaypoint();

    
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
   // Animate butterflies
   butterflies.forEach(b => {
     b.time += dt * b.speed;
     const angle = b.time * 0.5;
     b.group.position.x = b.centerX + Math.cos(angle) * b.pathRadius;
     b.group.position.z = b.centerZ + Math.sin(angle) * b.pathRadius;
     b.group.position.y = b.baseY + Math.sin(b.time * 2) * 0.5;
     const flap = Math.sin(now * 0.01 + b.time) * 0.4;
     b.leftWing.rotation.y = Math.PI / 6 + flap;
     b.rightWing.rotation.y = -Math.PI / 6 - flap;
     b.group.rotation.y = angle + Math.PI / 2;
   });
   
   // Animate platforms
   platforms.forEach(p => {
     p.time += dt;
     p.mesh.position.y = p.baseY + Math.sin(p.time * 0.8) * 0.4;
     p.mesh.rotation.y += dt * 0.3;
   });

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
// Database tracks "carry" but logic is incomplete
// Add this to your loop:

let carryingPlayer = null;
let beingCarried = false;

function updateCarrySystem() {
  if (keys.c && !beingCarried) { // C to pick up teammate
    for (const name in otherPlayers) {
      const p = otherPlayers[name];
      const dist = playerRoot.position.distanceTo(p.mesh.position);
      
      if (dist < 2 && !p.isCarrying) {
        carryingPlayer = name;
        
        // Sync to Firebase
        update(ref(db, `rooms/${ROOM}/carry/${USER}`), {
          carrying: true,
          who: name
        });
        
        showAnnouncement(`🤝 Carrying ${name}!`);
        break;
      }
    }
  }
  
  // Release with X
  if (keys.x && carryingPlayer) {
    carryingPlayer = null;
    update(ref(db, `rooms/${ROOM}/carry/${USER}`), { carrying: false });
  }
  
  // Visual: Attach carried player to carrier
  for (const name in otherPlayers) {
    const p = otherPlayers[name];
    if (p.carryingWho === USER) {
      beingCarried = true;
      playerRoot.position.copy(p.mesh.position);
      playerRoot.position.y += 2;
      vel.set(0, 0, 0); // Can't move while carried
    }
  }
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

// Add cleanup when player leaves:
for (const name in otherPlayers) {
  if (name !== USER && !players[name]) {
    const p = otherPlayers[name];
    scene.remove(p.mesh);
    
    // 🔥 NEW: Dispose label
    if (p.mesh.rankLabel) {
      p.mesh.rankLabel.remove();
    }
    
    delete otherPlayers[name];
  }
}
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
