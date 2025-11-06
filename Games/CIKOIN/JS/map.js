/****************************************************
 *  CIKOIN MAP (FULL) • SHOP + INVENTORY + HP BAR
 *  Game-style avatars • Wide spacing • Live coins/HP
 ****************************************************/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase, ref, onValue, get, update, runTransaction
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

/* ================================
   CONFIG
================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAw2Z3KybdR_CJQ1e2_HnHAgKqC1WWxCRk",
  authDomain: "cikoin-firebase.firebaseapp.com",
  projectId: "cikoin-firebase",
  storageBucket: "cikoin-firebase.appspot.com",
  messagingSenderId: "929922401033",
  appId: "1:929922401033:web:46b70907bd41748459c9d8",
  measurementId: "G-74S2WKXHLH",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================================
   CONSTANTS / ASSETS
================================ */
const DEFAULT_COINS = 150;

const TEAM_COLORS = {
  red: "#ff4d4d",
  blue: "#4d79ff",
  green: "#3ccf7e",
  yellow: "#ffd84d",
};

const CHARACTER_IMAGES = {
  ciko: "Characters/ciko.png",
  cloe: "Characters/cloe.png",
  "pici catto": "Characters/pici-catto.png",
  default: "Characters/ciko.png",
};

const COSMETIC_IMAGES = {
  party_hat: "Shop/hat.png",
};

const SHOP_ITEMS = [
  { id: "hp_potion",   name: "Health Potion", price: 50,  desc: "Restore 20 HP",    img: "Shop/health.png", type: "consumable" },
  { id: "speed_boost", name: "Speed Boost",   price: 80,  desc: "Run fast • 10s",   img: "Shop/speed.png",  type: "consumable" },
  { id: "party_hat",   name: "Party Hat",     price: 120, desc: "Cute cosmetic",    img: "Shop/hat.png",    type: "cosmetic"   },
  { id: "cookie",      name: "Cookie",        price: 30,  desc: "Happy buff • 5s",  img: "Shop/cookie.png", type: "consumable" },
];

const EFFECT_DURATIONS = {
  speed_boost: 10000,
};

/* ================================
   HELPERS
================================ */
function now() { return Date.now(); }
function vibrate(ms = 25) { try { navigator.vibrate?.(ms); } catch {} }
function beep(duration = 60, freq = 800, vol = 0.04) {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination); o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, duration);
  } catch {}
}

async function ensureDefaultFields(roomCode, username) {
  const pRef = ref(db, `rooms/${roomCode}/players/${username}`);
  const snap = await get(pRef);
  if (!snap.exists()) return;
  const cur = snap.val() || {};
  const patch = {};
  if (cur.coins == null) patch.coins = DEFAULT_COINS;
  if (!Array.isArray(cur.inventory)) patch.inventory = [];
  if (typeof cur.effects !== "object" || cur.effects === null) patch.effects = {};
  if (typeof cur.equipped !== "object" || cur.equipped === null) patch.equipped = {};
  if (cur.hp == null) patch.hp = 100;
  if (cur.maxhp == null) patch.maxhp = 100;
  if (Object.keys(patch).length) await update(pRef, patch);
}

/* ================================
   STYLES (ONCE)
================================ */
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes floatIdle {0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}}
    @keyframes birdFly {0%{transform:translateX(120vw)}100%{transform:translateX(-20vw)}}
    @keyframes twinkle {0%,100%{opacity:.2}50%{opacity:1}}

    .player-card { background:rgba(255,255,255,.9); padding:10px; border-radius:14px; min-width:150px;
      display:flex;flex-direction:column;align-items:center;gap:8px; box-shadow:0 8px 24px rgba(0,0,0,.12); position:relative; }

    /* Game-style avatar */
    .avatar{
      width:120px;height:140px;position:relative;display:flex;justify-content:center;align-items:flex-end;overflow:visible;
      animation:floatIdle 2s ease-in-out infinite;
    }
    .avatar img{width:100px;height:auto;object-fit:contain;image-rendering:pixelated;}
    .avatar:after{content:"";position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:55px;height:12px;
      background:rgba(0,0,0,0.25);border-radius:50%;filter:blur(2px);}
    .avatar .cosmetic{position:absolute;width:70px;height:auto;top:-26px;left:50%;transform:translateX(-50%);pointer-events:none;image-rendering:pixelated;}

    .name-tag{font-weight:800;font-size:14px;}
    .team-pill{padding:4px 10px;border-radius:999px;font-weight:900;font-size:12px;border:2px solid transparent;}
    .small-muted{font-size:12px;color:#555;}
    .badges{display:flex;gap:6px;position:absolute;top:-10px;right:-10px;}
    .badge{font-size:10px;background:#222;color:#fff;border-radius:999px;padding:2px 6px;opacity:.9}

    .shop-button{position:fixed;right:26px;bottom:26px;background:#ffce52;padding:14px 18px;border:none;border-radius:14px;
      font-weight:900;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.2);z-index:2001;}

    .panel{position:fixed;right:26px;bottom:86px;width:380px;max-width:calc(100vw - 50px);
      background:#fff;border-radius:14px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);
      display:none;flex-direction:column;gap:12px;z-index:2000;}

    .panel-header{display:flex;justify-content:space-between;align-items:center;}
    .coins-badge{background:#ffe68a;padding:6px 10px;border-radius:999px;font-weight:900;}

    .tabs{display:flex;gap:8px;}
    .tab{padding:8px 10px;border-radius:10px;background:#eee;cursor:pointer;font-weight:800;}
    .tab.active{background:#222;color:#fff;}

    .shop-items{display:flex;flex-direction:column;gap:10px;max-height:320px;overflow:auto;padding-right:6px;}
    .shop-item{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;}
    .shop-item:hover{background:#f3f3f3;}
    .shop-buy{margin-left:auto;background:#3b82f6;color:white;border:none;border-radius:10px;padding:8px 12px;font-weight:900;}

    .inv-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-height:320px;overflow:auto;padding-right:6px;}
    .inv-slot{border:1px dashed #ccc;border-radius:10px;padding:6px;min-height:72px;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;gap:6px;}
    .inv-slot img{max-width:100%;max-height:54px;border-radius:10px;}
    .slot-name{font-size:11px;color:#000;background:rgba(255,255,255,.8);padding:2px 6px;border-radius:6px;}
    .slot-row{display:flex;gap:6px;}
    .btn{background:#eee;border:none;border-radius:10px;padding:6px 8px;font-weight:800;cursor:pointer;}
    .btn.primary{background:#3b82f6;color:#fff;}

    .tree{position:absolute;bottom:220px;width:24px;height:80px;background:#6b4f2a;border-radius:6px}
    .tree:after{content:"";position:absolute;bottom:40px;left:-26px;width:76px;height:76px;background:radial-gradient(circle,#66c956,#3e9a3e);border-radius:50%;}
    .bird{position:absolute;top:80px; width:30px;height:14px;border-radius:14px;background:#333; animation:birdFly 22s linear infinite;}
    .stars .star{position:absolute;width:3px;height:3px;background:#fff;border-radius:50%;animation:twinkle 3s ease-in-out infinite;}
  `;
  document.head.appendChild(style);
}

/* ================================
   MAP + PANELS
================================ */
function createMap(roomCode) {
  injectStyles();
  const map = document.getElementById("map");
  map.innerHTML = "";
  map.style = `
    width:100vw;height:100vh;position:fixed;top:0;left:0;overflow:hidden;z-index:1000;
    background:linear-gradient(#83d0ff,#bdeeff,#74d66f);
    display:flex;justify-content:center;align-items:flex-end;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  `;

  // Stars + day/night
  const stars = document.createElement("div");
  stars.className = "stars";
  stars.style = `position:absolute;inset:0;pointer-events:none;opacity:.0;transition:opacity .8s ease;`;
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.left = Math.random()*100 + "vw";
    s.style.top  = Math.random()*40 + "vh";
    s.style.animationDelay = (Math.random()*3).toFixed(2)+"s";
    stars.appendChild(s);
  }
  map.append(stars);

  let day = true;
  setInterval(()=> {
    day = !day;
    if (day) {
      map.style.background = "linear-gradient(#83d0ff,#bdeeff,#74d66f)";
      stars.style.opacity = ".0";
    } else {
      map.style.background = "linear-gradient(#1e1f3b,#2a305b,#213a2a)";
      stars.style.opacity = "1";
    }
  }, 25000);

  // Hill
  map.appendChild(Object.assign(document.createElement("div"), {
    style: `
      position:absolute;bottom:0;width:150%;height:260px;left:-25%;
      background:radial-gradient(circle,#6ab54f 0%,#4c8f3a 70%,#386c2a 100%);
      border-top-left-radius:50%;border-top-right-radius:50%;
    `
  }));

  // Trees
  for (let i = 0; i < 6; i++) {
    const t = document.createElement("div");
    t.className = "tree";
    t.style.left = (8 + i*15) + "vw";
    t.style.transform = `scale(${0.9 + Math.random()*0.6})`;
    map.appendChild(t);
  }

  // Birds
  for (let i = 0; i < 2; i++) {
    const b = document.createElement("div");
    b.className = "bird";
    b.style.top = (60 + i*26) + "px";
    b.style.animationDelay = (i*5)+"s";
    map.appendChild(b);
  }

  // Player row (wide spacing)
  const playerRow = document.createElement("div");
  playerRow.id = "map-players";
  playerRow.style = `
    position:absolute;bottom:260px;display:flex;gap:120px;width:100%;justify-content:center;align-items:flex-end;
  `;
  map.appendChild(playerRow);

  // Shop Button
  const shopBtn = document.createElement("button");
  shopBtn.className = "shop-button";
  shopBtn.textContent = "SHOP / INVENTORY";
  shopBtn.onclick = () => switchTab("shop");
  map.appendChild(shopBtn);

  // Panels
  document.body.appendChild(buildShopPanel());
  document.body.appendChild(buildInventoryPanel());
}

function buildShopPanel() {
  const panel = document.createElement("div");
  panel.id = "shop-panel";
  panel.className = "panel";
  panel.innerHTML = `
    <div class="panel-header">
      <div><b>Shop</b><br><span class="small-muted">Buy items</span></div>
      <div><span class="small-muted">Cikoins</span><br><span id="shop-coins" class="coins-badge">--</span></div>
    </div>
    <div class="tabs">
      <div id="tab-shop" class="tab active">Shop</div>
      <div id="tab-inv" class="tab">Inventory</div>
    </div>
    <div id="shop-content" class="shop-items"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button id="close-shop" class="btn">Close</button>
    </div>
  `;
  panel.querySelector("#close-shop").onclick = () => panel.style.display = "none";
  panel.addEventListener("click", (e) => {
    if (e.target.id === "tab-inv") switchTab("inventory");
    if (e.target.id === "tab-shop") switchTab("shop");
  });
  return panel;
}

function buildInventoryPanel() {
  const p = document.createElement("div");
  p.id = "inventory-panel";
  p.className = "panel";
  p.innerHTML = `
    <div class="panel-header">
      <div><b>Inventory</b><br><span class="small-muted">Your items</span></div>
      <div><span class="small-muted">Cikoins</span><br><span id="inv-coins" class="coins-badge">--</span></div>
    </div>
    <div id="inv-grid" class="inv-grid"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button id="close-inv" class="btn">Close</button>
    </div>
  `;
  p.querySelector("#close-inv").onclick = () => p.style.display = "none";
  return p;
}

function switchTab(to) {
  const shop = document.getElementById("shop-panel");
  const inv  = document.getElementById("inventory-panel");

  document.getElementById("tab-shop")?.classList.toggle("active", to === "shop");
  document.getElementById("tab-inv")?.classList.toggle("active", to === "inventory");

  if (to === "shop") {
    if (inv) inv.style.display = "none";
    if (shop) {
      shop.style.display = "flex";
      renderShop(window.currentRoomCode);
    }
  } else {
    if (shop) shop.style.display = "none";
    if (inv) {
      inv.style.display = "flex";
      renderInventory(window.currentRoomCode);
    }
  }
}

/* ================================
   REALTIME PLAYERS ON MAP
================================ */
let stopPlayersListener = null;

function displayPlayersOnMap(roomCode) {
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  if (typeof stopPlayersListener === "function") stopPlayersListener();

  stopPlayersListener = onValue(playersRef, (snap) => {
    const players = snap.val() || {};
    const row = document.getElementById("map-players");
    if (!row) return;
    row.innerHTML = "";

    Object.entries(players).forEach(([name, info]) => {
      const coins = typeof info.coins === "number" ? info.coins : DEFAULT_COINS;
      const teamColor = TEAM_COLORS[info.team] || "#555";

      const card = document.createElement("div");
      card.className = "player-card";

      // effect badges
      const badges = document.createElement("div");
      badges.className = "badges";
      const effects = info.effects || {};
      Object.keys(effects).forEach(key => {
        const until = effects[key];
        if (typeof until === "number" && until > now()) {
          const b = document.createElement("div");
          b.className = "badge";
          b.textContent = key.replace("_","-");
          badges.appendChild(b);
        }
      });
      card.appendChild(badges);

      // avatar
      const avatar = document.createElement("div");
      avatar.className = "avatar";

      const img = document.createElement("img");
      img.src = CHARACTER_IMAGES[info.character] || CHARACTER_IMAGES.default;
      img.alt = info.character || "character";
      img.onerror = () => {
        avatar.innerHTML = "";
        const fallback = document.createElement("div");
        fallback.style = `
          width:100px;height:120px;background:${teamColor};
          display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:40px;border-radius:12px;
        `;
        fallback.textContent = (name[0] || "?").toUpperCase();
        avatar.appendChild(fallback);
      };
      avatar.appendChild(img);

      // cosmetic overlay
      if (info.equipped && info.equipped.cosmetic && COSMETIC_IMAGES[info.equipped.cosmetic]) {
        const cos = document.createElement("img");
        cos.className = "cosmetic";
        cos.src = COSMETIC_IMAGES[info.equipped.cosmetic];
        cos.alt = "cosmetic";
        cos.onerror = () => cos.remove();
        avatar.appendChild(cos);
      }

      const n = document.createElement("div");
      n.className = "name-tag";
      n.textContent = name;

      const team = document.createElement("div");
      team.className = "team-pill";
      team.textContent = (info.team || "NONE").toUpperCase();
      team.style = `color:${teamColor};border:2px solid ${teamColor};background:#fff;`;

      /* ===== HP DISPLAY (TEXT + BAR) ===== */
      const hpWrap = document.createElement("div");
      hpWrap.style = "width:100px;text-align:center;font-size:12px;margin-top:2px;";

      const hp = info.hp ?? 100;
      const maxhp = info.maxhp ?? 100;

      const hpText = document.createElement("div");
      hpText.textContent = `❤️ ${hp}/${maxhp}`;

      const hpBarBg = document.createElement("div");
      hpBarBg.style = "width:100%;height:6px;background:#333;border-radius:4px;margin-top:2px;";

      const hpBar = document.createElement("div");
      const hpPercent = Math.max(0, Math.min(1, maxhp ? (hp/maxhp) : 1));
      hpBar.style = `width:${(hpPercent*100).toFixed(0)}%;height:100%;background:#ff4747;border-radius:4px;transition:width .2s;`;
      hpBarBg.appendChild(hpBar);
      hpWrap.append(hpText, hpBarBg);
      /* =================================== */

      const c = document.createElement("div");
      c.className = "small-muted";
      c.textContent = `Cikoins: ${coins}`;

      card.append(avatar, n, team, hpWrap, c);
      row.appendChild(card);
    });
  });
}

/* ================================
   USER / LIVE BADGES
================================ */
let stopSelfListener = null;
async function resolveUsername(roomCode) {
  if (window.username) return window.username;
  const snap = await get(ref(db, `rooms/${roomCode}/players`));
  const obj = snap.val() || {};
  const first = Object.keys(obj)[0] || null;
  if (first) window.username = first;
  return window.username;
}

async function listenSelf(roomCode) {
  if (typeof stopSelfListener === "function") stopSelfListener();
  const username = await resolveUsername(roomCode);
  if (!username) return;
  const pRef = ref(db, `rooms/${roomCode}/players/${username}`);
  stopSelfListener = onValue(pRef, (snap) => {
    const p = snap.val() || {};
    const coins = typeof p.coins === "number" ? p.coins : DEFAULT_COINS;
    const shopBadge = document.getElementById("shop-coins");
    const invBadge  = document.getElementById("inv-coins");
    if (shopBadge) shopBadge.textContent = String(coins);
    if (invBadge)  invBadge.textContent  = String(coins);
  });
}

/* ================================
   SHOP
================================ */
async function renderShop(roomCode) {
  const container = document.getElementById("shop-content");
  const badge = document.getElementById("shop-coins");
  container.innerHTML = "";

  const username = await resolveUsername(roomCode);
  if (!username) {
    container.textContent = "No players in room.";
    return;
  }

  await ensureDefaultFields(roomCode, username);

  const pRef = ref(db, `rooms/${roomCode}/players/${username}`);
  const data = (await get(pRef)).val() || {};
  const coins = data.coins ?? DEFAULT_COINS;
  if (badge) badge.textContent = coins;

  SHOP_ITEMS.forEach(item => {
    const row = document.createElement("div");
    row.className = "shop-item";

    const img = document.createElement("img");
    img.src = item.img;
    img.width = 32;
    img.height = 32;
    img.onerror = () => img.remove();

    const meta = document.createElement("div");
    meta.innerHTML = `<b>${item.name}</b><br><span class="small-muted">${item.desc}</span>`;

    const price = document.createElement("div");
    price.style.fontWeight = "900";
    price.textContent = item.price;

    const btn = document.createElement("button");
    btn.className = "shop-buy";
    btn.textContent = "Buy";
    btn.onclick = () => handleBuy(roomCode, username, item);

    row.append(img, meta, price, btn);
    container.appendChild(row);
  });

  listenSelf(roomCode);
}

async function handleBuy(roomCode, username, item) {
  const pRef = ref(db, `rooms/${roomCode}/players/${username}`);

  const result = await runTransaction(pRef, player => {
    player = player || {};
    const coins = typeof player.coins === "number" ? player.coins : DEFAULT_COINS;
    if (coins < item.price) return; // abort transaction
    player.coins = coins - item.price;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    inv.push({ id: item.id, name: item.name, at: now(), type: item.type });
    player.inventory = inv;
    if (!player.effects)  player.effects  = {};
    if (!player.equipped) player.equipped = {};
    if (player.hp == null) player.hp = 100;
    if (player.maxhp == null) player.maxhp = 100;
    return player;
  });

  if (!result.committed) {
    alert("Not enough cikoins!");
    return;
  }

  vibrate(); beep();
  alert("Purchased " + item.name + "!");

  // Refresh open panels
  const invPanel  = document.getElementById("inventory-panel");
  const shopPanel = document.getElementById("shop-panel");
  if (invPanel && invPanel.style.display === "flex") renderInventory(roomCode);
  if (shopPanel && shopPanel.style.display === "flex") renderShop(roomCode);
}

/* ================================
   INVENTORY (Use / Equip / Unequip / Drop)
================================ */
async function renderInventory(roomCode) {
  const grid  = document.getElementById("inv-grid");
  const badge = document.getElementById("inv-coins");
  grid.innerHTML = "";

  const username = await resolveUsername(roomCode);
  if (!username) {
    grid.textContent = "No players.";
    return;
  }

  await ensureDefaultFields(roomCode, username);

  const pRef = ref(db, `rooms/${roomCode}/players/${username}`);
  const dataSnap = await get(pRef);
  const data = dataSnap.val() || {};
  const coins = data.coins ?? DEFAULT_COINS;
  if (badge) badge.textContent = coins;

  const inv = Array.isArray(data.inventory) ? data.inventory : [];
  if (inv.length === 0) {
    grid.textContent = "Inventory is empty.";
    return;
  }

  inv.forEach((it, idx) => {
    const slot = document.createElement("div");
    slot.className = "inv-slot";

    const iconUrl = SHOP_ITEMS.find(x => x.id === it.id)?.img || "Shop/default.png";
    const img = document.createElement("img");
    img.src = iconUrl; img.alt = it.name || it.id;
    img.onerror = () => img.remove();

    const name = document.createElement("div");
    name.className = "slot-name";
    name.textContent = it.name || it.id;

    const actions = document.createElement("div");
    actions.className = "slot-row";

    // Use / Equip / Unequip / Drop
    if ((it.type || "").toLowerCase() === "consumable") {
      const useBtn = document.createElement("button");
      useBtn.className = "btn primary";
      useBtn.textContent = "Use";
      useBtn.onclick = () => useItem(roomCode, username, idx, it);
      actions.appendChild(useBtn);
    } else if ((it.type || "").toLowerCase() === "cosmetic") {
      const equipBtn = document.createElement("button");
      equipBtn.className = "btn primary";
      equipBtn.textContent = "Equip";
      equipBtn.onclick = () => equipCosmetic(roomCode, username, it);
      actions.appendChild(equipBtn);

      const unequipBtn = document.createElement("button");
      unequipBtn.className = "btn";
      unequipBtn.textContent = "Unequip";
      unequipBtn.onclick = () => unequipCosmetic(roomCode, username);
      actions.appendChild(unequipBtn);
    }

    const dropBtn = document.createElement("button");
    dropBtn.className = "btn";
    dropBtn.textContent = "Drop";
    dropBtn.onclick = () => dropItem(roomCode, username, idx);
    actions.appendChild(dropBtn);

    slot.append(img, name, actions);
    grid.appendChild(slot);
  });

  listenSelf(roomCode);
}

// Drop one inventory item by index
async function dropItem(roomCode, username, index) {
  const pRef = ref(db, `rooms/${roomCode}/players/${username}`);
  await runTransaction(pRef, (player) => {
    player = player || {};
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    if (index < 0 || index >= inv.length) return player;
    inv.splice(index, 1);
    player.inventory = inv;
    return player;
  });
  vibrate(15);
  renderInventory(roomCode);
}

// Equip cosmetic
async function equipCosmetic(roomCode, username, item) {
  if (!COSMETIC_IMAGES[item.id]) return alert("This item cannot be equipped.");
  const pRef = ref(db, `rooms/${roomCode}/players/${username}/equipped`);
  await update(pRef, { cosmetic: item.id });
  vibrate(15);
  alert("Equipped " + item.name + "!");
}

// Unequip cosmetic
async function unequipCosmetic(roomCode, username) {
  const pRef = ref(db, `rooms/${roomCode}/players/${username}/equipped`);
  await update(pRef, { cosmetic: null });
  vibrate(15);
  alert("Unequipped.");
}

// Use consumable: applies effect & removes one from inventory
async function useItem(roomCode, username, index, item) {
  const id = item.id;
  if (!id) return;

  const pRef = ref(db, `rooms/${roomCode}/players/${username}`);

  await runTransaction(pRef, (player) => {
    player = player || { coins: DEFAULT_COINS, inventory: [], effects: {} };
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    if (index < 0 || index >= inv.length) return player;

    // remove item
    inv.splice(index, 1);
    player.inventory = inv;

    // ensure hp fields
    if (player.hp == null) player.hp = 100;
    if (player.maxhp == null) player.maxhp = 100;

    // apply effect
    player.effects = player.effects || {};
    if (id === "speed_boost") {
      const until = now() + (EFFECT_DURATIONS.speed_boost || 10000);
      player.effects.speed_boost = until;
    }
    else if (id === "hp_potion") {
      player.hp = Math.min(player.maxhp, (player.hp ?? 100) + 20);
      player.effects.healed = now() + 5000;
    }
    else if (id === "cookie") {
      player.effects.happy = now() + 5000;
    }
    return player;
  });

  vibrate(20); beep(50, 900, 0.05);
  renderInventory(roomCode);
}

/* ================================
   PUBLIC INIT
================================ */
export function initializeMap(roomCode, username = null) {
  window.currentRoomCode = roomCode;
  if (username) window.username = username;

  document.getElementById("menu")?.style && (document.getElementById("menu").style.display = "none");
  document.getElementById("room")?.style && (document.getElementById("room").style.display = "none");

  const game = document.getElementById("game");
  if (game) {
    game.style.display = "block";
    game.style.width = "100%";
    game.style.height = "100vh";
  }

  createMap(roomCode);
  displayPlayersOnMap(roomCode);
  listenSelf(roomCode); // live coin badges
}

window.initializeMap = initializeMap;
