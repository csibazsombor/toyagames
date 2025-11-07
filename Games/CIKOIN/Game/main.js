    import * as THREE from "three";
    import { FBXLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/FBXLoader.js";

    /* =========================================================
       BASIC SETUP
    ========================================================= */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0xb0e0f6, 40, 180);

    const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias:true });
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
        color, 
        roughness: 0.6,
        metalness: 0.1
      });
      const box = new THREE.Mesh(geometry, material);
      box.position.set(x, h/2, z);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);
      
      // Add to collision array with bounding box
      collisionObjects.push({
        mesh: box,
        minX: x - w/2,
        maxX: x + w/2,
        minZ: z - d/2,
        maxZ: z + d/2,
        height: h
      });
      
      return box;
    };

    // Create cute colorful obstacles
    addCuteBox(12, 12, 5, 3, 5, 0xff69b4); // Pink
    addCuteBox(-15, -10, 4, 5, 4, 0x9370db); // Purple
    addCuteBox(18, -18, 6, 2.5, 6, 0xffd700); // Gold
    addCuteBox(-22, 15, 5, 4, 5, 0x87ceeb); // Sky blue
    addCuteBox(0, -25, 4, 3, 4, 0xff6347); // Tomato
    addCuteBox(-25, -25, 3, 6, 3, 0x98fb98); // Pale green
    addCuteBox(25, 5, 4, 4, 4, 0xffa500); // Orange

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
        minX: x - 1.5,
        maxX: x + 1.5,
        minZ: z - 1.5,
        maxZ: z + 1.5,
        height: 6
      });
    }

    // Add floating coins
    const coins = [];
    for(let i = 0; i < 15; i++) {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16),
        new THREE.MeshStandardMaterial({ 
          color: 0xffd700,
          metalness: 0.8,
          roughness: 0.2,
          emissive: 0xffaa00,
          emissiveIntensity: 0.3
        })
      );
      coin.position.set(
        (Math.random() - 0.5) * 60,
        1.5 + Math.random() * 2,
        (Math.random() - 0.5) * 60
      );
      coin.rotation.z = Math.PI / 2;
      coin.castShadow = true;
      scene.add(coin);
      coins.push({mesh: coin, collected: false, baseY: coin.position.y});
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
    const loader = new FBXLoader();
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

    if(isMobile) {
      document.getElementById("controls").style.display = "none";
      document.getElementById("jumpBtn").style.display = "flex";
      const gp = document.getElementById("gamepad");
      const stick = document.getElementById("stick");
      gp.style.display = "block";

      const center = {x:100, y:100};
      let isJoystickActive = false;
      
      const local = e => {
        const r = gp.getBoundingClientRect();
        return {x:e.touches[0].clientX - r.left, y:e.touches[0].clientY - r.top};
      };
      
      const moveStick = (x, y) => {
        const dx = x - center.x, dy = y - center.y;
        const max = 80, len = Math.min(Math.hypot(dx, dy), max);
        const a = Math.atan2(dy, dx);
        const sx = Math.cos(a) * len, sy = Math.sin(a) * len;
        stick.style.transform = `translate(${sx}px, ${sy}px)`;
        moveVec.set(sx/max, -sy/max);
      };
      
      const resetStick = () => {
        stick.style.transform = "translate(0px, 0px)";
        moveVec.set(0, 0);
        isJoystickActive = false;
      };
      
      gp.addEventListener("touchstart", e => {
        e.preventDefault();
        isJoystickActive = true;
        const p = local(e);
        moveStick(p.x, p.y);
      }, {passive: false});
      
      gp.addEventListener("touchmove", e => {
        e.preventDefault();
        if(isJoystickActive) {
          const p = local(e);
          moveStick(p.x, p.y);
        }
      }, {passive: false});
      
      gp.addEventListener("touchend", e => {
        e.preventDefault();
        resetStick();
      }, {passive: false});
      
      gp.addEventListener("touchcancel", e => {
        e.preventDefault();
        resetStick();
      }, {passive: false});
      
      // Jump button for mobile
      const jumpBtn = document.getElementById("jumpBtn");
      jumpBtn.addEventListener("touchstart", e => {
        e.preventDefault();
        keys.space = 1;
      });
      jumpBtn.addEventListener("touchend", e => {
        e.preventDefault();
        keys.space = 0;
      });
    }

    /* =========================================================
       CAMERA
    ========================================================= */
    let camYaw = 0, camPitch = -0.3;
    let dragging = false, lastX = 0, lastY = 0;

    addEventListener("mousedown", e => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    
    addEventListener("mouseup", () => dragging = false);
    
    addEventListener("mousemove", e => {
      if(!dragging) return;
      camYaw -= (e.clientX - lastX) * 0.003;
      camPitch -= (e.clientY - lastY) * 0.003;
      camPitch = Math.max(-1.2, Math.min(0.4, camPitch));
      lastX = e.clientX;
      lastY = e.clientY;
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

    addEventListener("touchend", () => {
      isCameraTouch = false;
    });

    /* =========================================================
       COLLISION DETECTION
    ========================================================= */
    function checkCollision(newPos) {
      for(const obj of collisionObjects) {
        // Check if player is colliding with object
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
      // Find closest edge and push player out
      const centerX = (collision.minX + collision.maxX) / 2;
      const centerZ = (collision.minZ + collision.maxZ) / 2;
      
      const dx = pos.x - centerX;
      const dz = pos.z - centerZ;
      
      const overlapX = (collision.maxX - collision.minX) / 2 + PLAYER_RADIUS - Math.abs(dx);
      const overlapZ = (collision.maxZ - collision.minZ) / 2 + PLAYER_RADIUS - Math.abs(dz);
      
      if(overlapX < overlapZ) {
        pos.x += overlapX * Math.sign(dx);
      } else {
        pos.z += overlapZ * Math.sign(dz);
      }
    }

    /* =========================================================
       MOVEMENT + PHYSICS
    ========================================================= */
    const up = new THREE.Vector3(0, 1, 0);
    let vel = new THREE.Vector3();
    let verticalVel = 0;

    const WALK = 5, RUN = 10;
    const ACCEL = 60, DRAG = 0.88;
    const GRAVITY = -28;
    const JUMP_FORCE = 9;

    let stamina = 5, STAMINA_MAX = 5;
    const DRAIN = 1.0, REGEN_MOVE = 0.7, REGEN_IDLE = 1.8;

    let isGrounded = true;
    let jumpRequested = false;
    let coinsCollected = 0;

    const debug = document.getElementById("debug");
    const staminaFill = document.getElementById("staminaFill");

    let last = performance.now();
    
    function loop() {
      const now = performance.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      // Animate coins
      coins.forEach((coin, i) => {
        if(!coin.collected) {
          coin.mesh.rotation.y += dt * 2;
          coin.mesh.position.y = coin.baseY + Math.sin(now * 0.002 + i) * 0.3;
          
          // Check collection
          const dist = playerRoot.position.distanceTo(coin.mesh.position);
          if(dist < 2) {
            coin.collected = true;
            coinsCollected++;
            scene.remove(coin.mesh);
          }
        }
      });

      // Input
      const ix = isMobile ? moveVec.x : (keys.d - keys.a);
      const iy = isMobile ? moveVec.y : (keys.w - keys.s);

      const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
      const right = new THREE.Vector3().crossVectors(up, forward).negate();

      const input = new THREE.Vector3()
        .addScaledVector(right, ix)
        .addScaledVector(forward, iy);
      
      const moving = input.lengthSq() > 0.0004;

      const sprint = moving && (isMobile || stamina > 0);
      const targetSpeed = sprint ? RUN : WALK;

      // Horizontal movement
      if(moving) {
        input.normalize();
        vel.addScaledVector(input, ACCEL * dt);
        if(vel.length() > targetSpeed) vel.setLength(targetSpeed);
      }
      vel.multiplyScalar(DRAG);

      // Jump
      if(keys.space && isGrounded && !jumpRequested) {
        verticalVel = JUMP_FORCE;
        isGrounded = false;
        jumpRequested = true;
      }
      if(!keys.space) jumpRequested = false;

      // Gravity
      verticalVel += GRAVITY * dt;
      
      // Calculate new position
      const newPos = playerRoot.position.clone();
      newPos.addScaledVector(vel, dt);
      newPos.y += verticalVel * dt;

      // Check collisions
      const collision = checkCollision(newPos);
      if(collision) {
        resolveCollision(newPos, collision);
      }

      // Apply position
      playerRoot.position.copy(newPos);

      // Ground check
      if(playerRoot.position.y <= 0) {
        playerRoot.position.y = 0;
        verticalVel = 0;
        isGrounded = true;
      }

      // Rotation
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

      // Debug info
      const speed = vel.length();
      const state = !isGrounded ? "🚀" : (sprint ? "🏃" : (moving ? "🚶" : "🧍"));
      debug.textContent = `${state} Speed: ${speed.toFixed(1)} | ⚡ ${stamina.toFixed(1)} | 🪙 ${coinsCollected}`;

      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    
    loop();

    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });