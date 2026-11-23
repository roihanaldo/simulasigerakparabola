/**
 * SIMULASI FISIKA GERAK PARABOLA & UJI TANTANGAN SASARAN (EDISI ANGRY BIRDS)
 * =========================================================================================
 * Fitur Utama:
 * 1. Mekanika Ketapel & Meriam Angry Birds: Drag untuk mengatur sudut 360° & laju awal (v0),
 *    lepaskan tarikan untuk menembakkan burung dengan pita karet elastis dan indikator daya!
 * 2. Preview Tersembunyi: Garis lintasan putus-putus dan penanda Xmaks & Hmaks disembunyikan
 *    pada mode bersiap (IDLE) dan HANYA muncul setelah burung ditembakkan.
 * 3. Kotak Target Hancur Bertahap (Destructible Boxes): Struktur benteng kayu dengan kotak-kotak
 *    yang dapat ditabrak, bergeser, retak, dan hancur berkeping-keping.
 * 4. Efek Ambang Kerusakan (Damage Threshold):
 *    - Tumbukan pelan (< 7.5 m/s): Kotak bergoyang, bergeser sedikit, tidak hancur (thump!).
 *    - Tumbukan sedang (7.5 - 17 m/s): Muncul retakan nyata pada kayu, kotak terdorong jatuh.
 *    - Tumbukan keras (>= 17 m/s): Kotak meledak menjadi 18 serpihan kayu berhamburan!
 * 5. Fisika Pendaratan Tanah Realistis: Burung tidak langsung berhenti mendadak saat menyentuh
 *    tanah; burung memantul (restitusi 0.42), berguling dengan gesekan rumput, mengepulkan debu,
 *    dan berhenti perlahan di posisi akhir Xmaks yang akurat.
 * 6. Karakter Babi Dinamis: Duduk di atas benteng, kaget jika terkena pelan, terpental dalam
 *    gerak parabola pasca-tumbukan jika terkena keras, dan pingsan dengan bintang pusing.
 * =========================================================================================
 */

// =========================================================================================
// BAGIAN 1: VARIABEL & PARAMETER SIMULASI
// =========================================================================================

// --- Parameter Fisika Input ---
let v0 = 42;                     // Kecepatan awal proyektil (m/s), batas: 10 - 100 m/s
let angleDeg = 45;               // Sudut elevasi penembakan (derajat), batas: 0 - 360 derajat
let h0 = 12;                     // Ketinggian awal peluncur dari tanah (meter), batas: 0 - 50 m
let gravity = 9.8;               // Percepatan gravitasi (m/s^2), batas: 1 - 20 m/s^2

// --- Status Mesin Simulasi (State Machine) ---
let simState = 'IDLE';           // 'IDLE', 'FLYING', 'PAUSED', 'LANDED'
let simTime = 0;                 // Stopwatch waktu simulasi (detik)
let simSpeed = 1.0;              // Pengali laju animasi (1.0x normal, 0.5x, 0.25x slow motion)
const dt = 1 / 60;               // Delta waktu per frame (standar 60 FPS)

// --- Objek Keadaan Proyektil Burung ---
let proj = {
  x: 0,                          // Jarak horizontal (meter)
  y: 0,                          // Ketinggian vertikal (meter)
  vx: 0,                         // Kecepatan horizontal (m/s)
  vy: 0,                         // Kecepatan vertikal (m/s)
  v: 0,                          // Resultan kecepatan (m/s)
  rotation: 0,                   // Sudut visual karakter (radian)
  landed: false,                 // Status apakah sudah berhenti total di tanah
  landX: 0,                      // Posisi akhir berhenti pendaratan (meter)
  bounceCount: 0                 // Jumlah pantulan di tanah
};

// --- Kotak-Kotak Target yang Dapat Ditabrak (Destructible Boxes) ---
let boxes = [];                  // Array objek kotak: [{ id, x, y, initX, initY, w, h, vx, vy, rot, rotSpeed, mass, hp, maxHp, damageState, wobble, isDestroyed }]

// --- Misi Target & Karakter Babi Dinamis ---
let target = {
  x: 68,                         // Posisi horizontal sasaran (meter)
  y: 8,                          // Ketinggian sasaran (meter)
  radius: 3.2,                   // Radius area tabrakan sasaran
  isHit: false,                  // Status terkena tembakan
  score: 0                       // Akumulasi skor pemain
};

let pig = {
  x: 68,
  y: 8,
  initialX: 68,
  initialY: 8,
  vx: 0,
  vy: 0,
  v: 0,
  rotation: 0,
  rotSpeed: 0,
  isFlying: false,
  landed: false,
  landX: 68,
  Hmax: 8
};

// --- Data Fisika Tumbukan 2 Dimensi (Hukum Kekekalan Momentum) ---
let collisionData = null;

// --- Jejak & Titik Sampel Lintasan ---
let currentTrail = [];           // Lintasan aktif [{x, y, phase}]
let pastTrails = [];             // Riwayat lintasan sebelumnya
let pigTrail = [];               // Jejak lintasan babi terlempar
let sampledNodes = [];           // Titik sampel burung & tumbukan
let pigSampledNodes = [];        // Titik sampel babi
let selectedNode = null;         // Titik yang sedang diklik untuk inspeksi data
let hoveredNode = null;          // Titik yang sedang disentuh mouse
let lastSampleTime = 0;          // Interval pencuplikan titik burung
let lastPigSampleTime = 0;       // Interval pencuplikan titik babi

// --- Efek Visual & Game Juice Khas Angry Birds ---
let particles = [];              // Partikel asap dan percikan tanah
let confetti = [];               // Konfeti kemenangan
let woodDebris = [];             // Puing balok kayu yang hancur berhamburan
let comicEffects = [];           // Pop-up komik (TUMBUKAN!, HANCUR!, THUMP!)
let screenShake = 0;             // Getaran kamera
let clouds = [];                 // Awan kartun

// --- Pengaturan Tampilan Visual (Toggle) ---
let showVectors = true;          // Panah vektor kecepatan
let showTrail = true;            // Garis jejak lintasan
let showTheoreticalPath = true;  // Garis putus-putus analitis (hanya saat terbang)
let showMarkers = true;          // Penanda Hmaks dan Xmaks (hanya saat terbang)
let autoScale = true;            // Skala adaptif otomatis

// --- Interaksi Tarik Ketapel & Mouse Dragging ---
let isAimingCannon = false;      // Sedang menarik ketapel/meriam
let isDraggingPlatform = false;  // Sedang menyeret platform tebing h0
let pullDistance = 0;            // Jarak tarikan ketapel (pixel)
let pullAngle = 0;               // Sudut tarikan ketapel

// --- Konfigurasi Koordinat Kanvas ---
const ORIGIN_X = 90;             // Titik poros peluncur di kanvas (pixel)
const GROUND_Y = 470;            // Garis permukaan tanah (pixel)
const VIEW_W = 880;              // Lebar efektif area pandang (pixel)
const VIEW_H = 410;              // Tinggi efektif area pandang (pixel)
let meterToPixel = 3.6;          // Rasio skala meter ke pixel

// --- Elemen Antarmuka Pengguna (UI Komponen) ---
let sliders = {};
let buttons = [];

// =========================================================================================
// BAGIAN 2: FUNGSI SETUP (DIJALANKAN SEKALI SAAT APLIKASI DIMULAI)
// =========================================================================================
function setup() {
  createCanvas(1040, 665);
  textFont('Segoe UI, Tahoma, sans-serif');

  // Membuat awan-awan acak di latar belakang langit
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: random(width),
      y: random(35, 170),
      speed: random(0.2, 0.5),
      scale: random(0.7, 1.3)
    });
  }

  // ---------------------------------------------------------------------------------------
  // Inisialisasi 4 Slider Parameter Fisika (Sudut Bisa 0 - 360 Derajat!)
  // ---------------------------------------------------------------------------------------
  sliders.v0 = new CartoonSlider(45, 544, 215, 10, 100, v0, 'Kecepatan Awal (v₀)', 'm/s', 1, '#ff5722');
  sliders.angle = new CartoonSlider(290, 544, 215, 0, 360, angleDeg, 'Sudut Peluncur (θ)', '°', 1, '#ff9800');
  sliders.h0 = new CartoonSlider(535, 544, 215, 0, 50, h0, 'Ketinggian Awal (h₀)', 'm', 1, '#4caf50');
  sliders.gravity = new CartoonSlider(780, 544, 215, 1.0, 20.0, gravity, 'Percepatan Gravitasi (g)', 'm/s²', 0.1, '#00bcd4');

  // ---------------------------------------------------------------------------------------
  // Inisialisasi Tombol Kontrol Aksi Utama
  // ---------------------------------------------------------------------------------------
  buttons.push(new CartoonButton(45, 598, 130, 38, '🚀 TEMBAK!', '#4caf50', '#388e3c', () => {
    fireProjectile();
  }));

  buttons.push(new CartoonButton(186, 598, 115, 38, '⏸ JEDA', '#2196f3', '#1976d2', function() {
    if (simState === 'FLYING') {
      simState = 'PAUSED';
      this.label = '▶ LANJUT';
      this.baseColor = '#ff9800';
      this.hoverColor = '#f57c00';
    } else if (simState === 'PAUSED') {
      simState = 'FLYING';
      this.label = '⏸ JEDA';
      this.baseColor = '#2196f3';
      this.hoverColor = '#1976d2';
    }
  }));

  buttons.push(new CartoonButton(312, 598, 105, 38, '🔄 RESET', '#f44336', '#d32f2f', () => {
    resetSimulation();
  }));

  buttons.push(new CartoonButton(428, 598, 140, 38, '🎯 TARGET BARU', '#9c27b0', '#7b1fa2', () => {
    randomizeTarget();
  }));

  buttons.push(new CartoonButton(579, 598, 125, 38, '⏱ Laju: 1.0x', '#607d8b', '#455a64', function() {
    if (simSpeed === 1.0) {
      simSpeed = 0.5;
      this.label = '⏱ Slow: 0.5x';
    } else if (simSpeed === 0.5) {
      simSpeed = 0.25;
      this.label = '⏱ Slow: 0.25x';
    } else {
      simSpeed = 1.0;
      this.label = '⏱ Laju: 1.0x';
    }
  }));

  buttons.push(new CartoonButton(715, 598, 125, 38, '🏹 Vektor: ON', '#3f51b5', '#303f9f', function() {
    showVectors = !showVectors;
    this.label = showVectors ? '🏹 Vektor: ON' : '🏹 Vektor: OFF';
  }));

  buttons.push(new CartoonButton(851, 598, 145, 38, '🧹 Hapus Titik', '#78909c', '#546e7a', () => {
    pastTrails = [];
    currentTrail = [];
    pigTrail = [];
    sampledNodes = [];
    pigSampledNodes = [];
    selectedNode = null;
  }));

  // Membangun benteng kotak kayu awal di lokasi target
  initTargetFortress(target.x, target.y);
}

// =========================================================================================
// INISIALISASI BENTENG KOTAK KAYU ANGRY BIRDS (DESTRUCTIBLE FORTRESS)
// =========================================================================================
function initTargetFortress(tx, ty) {
  boxes = [];
  
  if (ty <= 6.0) {
    // Benteng 2 Tingkat di Atas Tanah
    boxes.push({
      id: 0, x: tx - 2.0, y: 1.2, initX: tx - 2.0, initY: 1.2,
      w: 2.2, h: 2.4, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.0,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'wood1'
    });
    boxes.push({
      id: 1, x: tx + 2.0, y: 1.2, initX: tx + 2.0, initY: 1.2,
      w: 2.2, h: 2.4, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.0,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'wood1'
    });
    boxes.push({
      id: 2, x: tx, y: 2.9, initX: tx, initY: 2.9,
      w: 6.4, h: 1.0, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.5,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'beam'
    });
    boxes.push({
      id: 3, x: tx, y: 4.4, initX: tx, initY: 4.4,
      w: 2.4, h: 2.0, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 2.5,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'wood2'
    });
    
    // Babi diletakkan di atas kotak tingkat atas
    pig.x = tx;
    pig.y = 6.6;
    pig.initialX = tx;
    pig.initialY = 6.6;
    pig.landX = tx;
    target.y = 6.6;
  } else {
    // Menara Kayu Bertingkat Tinggi
    boxes.push({
      id: 0, x: tx - 2.0, y: 1.4, initX: tx - 2.0, initY: 1.4,
      w: 2.2, h: 2.8, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.2,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'wood1'
    });
    boxes.push({
      id: 1, x: tx + 2.0, y: 1.4, initX: tx + 2.0, initY: 1.4,
      w: 2.2, h: 2.8, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.2,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'wood1'
    });
    boxes.push({
      id: 2, x: tx, y: ty - 3.2, initX: tx, initY: ty - 3.2,
      w: 6.2, h: 1.0, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.5,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'beam'
    });
    boxes.push({
      id: 3, x: tx - 1.6, y: ty - 1.6, initX: tx - 1.6, initY: ty - 1.6,
      w: 2.0, h: 2.2, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 2.5,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'wood2'
    });
    boxes.push({
      id: 4, x: tx + 1.6, y: ty - 1.6, initX: tx + 1.6, initY: ty - 1.6,
      w: 2.0, h: 2.2, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 2.5,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'wood2'
    });
    boxes.push({
      id: 5, x: tx, y: ty - 0.5, initX: tx, initY: ty - 0.5,
      w: 5.4, h: 0.8, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 2.5,
      hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, colorType: 'beam'
    });

    pig.x = tx;
    pig.y = ty + 0.9;
    pig.initialX = tx;
    pig.initialY = ty + 0.9;
    pig.landX = tx;
  }
}

// =========================================================================================
// BAGIAN 3: DRAW LOOP UTAMA (DIULANG ~60 KALI PER DETIK)
// =========================================================================================
function draw() {
  // 1. Membaca nilai dari slider jika tidak sedang menarik ketapel
  if (!isAimingCannon) {
    v0 = sliders.v0.value;
    angleDeg = sliders.angle.value;
  }
  h0 = sliders.h0.value;
  gravity = sliders.gravity.value;

  // 2. Kalkulasi fisika analitis
  let ana = calculateAnalytical(v0, angleDeg, h0, gravity);
  updateScale(ana.Xmax, ana.Hmax);

  // 3. Menggambar latar belakang lingkungan kartun
  drawCartoonEnvironment();

  // 4. Update fisika jika sedang melayang
  if (simState === 'FLYING') {
    updatePhysics(ana);
  }

  updateParticles();
  updateWoodDebris();
  updateComicEffects();

  let cannonY = GROUND_Y - h0 * meterToPixel;

  // 5. Efek Getaran Kamera (Screen Shake)
  push();
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake *= 0.88;
    if (screenShake < 0.2) screenShake = 0;
  }

  drawMeterRuler(ana.Xmax, ana.Hmax);
  drawWoodenPlatform(ORIGIN_X, GROUND_Y, cannonY, h0);

  // PREVIEW LINTASAN HANYA MUNCUL SETELAH DITEMBAKKAN (TIDAK MUNCUL DI IDLE)
  if (showTheoreticalPath && simState !== 'IDLE') {
    drawTheoreticalPath(v0, angleDeg, h0, gravity, ana.tTotal);
  }

  if (showTrail) {
    drawPastTrails();
    drawCurrentTrail();
  }

  // Menggambar Kotak-Kotak Target Kayu
  drawDestructibleBoxes();

  // Menggambar Babi & Menara Tantangan
  drawChallengeTarget();

  // PENANDA HMAKS & XMAKS HANYA MUNCUL SETELAH DITEMBAKKAN
  if (showMarkers && simState !== 'IDLE') {
    drawMarkers(ana);
  }

  // Menggambar Titik Sampel Lintasan (Click to Inspect)
  drawSampledNodes();

  // Menggambar Peluncur Ketapel/Meriam Kartun
  drawCartoonLauncher(ORIGIN_X, cannonY, angleDeg);

  // Menggambar Karakter Burung Proyektil & Vektor Kecepatan
  drawCharacterProjectile(ORIGIN_X, cannonY, ana);

  // Menggambar Partikel, Serpihan Kayu, dan Teks Komik
  drawParticles();
  drawWoodDebris();
  drawComicEffects();

  pop(); // Akhir blok getaran kamera

  // Kartu Inspeksi Data jika ada titik sampel yang diklik
  if (selectedNode) {
    drawNodeInspectorCard(selectedNode);
  }

  // Antarmuka UI (Telemetri, Banner Tantangan, Panel Kontrol)
  drawTelemetryOverlay(ana);
  drawChallengeBanner();
  drawControlInterface();
  updateMouseCursor(cannonY);
}

// =========================================================================================
// BAGIAN 4: KALKULASI ANALITIS FISIKA IDEAL (MENDUKUNG SUDUT 360°)
// =========================================================================================
function calculateAnalytical(v_init, deg, y0, g_acc) {
  let rad = radians(deg);
  let v0x = v_init * Math.cos(rad);
  let v0y = v_init * Math.sin(rad);

  let tPeak = (g_acc > 0 && v0y > 0) ? (v0y / g_acc) : 0;
  let Hmax = (g_acc > 0 && v0y > 0) ? (y0 + (v0y * v0y) / (2 * g_acc)) : y0;
  let xPeak = v0x * tPeak;

  let discriminant = v0y * v0y + 2 * g_acc * y0;
  let tTotal = 0;
  if (g_acc > 0 && discriminant >= 0) {
    tTotal = (v0y + Math.sqrt(discriminant)) / g_acc;
  }

  let Xmax = v0x * tTotal;
  let vLand = Math.sqrt(v_init * v_init + 2 * g_acc * y0);

  return { rad, v0x, v0y, tPeak, Hmax, tTotal, Xmax, Rmax: Xmax, xPeak, vLand };
}

// =========================================================================================
// BAGIAN 5: SISTEM SKALA ADAPTIF OTOMATIS (AUTO-SCALING)
// =========================================================================================
function updateScale(Xmax, Hmax) {
  if (!autoScale) return;

  let maxRefX = Math.max(Math.abs(Xmax), target.x + 15, Math.abs(proj.x) + 15, 20);
  if (collisionData) {
    maxRefX = Math.max(maxRefX, pig.landX + 15, (proj.landX || 0) + 15);
  }
  let maxRefY = Math.max(Hmax, target.y + 12, Math.max(0, proj.y) + 10, (pig.Hmax || 0) + 10, 15);

  let safeW = VIEW_W - 90;
  let safeH = VIEW_H - 75;

  let targetScaleX = safeW / maxRefX;
  let targetScaleY = safeH / maxRefY;
  let targetScale = constrain(Math.min(targetScaleX, targetScaleY), 0.05, 10.0);

  if (simState === 'IDLE' && !isDraggingPlatform) {
    meterToPixel = lerp(meterToPixel, targetScale, 0.15);
  } else if (simState === 'FLYING') {
    if (targetScale < meterToPixel) {
      meterToPixel = lerp(meterToPixel, targetScale, 0.05);
    }
  }
}

// =========================================================================================
// BAGIAN 6: LOGIKA TEMBAK, INTEGRASI FISIKA NUMERIK, TABRAKAN KOTAK & AMBANG KERUSAKAN
// =========================================================================================
function fireProjectile() {
  if (simState === 'FLYING') return;

  let rad = radians(angleDeg);
  let v0x = v0 * Math.cos(rad);
  let v0y = v0 * Math.sin(rad);

  proj.x = 0;
  proj.y = h0;
  proj.vx = v0x;
  proj.vy = v0y;
  proj.v = v0;
  proj.rotation = -rad;
  proj.landed = false;
  proj.landX = 0;
  proj.bounceCount = 0;

  simTime = 0;
  lastSampleTime = 0;
  lastPigSampleTime = 0;

  collisionData = null;
  target.isHit = false;

  if (currentTrail.length > 1) {
    pastTrails.push([...currentTrail]);
    if (pastTrails.length > 5) pastTrails.shift();
  }
  currentTrail = [{ x: 0, y: h0, phase: 1 }];
  pigTrail = [];
  sampledNodes = [];
  pigSampledNodes = [];
  selectedNode = null;
  particles = [];
  confetti = [];
  woodDebris = [];
  comicEffects = [];
  screenShake = 0;

  addSampledNode(0, proj.x, proj.y, proj.vx, proj.vy, proj.v, 1);

  let cannonY = GROUND_Y - h0 * meterToPixel;
  let muzzleX = ORIGIN_X + 46 * Math.cos(rad);
  let muzzleY = cannonY - 46 * Math.sin(rad);
  createPuffParticles(muzzleX, muzzleY);

  simState = 'FLYING';

  let pauseBtn = buttons.find(b => b.label.includes('JEDA') || b.label.includes('LANJUT'));
  if (pauseBtn) {
    pauseBtn.label = '⏸ JEDA';
    pauseBtn.baseColor = '#2196f3';
    pauseBtn.hoverColor = '#1976d2';
  }
}

function updatePhysics(ana) {
  let effectiveDt = dt * simSpeed;
  simTime += effectiveDt;

  // =======================================================================================
  // 1. GERAK PROYEKTIL BURUNG (INTEGRASI NUMERIK SEMI-IMPLICIT EULER)
  // =======================================================================================
  if (!proj.landed) {
    // Gravitasi pada sumbu Y
    proj.vy -= gravity * effectiveDt;
    proj.x += proj.vx * effectiveDt;
    proj.y += proj.vy * effectiveDt;
    proj.v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);

    // Rotasi visual burung mengikuti lintasan jika di udara
    if (proj.y > 0.05) {
      proj.rotation = Math.atan2(-proj.vy, proj.vx);
    }

    currentTrail.push({ x: proj.x, y: Math.max(0, proj.y), phase: collisionData ? 2 : 1 });

    if (simTime - lastSampleTime >= 0.12) {
      lastSampleTime = simTime;
      addSampledNode(simTime, proj.x, proj.y, proj.vx, proj.vy, proj.v, collisionData ? 2 : 1);
    }

    // =====================================================================================
    // 2. FISIKA PENDARATAN TANAH (MEMANTUL, BERGULING & BERHENTI PERLAHAN)
    // =====================================================================================
    if (proj.y <= 0) {
      proj.y = 0;
      if (Math.abs(proj.vy) > 1.2) {
        // Memantul (Bounce) dengan koefisien restitusi tanah
        proj.vy = -proj.vy * 0.42;
        proj.bounceCount++;
        createDirtThud(ORIGIN_X + proj.x * meterToPixel, GROUND_Y);
      } else {
        proj.vy = 0;
      }

      // Gesekan permukaan tanah / rumput (Rolling Friction)
      proj.vx *= 0.94;
      proj.rotation += (proj.vx * effectiveDt) / 0.8;

      if (Math.abs(proj.vx) > 1.8 && frameCount % 4 === 0) {
        createDirtThud(ORIGIN_X + proj.x * meterToPixel, GROUND_Y);
      }

      // Berhenti total jika laju sudah sangat rendah
      if (Math.abs(proj.vx) < 0.22 && proj.vy === 0) {
        proj.vx = 0;
        proj.v = 0;
        proj.landed = true;
        proj.landX = proj.x;
        addSampledNode(simTime, proj.x, 0, 0, 0, 0, collisionData ? 2 : 1);
      }
    }

    // =====================================================================================
    // 3. DETEKSI TUMBUKAN DENGAN KOTAK-KOTAK TARGET & AMBANG KERUSAKAN (DAMAGE THRESHOLD)
    // =====================================================================================
    for (let box of boxes) {
      if (box.isDestroyed) continue;

      let dx = proj.x - box.x;
      let dy = proj.y - box.y;
      let halfW = box.w / 2;
      let halfH = box.h / 2;

      let clampX = constrain(dx, -halfW, halfW);
      let clampY = constrain(dy, -halfH, halfH);

      let nearX = box.x + clampX;
      let nearY = box.y + clampY;

      let distSq = (proj.x - nearX) * (proj.x - nearX) + (proj.y - nearY) * (proj.y - nearY);
      let birdRadius = 1.2;

      if (distSq < birdRadius * birdRadius) {
        let d = Math.sqrt(distSq);
        if (d < 0.001) d = 0.001;
        let nx = (proj.x - nearX) / d;
        let ny = (proj.y - nearY) / d;

        let rvx = proj.vx - box.vx;
        let rvy = proj.vy - box.vy;
        let v_rel = Math.sqrt(rvx * rvx + rvy * rvy);
        let v_normal = rvx * nx + rvy * ny;

        if (v_normal < -0.2) {
          let mBird = 1.0;
          let mBox = box.mass;

          // EVALUASI AMBANG KERUSAKAN (DAMAGE THRESHOLD)
          if (v_rel < 7.5) {
            // TINGKAT 1: PELAN (Wobble & bergeser sedikit, TIDAK HANCUR)
            let dmg = Math.round(map(v_rel, 0, 7.5, 5, 20));
            box.hp -= dmg;
            if (box.damageState === 0) box.damageState = 1;
            box.wobble = (proj.vx > 0 ? 0.12 : -0.12);
            box.vx += (proj.vx > 0 ? 0.4 : -0.4) * (v_rel / 7.5);

            let e = 0.45;
            let impulse = -(1 + e) * v_normal / (1 / mBird + 1 / mBox);
            proj.vx += (impulse / mBird) * nx * 0.7;
            proj.vy += (impulse / mBird) * ny * 0.7;

            let hitPx = ORIGIN_X + nearX * meterToPixel;
            let hitPy = GROUND_Y - nearY * meterToPixel;
            createPuffParticles(hitPx, hitPy);
            triggerComicBurst(hitPx, hitPy, 'THUMP!', 'GOYANG!');

          } else if (v_rel < 17.0 && box.hp > 35) {
            // TINGKAT 2: SEDANG (Retakan muncul pada kayu, kotak terdorong jatuh)
            let dmg = Math.round(map(v_rel, 7.5, 17.0, 35, 65));
            box.hp -= dmg;
            box.damageState = 2;
            box.vx += proj.vx * 0.42;
            box.vy += Math.max(proj.vy * 0.35, 2.2);
            box.rotSpeed = random(-3, 3);

            let e = 0.55;
            let impulse = -(1 + e) * v_normal / (1 / mBird + 1 / mBox);
            proj.vx += (impulse / mBird) * nx * 0.75;
            proj.vy += (impulse / mBird) * ny * 0.75;

            let hitPx = ORIGIN_X + nearX * meterToPixel;
            let hitPy = GROUND_Y - nearY * meterToPixel;
            createWoodDebris(hitPx, hitPy, 6);
            createPuffParticles(hitPx, hitPy);
            triggerComicBurst(hitPx, hitPy, '💥 RETAK!', `-${dmg} HP`);
            screenShake = 6;

          } else {
            // TINGKAT 3: KERAS (Kotak hancur berkeping-keping!)
            box.hp = 0;
            box.damageState = 3;
            box.isDestroyed = true;
            target.score += 50;

            let hitPx = ORIGIN_X + box.x * meterToPixel;
            let hitPy = GROUND_Y - box.y * meterToPixel;
            createWoodDebris(hitPx, hitPy, 18);
            createPuffParticles(hitPx, hitPy);
            triggerComicBurst(hitPx, hitPy, '💥 HANCUR!', '+50 PTS');
            screenShake = 12;

            proj.vx *= 0.72;
            proj.vy *= 0.78;
          }

          addSampledNode(simTime, proj.x, proj.y, proj.vx, proj.vy, proj.v, 2);
        }
      }
    }

    // =====================================================================================
    // 4. DETEKSI TUMBUKAN DENGAN BABI (AMBANG KERUSAKAN & MOMENTUM 2D)
    // =====================================================================================
    let dPig = dist(proj.x, proj.y, pig.x, pig.y);
    let pigRadius = 1.8;

    if (!pig.isHit && dPig <= pigRadius) {
      let dx = pig.x - proj.x;
      let dy = pig.y - proj.y;
      let dActual = Math.sqrt(dx * dx + dy * dy);
      if (dActual < 0.001) { dx = 1; dy = 0; dActual = 1; }
      let nx = dx / dActual;
      let ny = dy / dActual;
      let tx = -ny;
      let ty = nx;

      let u1n = proj.vx * nx + proj.vy * ny;
      let u1t = proj.vx * tx + proj.vy * ty;
      let v_rel = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);

      if (v_rel < 6.0) {
        // Tumbukan pelan ke babi: hanya kaget & bergoyang
        pig.rotation += (proj.vx > 0 ? 0.25 : -0.25);
        pig.x += (proj.vx > 0 ? 0.35 : -0.35);
        triggerComicBurst(ORIGIN_X + pig.x * meterToPixel, GROUND_Y - pig.y * meterToPixel, 'OINK?!', 'KAGET!');
        proj.vx *= -0.3;
      } else {
        // Tumbukan keras ke babi: terpental dalam gerak parabola baru!
        let m1 = 1.0;
        let m2 = 1.3;
        let e = 0.65;

        let v1n_prime = ((m1 - e * m2) / (m1 + m2)) * u1n;
        let v2n_prime = ((m1 * (1 + e)) / (m1 + m2)) * u1n;
        let v1t_prime = u1t * 0.90;

        let v1x_prime = v1n_prime * nx + v1t_prime * tx;
        let v1y_prime = v1n_prime * ny + v1t_prime * ty;
        let v2x_prime = v2n_prime * nx;
        let v2y_prime = v2n_prime * ny;

        v2y_prime = Math.max(v2y_prime, 4.2);
        v2x_prime = Math.max(v2x_prime, 5.0);

        collisionData = {
          time: simTime,
          x: proj.x,
          y: proj.y,
          v1x_before: proj.vx,
          v1y_before: proj.vy,
          v1_before: proj.v,
          v1x_after: v1x_prime,
          v1y_after: v1y_prime,
          v1_after: Math.sqrt(v1x_prime * v1x_prime + v1y_prime * v1y_prime),
          v2x_after: v2x_prime,
          v2y_after: v2y_prime,
          v2_after: Math.sqrt(v2x_prime * v2x_prime + v2y_prime * v2y_prime),
          e: e,
          m1: m1,
          m2: m2
        };

        proj.vx = v1x_prime;
        proj.vy = v1y_prime;

        pig.isHit = true;
        pig.isFlying = true;
        pig.landed = false;
        pig.vx = v2x_prime;
        pig.vy = v2y_prime;
        pig.v = collisionData.v2_after;
        pig.rotSpeed = random(8, 14);

        target.isHit = true;
        target.score += 100;

        let hitPx = ORIGIN_X + pig.x * meterToPixel;
        let hitPy = GROUND_Y - pig.y * meterToPixel;
        createVictoryConfetti(hitPx, hitPy);
        createPuffParticles(hitPx, hitPy);
        createWoodDebris(hitPx, hitPy, 14);
        triggerComicBurst(hitPx, hitPy, '💥 TUMBUKAN!', '+100 PTS');
        screenShake = 16;

        addCollisionSampleNode(simTime, proj.x, proj.y, collisionData);
      }
    }
  }

  // =======================================================================================
  // 5. GERAK FISIKA BABI TERPENTAL (GRAVITASI, MEMANTUL & BERGULING)
  // =======================================================================================
  if (pig.isFlying && !pig.landed) {
    pig.vy -= gravity * effectiveDt;
    pig.x += pig.vx * effectiveDt;
    pig.y += pig.vy * effectiveDt;
    pig.rotation += pig.rotSpeed * effectiveDt;
    pigTrail.push({ x: pig.x, y: Math.max(0, pig.y) });

    if (simTime - lastPigSampleTime >= 0.12) {
      lastPigSampleTime = simTime;
      addPigSampleNode(simTime, pig.x, pig.y, pig.vx, pig.vy, Math.sqrt(pig.vx * pig.vx + pig.vy * pig.vy));
    }

    if (pig.y <= 0) {
      pig.y = 0;
      if (Math.abs(pig.vy) > 1.2) {
        pig.vy = -pig.vy * 0.35;
        createDirtThud(ORIGIN_X + pig.x * meterToPixel, GROUND_Y);
      } else {
        pig.vy = 0;
      }
      pig.vx *= 0.90;
      pig.rotSpeed *= 0.78;

      if (Math.abs(pig.vx) < 0.22 && pig.vy === 0) {
        pig.vx = 0;
        pig.v = 0;
        pig.landed = true;
        pig.isFlying = false;
        pig.landX = pig.x;
        addPigSampleNode(simTime, pig.x, 0, 0, 0, 0);
      }
    }
  }

  // =======================================================================================
  // 6. GERAK FISIKA KOTAK-KOTAK KAYU JATUH & MEMANTUL
  // =======================================================================================
  for (let box of boxes) {
    if (box.isDestroyed) continue;

    if (box.y > box.h / 2) {
      box.vy -= gravity * effectiveDt;
      box.x += box.vx * effectiveDt;
      box.y += box.vy * effectiveDt;
      box.rot += box.rotSpeed * effectiveDt;
    }

    if (box.y <= box.h / 2) {
      box.y = box.h / 2;
      if (Math.abs(box.vy) > 1.0) {
        box.vy = -box.vy * 0.35;
        createDirtThud(ORIGIN_X + box.x * meterToPixel, GROUND_Y);
      } else {
        box.vy = 0;
      }
      box.vx *= 0.88;
      box.rotSpeed *= 0.82;
      if (Math.abs(box.vx) < 0.1) box.vx = 0;
    }

    box.wobble *= 0.88;
  }

  // Cek jika seluruh pergerakan selesai
  if (proj.landed && (!pig.isFlying || pig.landed)) {
    simState = 'LANDED';
  }
}

function addSampledNode(t, x, y, vx, vy, v, phase = 1) {
  let deg = degrees(Math.atan2(vy, vx));
  sampledNodes.push({
    t: t,
    x: x,
    y: Math.max(0, y),
    vx: vx,
    vy: vy,
    v: v,
    deg: deg,
    phase: phase,
    entity: 'bird'
  });
}

function addCollisionSampleNode(t, x, y, colData) {
  sampledNodes.push({
    t: t,
    x: x,
    y: y,
    vx: colData.v1x_after,
    vy: colData.v1y_after,
    v: colData.v1_after,
    deg: degrees(Math.atan2(colData.v1y_after, colData.v1x_after)),
    isCollision: true,
    v1x_before: colData.v1x_before,
    v1y_before: colData.v1y_before,
    v1_before: colData.v1_before,
    v1x_after: colData.v1x_after,
    v1y_after: colData.v1y_after,
    v1_after: colData.v1_after,
    v2x_after: colData.v2x_after,
    v2y_after: colData.v2y_after,
    v2_after: colData.v2_after,
    e: colData.e,
    entity: 'collision'
  });
}

function addPigSampleNode(t, x, y, vx, vy, v) {
  pigSampledNodes.push({
    t: t,
    x: x,
    y: Math.max(0, y),
    vx: vx,
    vy: vy,
    v: v,
    deg: degrees(Math.atan2(vy, vx)),
    entity: 'pig'
  });
}

function resetSimulation() {
  simState = 'IDLE';
  simTime = 0;
  proj.x = 0;
  proj.y = h0;
  proj.vx = 0;
  proj.vy = 0;
  proj.v = 0;
  proj.rotation = 0;
  proj.landed = false;
  proj.landX = 0;
  proj.bounceCount = 0;

  pig.x = target.x;
  pig.y = target.y;
  pig.vx = 0;
  pig.vy = 0;
  pig.v = 0;
  pig.rotation = 0;
  pig.rotSpeed = 0;
  pig.isHit = false;
  pig.isFlying = false;
  pig.landed = false;
  pig.landX = target.x;

  collisionData = null;
  target.isHit = false;

  currentTrail = [];
  pigTrail = [];
  sampledNodes = [];
  pigSampledNodes = [];
  selectedNode = null;
  particles = [];
  confetti = [];
  woodDebris = [];
  comicEffects = [];
  screenShake = 0;

  // Reset posisi kotak-kotak kayu
  initTargetFortress(target.x, target.y);

  let pauseBtn = buttons.find(b => b.label.includes('JEDA') || b.label.includes('LANJUT'));
  if (pauseBtn) {
    pauseBtn.label = '⏸ JEDA';
    pauseBtn.baseColor = '#2196f3';
    pauseBtn.hoverColor = '#1976d2';
  }
}

function randomizeTarget() {
  target.x = Math.round(random(35, 120));
  target.y = Math.round(random(2, 28));
  initTargetFortress(target.x, target.y);
  target.isHit = false;
  resetSimulation();
}

// =========================================================================================
// BAGIAN 7: PENGGAMBARAN ALAM & LINGKUNGAN KARTUN
// =========================================================================================
function drawCartoonEnvironment() {
  // Gradien langit biru cerah
  for (let y = 0; y < GROUND_Y; y += 4) {
    let inter = map(y, 0, GROUND_Y, 0, 1);
    let c = lerpColor(color(186, 230, 253), color(224, 242, 254), inter);
    stroke(c);
    strokeWeight(4);
    line(0, y, width, y);
  }

  // Matahari kartun cerah berkilau
  noStroke();
  fill(255, 235, 59, 120);
  ellipse(width - 130, 95, 105, 105);
  fill(255, 214, 0);
  ellipse(width - 130, 95, 75, 75);

  drawClouds();

  // Bukit-bukit kartun di kejauhan
  fill(167, 243, 208);
  arc(220, GROUND_Y, 440, 190, PI, TWO_PI);
  fill(110, 231, 183);
  arc(580, GROUND_Y, 520, 220, PI, TWO_PI);
  fill(52, 211, 153);
  arc(930, GROUND_Y, 480, 170, PI, TWO_PI);

  // Permukaan tanah rumput hijau cerah & lapisan tanah cokelat
  fill(34, 197, 94);
  stroke(22, 163, 74);
  strokeWeight(2);
  rect(0, GROUND_Y, width, 18);

  // Lapisan tanah bawah
  fill(146, 64, 14);
  noStroke();
  rect(0, GROUND_Y + 18, width, height - (GROUND_Y + 18));

  // Pola rumput bergerigi
  fill(74, 222, 128);
  for (let gx = 0; gx < width; gx += 16) {
    triangle(gx, GROUND_Y, gx + 8, GROUND_Y - 5, gx + 16, GROUND_Y);
  }
}

function drawClouds() {
  push();
  noStroke();
  fill(255, 255, 255, 220);
  for (let cl of clouds) {
    cl.x += cl.speed;
    if (cl.x > width + 80) cl.x = -80;
    push();
    translate(cl.x, cl.y);
    scale(cl.scale);
    ellipse(0, 0, 60, 40);
    ellipse(20, -10, 50, 45);
    ellipse(-20, -5, 45, 35);
    ellipse(35, 5, 40, 25);
    pop();
  }
  pop();
}

// =========================================================================================
// BAGIAN 8: PENGGARIS SKALA SATUAN METER (GRID SYSTEM)
// =========================================================================================
function drawMeterRuler(Xmax, Hmax) {
  push();
  let maxMeter = Math.max(Xmax, target.x + 20, Math.abs(proj.x) + 20, 30);
  let stepMeter = 10;
  if (meterToPixel < 2.0) stepMeter = 20;
  if (meterToPixel < 1.0) stepMeter = 50;

  stroke(148, 163, 184, 90);
  strokeWeight(1);
  drawingContext.setLineDash([3, 5]);

  for (let m = 0; m <= maxMeter; m += stepMeter) {
    let px = ORIGIN_X + m * meterToPixel;
    if (px > width - 15) break;
    line(px, 35, px, GROUND_Y);
  }

  for (let ym = stepMeter; ym <= Hmax + 25; ym += stepMeter) {
    let py = GROUND_Y - ym * meterToPixel;
    if (py < 35) break;
    line(ORIGIN_X - 25, py, width - 15, py);
  }
  drawingContext.setLineDash([]);

  // Label angka meter horizontal
  fill(71, 85, 105);
  noStroke();
  textSize(9.5);
  textAlign(CENTER, TOP);
  for (let m = 0; m <= maxMeter; m += stepMeter) {
    let px = ORIGIN_X + m * meterToPixel;
    if (px > width - 20) break;
    text(m + 'm', px, GROUND_Y + 4);
  }

  // Label angka meter vertikal
  textAlign(RIGHT, CENTER);
  for (let ym = stepMeter; ym <= Hmax + 25; ym += stepMeter) {
    let py = GROUND_Y - ym * meterToPixel;
    if (py < 40) break;
    text(ym + 'm', ORIGIN_X - 8, py);
  }
  pop();
}

// =========================================================================================
// BAGIAN 9: PENGGAMBARAN PLATFORM TEBING KAYU (h0)
// =========================================================================================
function drawWoodenPlatform(baseX, groundY, cannonY, currentH0) {
  if (currentH0 <= 0) return;

  push();
  let platW = 54;
  let topH = 14;

  fill(180, 115, 60);
  stroke(110, 60, 20);
  strokeWeight(2);
  rect(baseX - platW / 2, cannonY, platW, groundY - cannonY, 2);

  for (let y = cannonY + 18; y < groundY - 8; y += 22) {
    line(baseX - platW / 2, y, baseX + platW / 2, y);
    fill(90, 45, 15);
    noStroke();
    ellipse(baseX - platW / 2 + 6, y - 9, 3.5, 3.5);
    ellipse(baseX + platW / 2 - 6, y - 9, 3.5, 3.5);
    stroke(110, 60, 20);
    strokeWeight(2);
  }

  fill(210, 140, 75);
  stroke(110, 60, 20);
  strokeWeight(2.5);
  rect(baseX - platW / 2 - 8, cannonY - topH / 2, platW + 16, topH, 4);

  fill(255);
  stroke(110, 60, 20);
  strokeWeight(1.8);
  rect(baseX - 32, cannonY + (groundY - cannonY) / 2 - 11, 64, 20, 5);

  noStroke();
  fill(110, 60, 20);
  textSize(9.5);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text('h₀ = ' + currentH0 + 'm', baseX, cannonY + (groundY - cannonY) / 2 - 1);
  textStyle(NORMAL);

  if (simState === 'IDLE') {
    fill(255, 152, 0);
    stroke(110, 60, 20);
    strokeWeight(1.5);
    rect(baseX + platW / 2 + 10, cannonY - 14, 18, 28, 4);
    fill(255);
    noStroke();
    triangle(baseX + platW / 2 + 19, cannonY - 10, baseX + platW / 2 + 14, cannonY - 4, baseX + platW / 2 + 24, cannonY - 4);
    triangle(baseX + platW / 2 + 19, cannonY + 10, baseX + platW / 2 + 14, cannonY + 4, baseX + platW / 2 + 24, cannonY + 4);
  }
  pop();
}

// =========================================================================================
// BAGIAN 10: PENGGAMBARAN PELUNCUR MERIAM & KETAPEL ANGRY BIRDS (DRAG 360°)
// =========================================================================================
function drawCartoonLauncher(baseX, cannonY, angle) {
  push();
  translate(baseX, cannonY);

  let dMouse = dist(mouseX, mouseY, baseX, cannonY);
  let isHover = (dMouse < 85 && simState === 'IDLE');

  // Indikator area interaksi ketapel saat hover atau drag
  if (isHover || isAimingCannon) {
    fill(255, 235, 59, 40);
    stroke(255, 193, 7, 180);
    strokeWeight(1.5);
    drawingContext.setLineDash([4, 4]);
    ellipse(0, 0, 130, 130);
    drawingContext.setLineDash([]);
  }

  // Dudukan Poros Peluncur
  fill(160, 95, 45);
  stroke(90, 45, 15);
  strokeWeight(2.5);
  ellipse(0, 4, 34, 34);
  fill(210, 140, 75);
  ellipse(0, 4, 18, 18);
  fill(90, 45, 15);
  ellipse(0, 4, 7, 7);

  // Laras Meriam Berputar Mengikuti Sudut (0 - 360 Derajat!)
  rotate(-radians(angle));

  fill(isAimingCannon ? '#e53935' : '#d32f2f');
  stroke(70, 15, 15);
  strokeWeight(2.5);
  rect(0, -9, 48, 18, 5);

  fill(255, 193, 7);
  stroke(130, 95, 0);
  strokeWeight(2);
  rect(42, -10, 9, 20, 3);

  fill(255, 235, 59);
  stroke(255);
  strokeWeight(1.5);
  ellipse(46, 0, 9, 9);

  // PITA KARET KETAPEL ANGRY BIRDS SAAT DI-DRAG
  if (isAimingCannon && simState === 'IDLE') {
    // Menghitung posisi burung yang ditarik relatif terhadap poros
    let dx = mouseX - baseX;
    let dy = mouseY - cannonY;
    let d = dist(mouseX, mouseY, baseX, cannonY);
    let dClamped = constrain(d, 0, 130);
    let pullRelX = (d > 0 ? (dx / d) * dClamped : 0);
    let pullRelY = (d > 0 ? (dy / d) * dClamped : 0);

    // Ubah koordinat relatif kembali ke sistem koordinat laras meriam
    let localPullX = pullRelX * Math.cos(radians(angle)) - pullRelY * Math.sin(radians(angle));
    let localPullY = pullRelX * Math.sin(radians(angle)) + pullRelY * Math.cos(radians(angle));

    // Dua pita karet elastis ketapel
    stroke(62, 39, 35);
    strokeWeight(4.5);
    line(10, -12, localPullX, localPullY);
    line(10, 12, localPullX, localPullY);
  }

  pop();

  // Label Sudut dan Indikator Busur
  push();
  noFill();
  stroke(255, 87, 34, 160);
  strokeWeight(2);
  arc(baseX, cannonY, 56, 56, -radians(angle), 0);

  fill(255);
  stroke(180, 50, 20);
  strokeWeight(1.8);
  rect(baseX + 32, cannonY - 24, 38, 19, 4);

  noStroke();
  fill(180, 50, 20);
  textSize(10);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(Math.round(angle) + '°', baseX + 51, cannonY - 14);

  // INDIKATOR PENGUKUR DAYA SAAT DRAG KETAPEL
  if (isAimingCannon && simState === 'IDLE') {
    let pGaugeX = baseX;
    let pGaugeY = cannonY - 55;
    let pGaugeW = 140;
    let pGaugeH = 24;

    fill(255, 255, 255, 245);
    stroke(255, 87, 34);
    strokeWeight(1.5);
    rect(pGaugeX - pGaugeW / 2, pGaugeY, pGaugeW, pGaugeH, 6);

    // Bar daya terisi proporsional
    let fillW = map(v0, 10, 100, 4, pGaugeW - 8);
    let powerColor = lerpColor(color(76, 175, 80), color(244, 67, 54), map(v0, 10, 100, 0, 1));
    fill(powerColor);
    noStroke();
    rect(pGaugeX - pGaugeW / 2 + 4, pGaugeY + 4, fillW, pGaugeH - 8, 4);

    fill(20);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(`⚡ v₀: ${v0} m/s | θ: ${angleDeg}°`, pGaugeX, pGaugeY + pGaugeH / 2);
  }
  pop();
}

// =========================================================================================
// BAGIAN 11: PENGGAMBARAN PROYEKTIL KARAKTER & VEKTOR KECEPATAN
// =========================================================================================
function drawCharacterProjectile(baseX, cannonY, ana) {
  let px = baseX;
  let py = cannonY;
  let currentVx = ana.v0x;
  let currentVy = ana.v0y;
  let currentV = v0;

  if (simState === 'IDLE') {
    if (isAimingCannon) {
      // Posisi burung saat ditarik di ketapel
      let dx = mouseX - baseX;
      let dy = mouseY - cannonY;
      let d = dist(mouseX, mouseY, baseX, cannonY);
      let dClamped = constrain(d, 0, 130);
      px = baseX + (d > 0 ? (dx / d) * dClamped : 0);
      py = cannonY + (d > 0 ? (dy / d) * dClamped : 0);
    } else {
      let rad = radians(angleDeg);
      px = baseX + 48 * Math.cos(rad);
      py = cannonY - 48 * Math.sin(rad);
    }
  } else {
    px = ORIGIN_X + proj.x * meterToPixel;
    py = GROUND_Y - proj.y * meterToPixel;
    currentVx = proj.vx;
    currentVy = proj.vy;
    currentV = proj.v;
  }

  // VEKTOR HANYA TAMPIL SAAT TERBANG (TIDAK TAMPIL DI IDLE PREVIEW)
  if (showVectors && simState !== 'LANDED' && simState !== 'IDLE') {
    drawVelocityVectors(px, py, currentVx, currentVy, currentV);
  }

  push();
  translate(px, py);
  if (simState === 'FLYING' || simState === 'LANDED') {
    rotate(proj.rotation);
  } else if (isAimingCannon) {
    rotate(-radians(angleDeg));
  }

  // Badan Bulat Merah Burung Angry Birds
  fill(229, 57, 53);
  stroke(136, 14, 14);
  strokeWeight(2);
  ellipse(0, 0, 22, 22);

  // Perut Putih
  fill(255, 236, 179);
  noStroke();
  arc(0, 4, 16, 12, 0, PI);

  // Mata Karakter
  fill(255);
  stroke(40);
  strokeWeight(1);
  ellipse(4, -3, 6, 7);
  ellipse(-2, -3, 6, 7);

  // Pupil Mata Hitam
  fill(20);
  noStroke();
  ellipse(5, -3, 3, 3);
  ellipse(-1, -3, 3, 3);

  // Alis Hitam Khas Angry Birds
  stroke(20);
  strokeWeight(2);
  line(-5, -8, 2, -6);
  line(2, -6, 8, -8);

  // Paruh Kuning
  fill(255, 179, 0);
  stroke(180, 110, 0);
  strokeWeight(1);
  triangle(4, -1, 4, 4, 12, 1.5);

  // Jambul Bulu di Atas Kepala
  fill(229, 57, 53);
  stroke(136, 14, 14);
  strokeWeight(1.5);
  beginShape();
  vertex(-2, -10);
  vertex(-5, -16);
  vertex(-1, -12);
  vertex(2, -17);
  vertex(2, -10);
  endShape(CLOSE);
  pop();
}

function drawVelocityVectors(px, py, vx_val, vy_val, v_res) {
  let scaleV = 1.1;
  push();
  drawArrow(px, py, px + vx_val * scaleV, py, color(33, 150, 243), 'vₓ: ' + vx_val.toFixed(1), 2.5);
  drawArrow(px, py, px, py - vy_val * scaleV, color(76, 175, 80), 'vᵧ: ' + vy_val.toFixed(1), 2.5);
  drawArrow(px, py, px + vx_val * scaleV, py - vy_val * scaleV, color(255, 111, 0), 'v: ' + v_res.toFixed(1), 3);
  pop();
}

function drawArrow(x1, y1, x2, y2, arrowColor, label, weight) {
  push();
  stroke(arrowColor);
  strokeWeight(weight);
  fill(arrowColor);
  line(x1, y1, x2, y2);

  let angle = Math.atan2(y2 - y1, x2 - x1);
  let arrowSize = 6.5;
  translate(x2, y2);
  rotate(angle);
  triangle(0, 0, -arrowSize, arrowSize * 0.45, -arrowSize, -arrowSize * 0.45);
  rotate(-angle);
  translate(-x2, -y2);

  if (label !== '') {
    noStroke();
    textSize(9);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    let midX = (x1 + x2) / 2 + 10 * Math.sin(Math.atan2(y2 - y1, x2 - x1));
    let midY = (y1 + y2) / 2 - 10 * Math.cos(Math.atan2(y2 - y1, x2 - x1));
    text(label, midX, midY);
    textStyle(NORMAL);
  }
  pop();
}

// =========================================================================================
// BAGIAN 12: PENGGAMBARAN KOTAK TARGET KAYU (DESTRUCTIBLE BOXES) & BABI ANGRY BIRDS
// =========================================================================================
function drawDestructibleBoxes() {
  push();
  for (let box of boxes) {
    if (box.isDestroyed) continue;

    let px = ORIGIN_X + box.x * meterToPixel;
    let py = GROUND_Y - box.y * meterToPixel;
    let pw = box.w * meterToPixel;
    let ph = box.h * meterToPixel;

    push();
    translate(px, py);
    rotate(box.rot + box.wobble);

    // Warna balok kayu
    if (box.colorType === 'beam') {
      fill(198, 134, 66);
      stroke(92, 56, 24);
    } else if (box.colorType === 'wood2') {
      fill(214, 150, 78);
      stroke(92, 56, 24);
    } else {
      fill(184, 115, 51);
      stroke(92, 56, 24);
    }
    strokeWeight(2.2);

    // Kotak Utama
    rect(-pw / 2, -ph / 2, pw, ph, 3);

    // Pola Palang Kayu Silang (X-Braces)
    stroke(92, 56, 24, 160);
    strokeWeight(1.6);
    line(-pw / 2 + 3, -ph / 2 + 3, pw / 2 - 3, ph / 2 - 3);
    line(-pw / 2 + 3, ph / 2 - 3, pw / 2 - 3, -ph / 2 + 3);

    // Baut Besi di Sudut
    fill(60);
    noStroke();
    ellipse(-pw / 2 + 4, -ph / 2 + 4, 3, 3);
    ellipse(pw / 2 - 4, -ph / 2 + 4, 3, 3);
    ellipse(-pw / 2 + 4, ph / 2 - 4, 3, 3);
    ellipse(pw / 2 - 4, ph / 2 - 4, 3, 3);

    // EFEK AMBANG KERUSAKAN: RETAKAN NYATA PADA KAYU JIKA RUSAK SEDANG
    if (box.damageState === 2 || (box.hp < 70 && box.hp > 0)) {
      stroke(40, 15, 5);
      strokeWeight(2.2);
      line(-pw * 0.25, -ph * 0.35, 0, -ph * 0.1);
      line(0, -ph * 0.1, -pw * 0.1, ph * 0.15);
      line(-pw * 0.1, ph * 0.15, pw * 0.2, ph * 0.3);
      line(0, -ph * 0.1, pw * 0.25, -ph * 0.25);
    }

    // Mini Bar Darah (Health Bar) jika pernah terkena
    if (box.hp < box.maxHp) {
      let barW = pw * 0.7;
      let fillHp = map(box.hp, 0, box.maxHp, 0, barW);
      fill(0, 0, 0, 160);
      noStroke();
      rect(-barW / 2, -ph / 2 - 7, barW, 4, 2);
      fill(box.hp > 35 ? '#76ff03' : '#ff1744');
      rect(-barW / 2, -ph / 2 - 7, fillHp, 4, 2);
    }

    pop();
  }
  pop();
}

function drawChallengeTarget() {
  push();
  let tPx = ORIGIN_X + target.x * meterToPixel;
  let tPy = GROUND_Y - target.y * meterToPixel;

  if (!pig.isHit && !pig.isFlying) {
    // -------------------------------------------------------------------------------------
    // BABI HIJAU ANGRY BIRDS SIAGA DI ATAS BENTENG
    // -------------------------------------------------------------------------------------
    let pPx = ORIGIN_X + pig.x * meterToPixel;
    let pPy = GROUND_Y - pig.y * meterToPixel;
    let breath = Math.sin(frameCount * 0.08) * 1.2;
    pPy += breath;

    // Telinga Babi
    fill(92, 184, 92);
    stroke(46, 125, 50);
    strokeWeight(2);
    ellipse(pPx - 11, pPy - 13, 8, 10);
    ellipse(pPx + 11, pPy - 13, 8, 10);
    fill(46, 125, 50);
    noStroke();
    ellipse(pPx - 11, pPy - 13, 4, 6);
    ellipse(pPx + 11, pPy - 13, 4, 6);

    // Badan Bulat Babi Hijau
    fill(139, 195, 74);
    stroke(46, 125, 50);
    strokeWeight(2.5);
    ellipse(pPx, pPy, 32, 28);

    // Sorot Cahaya Badan
    fill(178, 223, 138, 140);
    noStroke();
    ellipse(pPx - 4, pPy - 7, 18, 10);

    // Hidung / Moncong
    fill(165, 214, 167);
    stroke(46, 125, 50);
    strokeWeight(2);
    ellipse(pPx, pPy + 2, 14, 10);
    fill(46, 125, 50);
    noStroke();
    ellipse(pPx - 3.5, pPy + 2, 3, 4);
    ellipse(pPx + 3.5, pPy + 2, 3, 4);

    // Mata Besar Kartun
    fill(255);
    stroke(30);
    strokeWeight(1.2);
    ellipse(pPx - 7, pPy - 4, 7.5, 8);
    ellipse(pPx + 7, pPy - 4, 7.5, 8);
    fill(20);
    noStroke();
    ellipse(pPx - 8.5, pPy - 4, 3.5, 3.5);
    ellipse(pPx + 5.5, pPy - 4, 3.5, 3.5);
    fill(255);
    ellipse(pPx - 9.5, pPy - 5, 1.2, 1.2);
    ellipse(pPx + 4.5, pPy - 5, 1.2, 1.2);

    // Alis Babi
    stroke(46, 125, 50);
    strokeWeight(2);
    noFill();
    arc(pPx - 7, pPy - 8.5, 7, 4, PI + 0.3, TWO_PI);
    arc(pPx + 7, pPy - 8.5, 7, 4, PI, TWO_PI - 0.3);

    // Badge Koordinat Target di Atas Babi
    fill(255);
    stroke(105, 55, 20);
    strokeWeight(2);
    rect(pPx - 42, pPy - 36, 84, 19, 5);

    noStroke();
    fill(105, 55, 20);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(`🎯 X:${target.x}m Y:${Math.round(target.y)}m`, pPx, pPy - 26);
    textStyle(NORMAL);

  } else {
    // -------------------------------------------------------------------------------------
    // PASCA-TUMBUKAN: BABI TERPENTAL SECARA FISIK ATAU MENDARAT PINGSAN
    // -------------------------------------------------------------------------------------
    if (pig.isFlying && !pig.landed) {
      let pPx = ORIGIN_X + pig.x * meterToPixel;
      let pPy = GROUND_Y - pig.y * meterToPixel;

      push();
      translate(pPx, pPy);
      rotate(pig.rotation);

      fill(92, 184, 92);
      stroke(46, 125, 50);
      strokeWeight(2);
      ellipse(-12, -14, 7, 11);
      ellipse(12, -14, 7, 11);

      fill(139, 195, 74);
      stroke(46, 125, 50);
      strokeWeight(2.5);
      ellipse(0, 0, 32, 30);

      fill(165, 214, 167);
      stroke(46, 125, 50);
      strokeWeight(2);
      ellipse(0, 1, 14, 10);
      fill(46, 125, 50);
      noStroke();
      ellipse(-3.5, 1, 3, 4);
      ellipse(3.5, 1, 3, 4);

      fill(255);
      stroke(30);
      strokeWeight(1.5);
      ellipse(-7, -6, 9, 9);
      ellipse(7, -6, 9, 9);
      fill(20);
      noStroke();
      ellipse(-7, -6, 3, 3);
      ellipse(7, -6, 3, 3);

      fill(60, 20, 20);
      stroke(46, 125, 50);
      strokeWeight(1.5);
      ellipse(0, 8, 9, 8);
      fill(255, 112, 67);
      noStroke();
      ellipse(0, 9.5, 6, 4);

      pop();

    } else if (pig.landed) {
      let pPx = ORIGIN_X + pig.landX * meterToPixel;
      let pPy = GROUND_Y - 9;

      push();
      translate(pPx, pPy);

      fill(139, 195, 74);
      stroke(46, 125, 50);
      strokeWeight(2.5);
      ellipse(0, 0, 36, 18);

      fill(165, 214, 167);
      stroke(46, 125, 50);
      strokeWeight(1.8);
      ellipse(0, 2, 14, 7);

      stroke(30);
      strokeWeight(2.2);
      line(-9, -4, -5, 0);
      line(-5, -4, -9, 0);
      line(5, -4, 9, 0);
      line(9, -4, 5, 0);

      fill(255, 112, 67);
      stroke(180, 40, 20);
      strokeWeight(1.2);
      ellipse(7, 5, 6, 4);

      pop();

      drawDizzyStars(pPx, pPy - 18);
    }
  }
  pop();
}

// =========================================================================================
// BAGIAN 13: TITIK-TITIK SAMPEL LINTASAN & KARTU INSPEKSI DATA (CLICK TO INSPECT)
// =========================================================================================
function drawSampledNodes() {
  hoveredNode = null;
  push();

  // 1. Titik-titik Sampel Burung & Titik Tumbukan Spesial
  for (let pt of sampledNodes) {
    let px = ORIGIN_X + pt.x * meterToPixel;
    let py = GROUND_Y - pt.y * meterToPixel;

    let dMouse = dist(mouseX, mouseY, px, py);
    let isHover = (dMouse < 10);
    if (isHover) hoveredNode = pt;

    let isSelected = (selectedNode === pt);

    if (pt.isCollision) {
      let pulse = Math.sin(frameCount * 0.2) * 3;
      noFill();
      stroke(255, 23, 68, 200);
      strokeWeight(2.5);
      ellipse(px, py, 22 + pulse, 22 + pulse);

      fill(255, 193, 7);
      stroke(213, 0, 0);
      strokeWeight(2.5);
      ellipse(px, py, 14, 14);

      fill(255);
      noStroke();
      ellipse(px, py, 5, 5);

      if (isSelected) {
        stroke(255, 235, 59);
        strokeWeight(3);
        noFill();
        ellipse(px, py, 28, 28);
      }
    } else {
      if (isSelected) {
        noFill();
        stroke(255, 193, 7);
        strokeWeight(3);
        ellipse(px, py, 16 + Math.sin(frameCount * 0.15) * 4, 16 + Math.sin(frameCount * 0.15) * 4);

        drawArrow(px, py, px + pt.vx * 0.9, py, color(33, 150, 243), '', 2);
        drawArrow(px, py, px, py - pt.vy * 0.9, color(76, 175, 80), '', 2);
        drawArrow(px, py, px + pt.vx * 0.9, py - pt.vy * 0.9, color(255, 111, 0), '', 2.4);
      }

      let baseCol = (pt.phase === 2) ? '#ffb300' : '#ffd54f';
      let strokeCol = (pt.phase === 2) ? '#e65100' : '#bf360c';
      fill(isSelected ? '#ff9800' : (isHover ? '#ffffff' : baseCol));
      stroke(isSelected ? '#ffffff' : (isHover ? '#ff5722' : strokeCol));
      strokeWeight(isHover || isSelected ? 2.5 : 1.5);
      ellipse(px, py, isHover ? 11 : 7.5, isHover ? 11 : 7.5);
    }
  }

  // 2. Titik-titik Sampel Babi
  for (let pt of pigSampledNodes) {
    let px = ORIGIN_X + pt.x * meterToPixel;
    let py = GROUND_Y - pt.y * meterToPixel;

    let dMouse = dist(mouseX, mouseY, px, py);
    let isHover = (dMouse < 10);
    if (isHover) hoveredNode = pt;

    let isSelected = (selectedNode === pt);

    if (isSelected) {
      noFill();
      stroke(118, 255, 3);
      strokeWeight(3);
      ellipse(px, py, 16 + Math.sin(frameCount * 0.15) * 4, 16 + Math.sin(frameCount * 0.15) * 4);

      drawArrow(px, py, px + pt.vx * 0.9, py, color(33, 150, 243), '', 2);
      drawArrow(px, py, px, py - pt.vy * 0.9, color(76, 175, 80), '', 2);
      drawArrow(px, py, px + pt.vx * 0.9, py - pt.vy * 0.9, color(76, 175, 80), '', 2.4);
    }

    fill(isSelected ? '#69f0ae' : (isHover ? '#ffffff' : '#76ff03'));
    stroke(isSelected ? '#ffffff' : (isHover ? '#2e7d32' : '#1b5e20'));
    strokeWeight(isHover || isSelected ? 2.5 : 1.5);
    ellipse(px, py, isHover ? 11 : 7.5, isHover ? 11 : 7.5);
  }

  pop();
}

function drawNodeInspectorCard(node) {
  push();
  let px = ORIGIN_X + node.x * meterToPixel;
  let py = GROUND_Y - node.y * meterToPixel;

  if (node.isCollision) {
    let cardW = 260;
    let cardH = 175;
    let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
    let cardY = constrain(py - cardH - 22, 25, GROUND_Y - cardH - 10);

    fill(255);
    noStroke();
    triangle(px, py - 4, px - 8, cardY + cardH, px + 8, cardY + cardH);

    fill(255);
    stroke(229, 57, 53);
    strokeWeight(2);
    rect(cardX, cardY, cardW, cardH, 10);

    fill(229, 57, 53);
    noStroke();
    rect(cardX, cardY, cardW, 26, 10, 10, 0, 0);

    fill(255);
    textSize(10.5);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text('💥 ANALISIS TUMBUKAN 2D', cardX + 10, cardY + 13);

    fill(255, 200, 200);
    textAlign(RIGHT, CENTER);
    text('[×]', cardX + cardW - 10, cardY + 13);

    let sy = cardY + 38;
    let lh = 17;
    drawInspectorRow('Waktu Tumbuk (t)', node.t.toFixed(2) + ' s', cardX + 10, sy);
    drawInspectorRow('Titik Koordinat (x, y)', `(${node.x.toFixed(1)}m, ${node.y.toFixed(1)}m)`, cardX + 10, sy + lh);
    drawInspectorRow('Massa Objek', 'm₁=1.0kg, m₂=1.3kg', cardX + 10, sy + lh * 2);
    drawInspectorRow('Laju Burung Awal (v₁)', `${node.v1_before.toFixed(2)} m/s`, cardX + 10, sy + lh * 3);
    drawInspectorRow('Laju Burung Defleksi (v₁\')', `${node.v1_after.toFixed(2)} m/s`, cardX + 10, sy + lh * 4);
    drawInspectorRow('Laju Babi Terpental (v₂\')', `${node.v2_after.toFixed(2)} m/s`, cardX + 10, sy + lh * 5);
    drawInspectorRow('Koefisien Restitusi (e)', `${node.e.toFixed(2)} (Lenting Sebagian)`, cardX + 10, sy + lh * 6);
    drawInspectorRow('Kekekalan Momentum', 'm₁v₁ = m₁v₁\' + m₂v₂\'', cardX + 10, sy + lh * 7);

  } else if (node.entity === 'pig') {
    let cardW = 230;
    let cardH = 142;
    let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
    let cardY = constrain(py - cardH - 20, 25, GROUND_Y - cardH - 10);

    fill(255);
    noStroke();
    triangle(px, py - 4, px - 8, cardY + cardH, px + 8, cardY + cardH);

    fill(255);
    stroke(76, 175, 80);
    strokeWeight(2);
    rect(cardX, cardY, cardW, cardH, 10);

    fill(46, 125, 50);
    noStroke();
    rect(cardX, cardY, cardW, 25, 10, 10, 0, 0);

    fill(255);
    textSize(10.5);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text('🐷 TITIK LINTASAN BABI', cardX + 10, cardY + 12);

    fill(200, 240, 200);
    textAlign(RIGHT, CENTER);
    text('[×]', cardX + cardW - 10, cardY + 12);

    let sy = cardY + 36;
    let lh = 17;
    drawInspectorRow('Waktu Tempuh (t)', node.t.toFixed(2) + ' s', cardX + 10, sy);
    drawInspectorRow('Posisi Babi (x, y)', `(${node.x.toFixed(1)}m, ${node.y.toFixed(1)}m)`, cardX + 10, sy + lh);
    drawInspectorRow('Resultan Laju (v)', node.v.toFixed(2) + ' m/s', cardX + 10, sy + lh * 2);
    drawInspectorRow('Kecepatan Horizontal (vₓ)', node.vx.toFixed(2) + ' m/s', cardX + 10, sy + lh * 3);
    drawInspectorRow('Kecepatan Vertikal (vᵧ)', node.vy.toFixed(2) + ' m/s', cardX + 10, sy + lh * 4);
    drawInspectorRow('Arah Gerak (Sudut θ)', node.deg.toFixed(1) + '°', cardX + 10, sy + lh * 5);

  } else {
    let cardW = 225;
    let cardH = 142;
    let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
    let cardY = constrain(py - cardH - 20, 25, GROUND_Y - cardH - 10);

    fill(255);
    noStroke();
    triangle(px, py - 4, px - 8, cardY + cardH, px + 8, cardY + cardH);

    fill(255);
    stroke(255, 111, 0);
    strokeWeight(2);
    rect(cardX, cardY, cardW, cardH, 10);

    fill(255, 111, 0);
    noStroke();
    rect(cardX, cardY, cardW, 25, 10, 10, 0, 0);

    fill(255);
    textSize(10.5);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    let phaseTitle = (node.phase === 2) ? '📍 TITIK BURUNG (PASCA)' : '📍 TITIK BURUNG (AWAL)';
    text(phaseTitle, cardX + 10, cardY + 12);

    fill(255, 230, 200);
    textAlign(RIGHT, CENTER);
    text('[×]', cardX + cardW - 10, cardY + 12);

    let sy = cardY + 36;
    let lh = 17;
    drawInspectorRow('Waktu Tempuh (t)', node.t.toFixed(2) + ' s', cardX + 10, sy);
    drawInspectorRow('Posisi Burung (x, y)', `(${node.x.toFixed(1)}m, ${node.y.toFixed(1)}m)`, cardX + 10, sy + lh);
    drawInspectorRow('Resultan Laju (v)', node.v.toFixed(2) + ' m/s', cardX + 10, sy + lh * 2);
    drawInspectorRow('Kecepatan Horizontal (vₓ)', node.vx.toFixed(2) + ' m/s', cardX + 10, sy + lh * 3);
    drawInspectorRow('Kecepatan Vertikal (vᵧ)', node.vy.toFixed(2) + ' m/s', cardX + 10, sy + lh * 4);
    drawInspectorRow('Arah Gerak (Sudut θ)', node.deg.toFixed(1) + '°', cardX + 10, sy + lh * 5);
  }
  pop();
}

function drawInspectorRow(label, val, x, y) {
  noStroke();
  fill(80);
  textSize(9.5);
  textAlign(LEFT, CENTER);
  text(label, x, y);

  fill(20);
  textStyle(BOLD);
  textAlign(RIGHT, CENTER);
  text(val, x + 205, y);
  textStyle(NORMAL);
}

// =========================================================================================
// BAGIAN 14: LINTASAN TEORETIS & PENANDA TITIK KUNCI (Hmax & Xmax)
// =========================================================================================
function drawTheoreticalPath(v_init, deg, y0, g_acc, t_total) {
  push();
  stroke(255, 255, 255, 180);
  strokeWeight(2.4);
  drawingContext.setLineDash([6, 6]);
  noFill();

  let rad = radians(deg);
  let v0x_val = v_init * Math.cos(rad);
  let v0y_val = v_init * Math.sin(rad);

  beginShape();
  let step = (t_total > 0 ? t_total / 85 : 0.05);
  for (let t = 0; t <= t_total; t += step) {
    let x = v0x_val * t;
    let y = y0 + v0y_val * t - 0.5 * g_acc * t * t;
    if (y < 0) y = 0;
    vertex(ORIGIN_X + x * meterToPixel, GROUND_Y - y * meterToPixel);
  }
  endShape();
  drawingContext.setLineDash([]);
  pop();
}

function drawPastTrails() {
  push();
  for (let i = 0; i < pastTrails.length; i++) {
    let tr = pastTrails[i];
    let alphaVal = map(i, 0, pastTrails.length - 1, 35, 110);
    strokeWeight(1.8);
    noFill();
    stroke(255, 255, 255, alphaVal);
    beginShape();
    for (let pt of tr) {
      vertex(ORIGIN_X + pt.x * meterToPixel, GROUND_Y - pt.y * meterToPixel);
    }
    endShape();
  }
  pop();
}

function drawCurrentTrail() {
  push();

  // 1. Jejak Lintasan Burung
  if (currentTrail.length >= 2) {
    noFill();
    strokeWeight(3.2);

    let currentPhase = currentTrail[0].phase || 1;
    stroke(currentPhase === 2 ? '#ffb300' : '#ff5722');
    beginShape();
    for (let i = 0; i < currentTrail.length; i++) {
      let pt = currentTrail[i];
      let p = pt.phase || 1;
      if (p !== currentPhase) {
        endShape();
        currentPhase = p;
        stroke(currentPhase === 2 ? '#ffb300' : '#ff5722');
        beginShape();
        if (i > 0) vertex(ORIGIN_X + currentTrail[i - 1].x * meterToPixel, GROUND_Y - currentTrail[i - 1].y * meterToPixel);
      }
      vertex(ORIGIN_X + pt.x * meterToPixel, GROUND_Y - pt.y * meterToPixel);
    }
    endShape();
  }

  // 2. Jejak Lintasan Babi
  if (pigTrail.length >= 2) {
    noFill();
    stroke(118, 255, 3);
    strokeWeight(3.2);
    beginShape();
    for (let pt of pigTrail) {
      vertex(ORIGIN_X + pt.x * meterToPixel, GROUND_Y - pt.y * meterToPixel);
    }
    endShape();
  }
  pop();
}

function drawMarkers(ana) {
  // Hanya tampil setelah ditembakkan (simState !== 'IDLE')
  if (simState === 'IDLE') return;

  push();

  // 1. Penanda Titik Puncak H_maks
  if (ana.Hmax > 0.5) {
    let peakPx = ORIGIN_X + ana.xPeak * meterToPixel;
    let peakPy = GROUND_Y - ana.Hmax * meterToPixel;

    stroke(255, 193, 7);
    strokeWeight(1.5);
    drawingContext.setLineDash([4, 4]);
    line(peakPx, peakPy, peakPx, GROUND_Y);
    line(ORIGIN_X, peakPy, peakPx, peakPy);
    drawingContext.setLineDash([]);

    fill(255, 235, 59);
    stroke(190, 130, 0);
    strokeWeight(2);
    ellipse(peakPx, peakPy, 11, 11);

    let hBadgeW = 86;
    let hBadgeH = 18;
    let hBadgeX = constrain(peakPx, hBadgeW / 2 + 15, width - hBadgeW / 2 - 15);
    let hBadgeY = Math.max(30, peakPy - 24);

    fill(255, 248, 225);
    stroke(190, 130, 0);
    strokeWeight(1.5);
    rect(hBadgeX - hBadgeW / 2, hBadgeY, hBadgeW, hBadgeH, 4);

    noStroke();
    fill(130, 75, 0);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('Hₘₐₖₛ: ' + ana.Hmax.toFixed(1) + 'm', hBadgeX, hBadgeY + hBadgeH / 2);
    textStyle(NORMAL);
  }

  // 2. Penanda Pendaratan Akhir Burung (X_maks Burung)
  let birdLandX = (proj.landed && proj.landX > 0) ? proj.landX : (collisionData ? proj.x : ana.Xmax);
  if (Math.abs(birdLandX) > 0.5) {
    let landPx = ORIGIN_X + birdLandX * meterToPixel;
    let landPy = GROUND_Y;

    // Tiang bendera merah
    stroke(229, 57, 53);
    strokeWeight(2.5);
    line(landPx, landPy, landPx, landPy - 26);

    fill(229, 57, 53);
    noStroke();
    triangle(landPx, landPy - 26, landPx, landPy - 14, landPx + 16, landPy - 20);
    ellipse(landPx, landPy, 8, 8);

    // Kotak badge di atas bendera (py - 52) agar bebas dari panel bawah
    let badgeW = 96;
    let badgeH = 20;
    let badgeX = constrain(landPx, badgeW / 2 + 15, width - badgeW / 2 - 15);
    let badgeY = landPy - 52;

    stroke(229, 57, 53, 160);
    strokeWeight(1);
    line(landPx, landPy - 26, badgeX, badgeY + badgeH);

    fill(255, 235, 238);
    stroke(198, 40, 40);
    strokeWeight(1.5);
    rect(badgeX - badgeW / 2, badgeY, badgeW, badgeH, 5);

    noStroke();
    fill(198, 40, 40);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('Xₘₐₖₛ Burung: ' + birdLandX.toFixed(1) + 'm', badgeX, badgeY + badgeH / 2);
    textStyle(NORMAL);
  }

  // 3. Penanda Pendaratan Akhir Babi
  if (collisionData && pig.landX > 1.0 && (pig.landed || simState === 'LANDED')) {
    let pigLandPx = ORIGIN_X + pig.landX * meterToPixel;
    let pigLandPy = GROUND_Y;

    stroke(46, 125, 50);
    strokeWeight(2.5);
    line(pigLandPx, pigLandPy, pigLandPx, pigLandPy - 26);

    fill(76, 175, 80);
    noStroke();
    triangle(pigLandPx, pigLandPy - 26, pigLandPx, pigLandPy - 14, pigLandPx + 16, pigLandPy - 20);
    ellipse(pigLandPx, pigLandPy, 8, 8);

    let bBadgeW = 92;
    let bBadgeH = 20;
    let bBadgeX = constrain(pigLandPx, bBadgeW / 2 + 15, width - bBadgeW / 2 - 15);
    let bBadgeY = pigLandPy - 52;

    stroke(76, 175, 80, 160);
    strokeWeight(1);
    line(pigLandPx, pigLandPy - 26, bBadgeX, bBadgeY + bBadgeH);

    fill(232, 245, 233);
    stroke(46, 125, 50);
    strokeWeight(1.5);
    rect(bBadgeX - bBadgeW / 2, bBadgeY, bBadgeW, bBadgeH, 5);

    noStroke();
    fill(46, 125, 50);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('Xₘₐₖₛ Babi: ' + pig.landX.toFixed(1) + 'm', bBadgeX, bBadgeY + bBadgeH / 2);
    textStyle(NORMAL);
  }

  // 4. Penanda Titik Benturan Tumbukan
  if (collisionData) {
    let colPx = ORIGIN_X + collisionData.x * meterToPixel;
    let colPy = GROUND_Y - collisionData.y * meterToPixel;

    fill(255, 235, 59, 210);
    stroke(213, 0, 0);
    strokeWeight(1.5);
    ellipse(colPx, colPy, 14, 14);

    fill(255, 235, 238);
    stroke(213, 0, 0);
    strokeWeight(1.2);
    rect(colPx - 45, colPy - 26, 90, 17, 4);

    noStroke();
    fill(213, 0, 0);
    textSize(9);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(`💥 Hit (${collisionData.x.toFixed(1)}m, ${collisionData.y.toFixed(1)}m)`, colPx, colPy - 17.5);
    textStyle(NORMAL);
  }
  pop();
}

// =========================================================================================
// BAGIAN 15: EFEK PARTIKEL VISUAL & GAME JUICE KHAS ANGRY BIRDS
// =========================================================================================
function createVictoryConfetti(x, y) {
  let colors = ['#f44336', '#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
  for (let i = 0; i < 45; i++) {
    confetti.push({
      x: x,
      y: y,
      vx: random(-8, 8),
      vy: random(-12, -3),
      size: random(5, 10),
      color: random(colors),
      alpha: 255,
      rot: random(TWO_PI),
      vRot: random(-0.2, 0.2)
    });
  }
}

function createPuffParticles(x, y) {
  for (let i = 0; i < 16; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-2.5, 4),
      vy: random(-3, 3),
      size: random(8, 18),
      alpha: 220,
      decay: random(8, 14),
      color: color(255, random(220, 255), random(200, 255))
    });
  }
}

function createDirtThud(x, y) {
  for (let i = 0; i < 18; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-5, 5),
      vy: random(-7, -1),
      size: random(4, 9),
      alpha: 255,
      decay: random(8, 14),
      color: color(166, 115, 68)
    });
  }
}

function createWoodDebris(x, y, count = 16) {
  let woodColors = ['#8d6e63', '#6d4c41', '#5d4037', '#a1887f', '#d7ccc8'];
  for (let i = 0; i < count; i++) {
    woodDebris.push({
      x: x,
      y: y,
      vx: random(-9, 13),
      vy: random(-14, -3),
      w: random(6, 15),
      h: random(3, 8),
      rot: random(TWO_PI),
      vRot: random(-0.25, 0.25),
      col: random(woodColors),
      alpha: 255
    });
  }
}

function updateWoodDebris() {
  for (let i = woodDebris.length - 1; i >= 0; i--) {
    let d = woodDebris[i];
    d.x += d.vx;
    d.y += d.vy;
    d.vy += 0.5;
    d.rot += d.vRot;

    if (d.y >= GROUND_Y - 2) {
      d.y = GROUND_Y - 2;
      d.vy = -d.vy * 0.45;
      d.vx *= 0.7;
      d.vRot *= 0.6;
    }

    d.alpha -= 2.5;
    if (d.alpha <= 0 || d.x > width + 50) {
      woodDebris.splice(i, 1);
    }
  }
}

function drawWoodDebris() {
  push();
  for (let d of woodDebris) {
    push();
    translate(d.x, d.y);
    rotate(d.rot);
    fill(d.col);
    stroke(50, 30, 10, d.alpha);
    strokeWeight(1);
    rect(-d.w / 2, -d.h / 2, d.w, d.h, 1);
    pop();
  }
  pop();
}

function triggerComicBurst(x, y, text1, text2) {
  comicEffects.push({
    x: x,
    y: y - 25,
    text1: text1,
    text2: text2,
    scale: 0.1,
    targetScale: 1.0,
    alpha: 255,
    life: 75
  });
}

function updateComicEffects() {
  for (let i = comicEffects.length - 1; i >= 0; i--) {
    let c = comicEffects[i];
    c.scale = lerp(c.scale, c.targetScale, 0.25);
    c.life--;
    if (c.life < 25) {
      c.alpha = map(c.life, 25, 0, 255, 0);
    }
    if (c.life <= 0) {
      comicEffects.splice(i, 1);
    }
  }
}

function drawComicEffects() {
  push();
  for (let c of comicEffects) {
    push();
    translate(c.x, c.y);
    scale(c.scale);

    fill(255, 235, 59, c.alpha);
    stroke(213, 0, 0, c.alpha);
    strokeWeight(3);
    beginShape();
    let numPts = 12;
    for (let i = 0; i < numPts * 2; i++) {
      let r = (i % 2 === 0) ? 42 : 24;
      let angle = (i * PI) / numPts;
      vertex(r * Math.cos(angle), r * Math.sin(angle));
    }
    endShape(CLOSE);

    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    fill(100, 0, 0, c.alpha);
    textSize(13);
    text(c.text1, 1, -5);
    textSize(11);
    text(c.text2, 1, 11);

    fill(255, 255, 255, c.alpha);
    textSize(13);
    text(c.text1, 0, -6);
    fill(255, 235, 59, c.alpha);
    textSize(11);
    text(c.text2, 0, 10);

    pop();
  }
  pop();
}

function drawDizzyStars(x, y) {
  push();
  translate(x, y);
  let orbitRadius = 16;
  for (let i = 0; i < 3; i++) {
    let angle = frameCount * 0.12 + (i * TWO_PI) / 3;
    let sx = orbitRadius * Math.cos(angle);
    let sy = (orbitRadius * 0.45) * Math.sin(angle);

    push();
    translate(sx, sy);
    rotate(frameCount * 0.15);
    fill(255, 235, 59);
    stroke(245, 127, 23);
    strokeWeight(1.2);

    beginShape();
    for (let j = 0; j < 10; j++) {
      let r = (j % 2 === 0) ? 5 : 2.5;
      let a = (j * PI) / 5;
      vertex(r * Math.cos(a), r * Math.sin(a));
    }
    endShape(CLOSE);
    pop();
  }
  pop();
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  for (let i = confetti.length - 1; i >= 0; i--) {
    let c = confetti[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.35;
    c.rot += c.vRot;
    c.alpha -= 3;
    if (c.alpha <= 0 || c.y > height) confetti.splice(i, 1);
  }
}

function drawParticles() {
  push();
  noStroke();
  for (let p of particles) {
    p.color.setAlpha(p.alpha);
    fill(p.color);
    ellipse(p.x, p.y, p.size, p.size);
  }

  for (let c of confetti) {
    push();
    translate(c.x, c.y);
    rotate(c.rot);
    fill(c.color);
    rect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
    pop();
  }
  pop();
}

// =========================================================================================
// BAGIAN 16: PANEL TELEMETRI REAL-TIME & PAPAN MISI TANTANGAN
// =========================================================================================
function drawTelemetryOverlay(ana) {
  push();
  let boxX = width - 305;
  let boxY = 22;
  let boxW = 275;
  let boxH = collisionData ? 275 : 220;

  fill(255, 255, 255, 242);
  stroke(255, 179, 0);
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH, 10);

  fill(255, 179, 0);
  noStroke();
  rect(boxX, boxY, boxW, 28, 10, 10, 0, 0);

  fill(255);
  textSize(11);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('📊 TELEMETRI FISIKA', boxX + 12, boxY + 14);

  let statusText = (simState === 'FLYING') ? (proj.bounceCount > 0 ? 'MEMANTUL' : 'MELAYANG') : (simState === 'LANDED' ? 'MENDARAT' : 'SIAP TEMBAK');
  let statusBg = (simState === 'FLYING') ? '#4caf50' : (simState === 'LANDED' ? '#e53935' : '#2196f3');
  fill(statusBg);
  rect(boxX + boxW - 90, boxY + 6, 80, 16, 4);

  fill(255);
  textSize(8.5);
  textAlign(CENTER, CENTER);
  text(statusText, boxX + boxW - 50, boxY + 14);
  textStyle(NORMAL);

  let sy = boxY + 43;
  let lh = 18.5;

  drawWhiteDataRow('Waktu Tempuh (t)', simTime.toFixed(2) + ' s', '#1e293b', boxX + 12, sy);
  drawWhiteDataRow('Posisi Jarak (x)', proj.x.toFixed(2) + ' m', '#1e88e5', boxX + 12, sy + lh);
  drawWhiteDataRow('Posisi Tinggi (y)', Math.max(0, proj.y).toFixed(2) + ' m', '#43a047', boxX + 12, sy + lh * 2);
  drawWhiteDataRow('Kecepatan (vₓ)', proj.vx.toFixed(2) + ' m/s', '#1e88e5', boxX + 12, sy + lh * 3);
  drawWhiteDataRow('Kecepatan (vᵧ)', proj.vy.toFixed(2) + ' m/s', '#43a047', boxX + 12, sy + lh * 4);
  drawWhiteDataRow('Resultan Laju (v)', proj.v.toFixed(2) + ' m/s', '#f57c00', boxX + 12, sy + lh * 5);

  stroke(226, 232, 240);
  strokeWeight(1);
  line(boxX + 10, sy + lh * 6 - 2, boxX + boxW - 10, sy + lh * 6 - 2);

  drawWhiteDataRow('Tinggi Maks (Hₘₐₖₛ)', ana.Hmax.toFixed(2) + ' m', '#ff9800', boxX + 12, sy + lh * 6 + 7);
  let birdLandX = (proj.landed && proj.landX > 0) ? proj.landX : ana.Xmax;
  drawWhiteDataRow('Jarak Burung (Xₘₐₖₛ)', birdLandX.toFixed(2) + ' m', '#e53935', boxX + 12, sy + lh * 7 + 7);

  if (collisionData) {
    stroke(226, 232, 240);
    strokeWeight(1);
    line(boxX + 10, sy + lh * 8 + 6, boxX + boxW - 10, sy + lh * 8 + 6);

    let pigStatus = pig.landed ? 'Mendarat' : 'Terpental';
    drawWhiteDataRow('Posisi Babi (x, y)', `(${pig.x.toFixed(1)}m, ${Math.max(0, pig.y).toFixed(1)}m)`, '#2e7d32', boxX + 12, sy + lh * 9 + 4);
    drawWhiteDataRow('Laju Babi (v)', pig.v.toFixed(2) + ' m/s', '#43a047', boxX + 12, sy + lh * 10 + 4);
    drawWhiteDataRow('Status Babi', pigStatus, pig.landed ? '#e53935' : '#2e7d32', boxX + 12, sy + lh * 11 + 4);
  }
  pop();
}

function drawWhiteDataRow(label, val, valColor, x, y) {
  noStroke();
  fill(100, 116, 139);
  textSize(9.5);
  textAlign(LEFT, CENTER);
  text(label, x, y);

  fill(valColor);
  textSize(10);
  textStyle(BOLD);
  textAlign(RIGHT, CENTER);
  text(val, x + 250, y);
  textStyle(NORMAL);
}

function drawChallengeBanner() {
  push();
  let banX = 30;
  let banY = 22;
  let banW = 320;
  let banH = 50;

  fill(255, 255, 255, 245);
  stroke(226, 232, 240);
  strokeWeight(1.5);
  rect(banX, banY, banW, banH, 8);

  fill(225, 29, 72);
  rect(banX, banY, 6, banH, 8, 0, 0, 8);

  fill(225, 29, 72);
  noStroke();
  textSize(11.5);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('🎯 MISI TANTANGAN SASARAN', banX + 14, banY + 10);

  let boxesDestroyed = boxes.filter(b => b.isDestroyed).length;
  fill(30, 41, 59);
  textSize(10.5);
  textStyle(NORMAL);
  text(`Target: X = ${target.x}m, Y = ${Math.round(target.y)}m  |  Hancur: ${boxesDestroyed}/${boxes.length} Kotak  |  Skor: ${target.score}`, banX + 14, banY + 29);
  pop();
}

// =========================================================================================
// BAGIAN 17: PANEL KONTROL UI BAWAH (PROPORSI KOMPAK & RAPI)
// =========================================================================================
function drawControlInterface() {
  push();
  fill(255, 255, 255, 248);
  stroke(203, 213, 225);
  strokeWeight(1.5);
  rect(30, 498, width - 60, 154, 12);

  fill(51, 65, 85);
  noStroke();
  textSize(11);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('🎛 PENGATUR PARAMETER FISIKA', 45, 517);

  fill(100, 116, 139);
  textSize(9.5);
  textStyle(NORMAL);
  text('💡 Tips: Tarik burung/ketapel langsung untuk membidik 360° & laju awal, lalu lepaskan untuk menembak!', 245, 517);

  for (let key in sliders) {
    sliders[key].draw();
  }

  for (let btn of buttons) {
    btn.draw();
  }
  pop();
}

// =========================================================================================
// BAGIAN 18: KELAS KOMPONEN UI CANVAS (SLIDER & BUTTON)
// =========================================================================================
class CartoonSlider {
  constructor(x, y, w, minVal, maxVal, defaultVal, label, unit, step = 1, themeColor = '#ff5722') {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = 10;
    this.min = minVal;
    this.max = maxVal;
    this.value = defaultVal;
    this.label = label;
    this.unit = unit;
    this.step = step;
    this.themeColor = themeColor;
    this.isDragging = false;
  }

  draw() {
    push();
    fill(71, 85, 105);
    noStroke();
    textSize(10);
    textStyle(BOLD);
    textAlign(LEFT, BOTTOM);
    text(this.label, this.x, this.y - 6);

    fill(this.themeColor);
    textAlign(RIGHT, BOTTOM);
    let valStr = (this.step < 1) ? this.value.toFixed(1) : Math.round(this.value);
    text(valStr + ' ' + this.unit, this.x + this.w, this.y - 6);

    fill(226, 232, 240);
    stroke(203, 213, 225);
    strokeWeight(1);
    rect(this.x, this.y, this.w, this.h, 5);

    let progressW = map(this.value, this.min, this.max, 0, this.w);
    fill(this.themeColor);
    noStroke();
    rect(this.x, this.y, progressW, this.h, 5);

    let handleX = this.x + progressW;
    fill(255);
    stroke(this.themeColor);
    strokeWeight(2.5);
    ellipse(handleX, this.y + this.h / 2, 18, 18);

    fill(this.themeColor);
    noStroke();
    ellipse(handleX, this.y + this.h / 2, 6, 6);
    pop();
  }

  checkMousePressed(mx, my) {
    let progressW = map(this.value, this.min, this.max, 0, this.w);
    let handleX = this.x + progressW;
    let handleY = this.y + this.h / 2;

    if (dist(mx, my, handleX, handleY) < 14 || (mx >= this.x && mx <= this.x + this.w && my >= this.y - 6 && my <= this.y + this.h + 6)) {
      this.isDragging = true;
      this.updateFromMouse(mx);
      return true;
    }
    return false;
  }

  updateFromMouse(mx) {
    let clampedX = constrain(mx, this.x, this.x + this.w);
    let rawVal = map(clampedX, this.x, this.x + this.w, this.min, this.max);
    if (this.step >= 1) {
      this.value = Math.round(rawVal / this.step) * this.step;
    } else {
      this.value = Math.round(rawVal * 10) / 10;
    }
    this.value = constrain(this.value, this.min, this.max);
  }

  release() {
    this.isDragging = false;
  }
}

class CartoonButton {
  constructor(x, y, w, h, label, baseColor, hoverColor, onClick) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.baseColor = baseColor;
    this.hoverColor = hoverColor;
    this.onClick = onClick;
    this.isHover = false;
  }

  draw() {
    push();
    this.isHover = (mouseX >= this.x && mouseX <= this.x + this.w && mouseY >= this.y && mouseY <= this.y + this.h);

    fill(this.isHover ? this.hoverColor : this.baseColor);
    stroke(0, 0, 0, 40);
    strokeWeight(1.2);
    rect(this.x, this.y, this.w, this.h, 7);

    fill(255);
    noStroke();
    textSize(10.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(this.label, this.x + this.w / 2, this.y + this.h / 2);
    pop();
  }

  checkClick(mx, my) {
    if (mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h) {
      if (this.onClick) this.onClick();
      return true;
    }
    return false;
  }
}

// =========================================================================================
// BAGIAN 19: PENANGANAN INTERAKSI MOUSE (ANGRY BIRDS SLINGSHOT DRAG & 360° AIM)
// =========================================================================================
function updateMouseCursor(cannonY) {
  let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
  let isNearCannon = (dCannon < 85 && simState === 'IDLE');
  let isNearPlatform = (h0 > 0 && mouseX >= 25 && mouseX <= ORIGIN_X + 25 && mouseY >= cannonY - 15 && mouseY <= cannonY + 15 && simState === 'IDLE');

  if (hoveredNode) {
    cursor('pointer');
  } else if (isAimingCannon) {
    cursor('crosshair');
  } else if (isDraggingPlatform) {
    cursor('ns-resize');
  } else if (isNearCannon) {
    cursor('grab');
  } else if (isNearPlatform) {
    cursor('ns-resize');
  } else {
    cursor(ARROW);
  }
}

function mousePressed() {
  let cannonY = GROUND_Y - h0 * meterToPixel;

  // 1. Cek Klik Titik Sampel Burung & Tumbukan
  for (let pt of sampledNodes) {
    let px = ORIGIN_X + pt.x * meterToPixel;
    let py = GROUND_Y - pt.y * meterToPixel;
    if (dist(mouseX, mouseY, px, py) < 12) {
      selectedNode = pt;
      return;
    }
  }

  // 2. Cek Klik Titik Sampel Babi
  for (let pt of pigSampledNodes) {
    let px = ORIGIN_X + pt.x * meterToPixel;
    let py = GROUND_Y - pt.y * meterToPixel;
    if (dist(mouseX, mouseY, px, py) < 12) {
      selectedNode = pt;
      return;
    }
  }

  // 3. Cek Tombol Tutup [×] pada Kartu Inspeksi
  if (selectedNode) {
    let cardW = selectedNode.isCollision ? 260 : (selectedNode.entity === 'pig' ? 230 : 225);
    let cardH = selectedNode.isCollision ? 175 : 142;
    let px = ORIGIN_X + selectedNode.x * meterToPixel;
    let py = GROUND_Y - selectedNode.y * meterToPixel;
    let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
    let cardY = constrain(py - cardH - 20, 25, GROUND_Y - cardH - 10);
    if (mouseX >= cardX + cardW - 30 && mouseX <= cardX + cardW && mouseY >= cardY && mouseY <= cardY + 28) {
      selectedNode = null;
      return;
    }
  }

  // 4. Interaksi Ketapel Angry Birds (Drag untuk Sudut 360° & Kecepatan v0)
  if (simState === 'IDLE') {
    let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
    if (dCannon < 85) {
      isAimingCannon = true;
      updateSlingshotFromMouse(cannonY);
      return;
    }

    if (mouseX >= 25 && mouseX <= ORIGIN_X + 30 && Math.abs(mouseY - cannonY) < 20) {
      isDraggingPlatform = true;
      updateHeightFromMouse();
      return;
    }
  }

  // 5. Cek Slider Kontrol
  for (let key in sliders) {
    if (sliders[key].checkMousePressed(mouseX, mouseY)) return;
  }

  // 6. Cek Tombol Kontrol
  for (let btn of buttons) {
    if (btn.checkClick(mouseX, mouseY)) return;
  }
}

function mouseDragged() {
  let cannonY = GROUND_Y - h0 * meterToPixel;

  if (isAimingCannon && simState === 'IDLE') {
    updateSlingshotFromMouse(cannonY);
    return;
  }

  if (isDraggingPlatform && simState === 'IDLE') {
    updateHeightFromMouse();
    return;
  }

  for (let key in sliders) {
    if (sliders[key].isDragging) {
      sliders[key].updateFromMouse(mouseX);
      return;
    }
  }
}

function mouseReleased() {
  let cannonY = GROUND_Y - h0 * meterToPixel;

  if (isAimingCannon && simState === 'IDLE') {
    let d = dist(mouseX, mouseY, ORIGIN_X, cannonY);
    isAimingCannon = false;

    // JIKA TARIKAN CUKUP BESAR (> 18px), LEPASKAN TEMBAKAN (MEKANIKA ANGRY BIRDS!)
    if (d > 18) {
      fireProjectile();
    }
    return;
  }

  isDraggingPlatform = false;
  for (let key in sliders) {
    sliders[key].release();
  }
}

function updateSlingshotFromMouse(cannonY) {
  // Vektor tarikan ketapel: Dari mouse ke poros peluncur
  let aimDx = ORIGIN_X - mouseX;
  let aimDy = cannonY - mouseY;

  // Sudut tembakan 360 derajat (berlawanan dengan arah tarikan ketapel)
  let deg = degrees(Math.atan2(aimDy, aimDx));
  if (deg < 0) deg += 360;
  deg = Math.round(deg);
  angleDeg = deg;
  sliders.angle.value = deg;

  // Jarak tarikan menentukan kecepatan awal v0 (seperti game Angry Birds!)
  let d = dist(mouseX, mouseY, ORIGIN_X, cannonY);
  let dClamped = constrain(d, 10, 130);
  let speed = Math.round(map(dClamped, 10, 130, sliders.v0.min, sliders.v0.max));
  v0 = speed;
  sliders.v0.value = speed;
}

function updateHeightFromMouse() {
  let pixelH = GROUND_Y - mouseY;
  let mHeight = pixelH / meterToPixel;
  mHeight = constrain(Math.round(mHeight), 0, 50);
  sliders.h0.value = mHeight;
  h0 = mHeight;
}
