/**
 * SIMULASI FISIKA GERAK PARABOLA & UJI TANTANGAN SASARAN (EDISI ANGRY BIRDS)
 * =========================================================================================
 * Revisi Terkini:
 * 1. Batas Kecepatan Maksimal: Dikurangi dari 100 m/s menjadi 50 m/s agar jangkauan realistis.
 * 2. Peluncur Tetap Berbentuk Meriam Kartun (Bukan Ketapel):
 *    - Dapat ditarik ke depan (membidik langsung ke depan) atau ditarik ke belakang
 *      (meriam tetap membidik dan menembak ke depan/lawan arah tarikan).
 *    - Jarak tarikan mengatur laju awal v0 (10 - 50 m/s) dan sudut 360°.
 * 3. Perbaikan Bug Box Hancur:
 *    - Kotak berada dalam status stabil (isAwake: false) sampai benar-benar ditabrak burung.
 *    - Kotak tidak akan pernah hancur sendiri saat peluru baru lepas dari laras.
 * 4. Posisi Xmaks Parabola Pertama:
 *    - Penanda bendera & badge Xmaks tersimpan tetap pada titik pendaratan lintasan parabola pertama
 *      (secara analitis), bukan posisi setelah pantulan, gesekan guling, atau tumbukan!
 * 5. Preview Tersembunyi:
 *    - Garis putus-putus lintasan dan penanda Xmaks/Hmaks disembunyikan di mode IDLE
 *      dan hanya muncul setelah ditembakkan.
 * 6. Ambang Batas Kerusakan (Damage Threshold):
 *    - Pelan (< 7.5 m/s): Kotak bergoyang, bergeser sedikit, tidak hancur.
 *    - Sedang (7.5 - 17 m/s): Retakan nyata pada kayu, kotak terdorong jatuh.
 *    - Keras (>= 17 m/s): Kotak meledak menjadi 18 serpihan puing kayu berhamburan.
 * 7. Pendaratan Tanah Realistis:
 *    - Burung memantul di tanah (e = 0.42), berguling dengan gesekan rumput, mengepulkan debu,
 *      dan berhenti perlahan secara alami.
 * =========================================================================================
 */

// =========================================================================================
// BAGIAN 1: VARIABEL & PARAMETER SIMULASI
// =========================================================================================

// --- Parameter Fisika Input ---
let v0 = 28;                     // Kecepatan awal proyektil (m/s), batas: 10 - 50 m/s
let angleDeg = 45;               // Sudut elevasi penembakan (derajat), batas: 0 - 360 derajat
let h0 = 12;                     // Ketinggian awal peluncur dari tanah (meter), batas: 0 - 50 m
let gravity = 9.8;               // Percepatan gravitasi (m/s^2), batas: 1 - 20 m/s^2

// Parameter Parabola Pertama (Tersimpan Tetap untuk Penanda Xmaks & Hmaks)
let firstParabolaXmax = 0;
let firstParabolaHmax = 0;
let firstParabolaXpeak = 0;
let initialV0 = 28;
let initialAngleDeg = 45;
let initialH0 = 12;
let initialTTotal = 0;

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
let boxes = [];                  // Array objek kotak: [{ id, x, y, initX, initY, w, h, vx, vy, rot, rotSpeed, mass, hp, maxHp, damageState, wobble, isDestroyed, isAwake }]

// --- Misi Target & Karakter Babi Dinamis ---
let target = {
  x: 58,                         // Posisi horizontal sasaran (meter)
  y: 7,                          // Ketinggian sasaran (meter)
  radius: 3.2,                   // Radius area tabrakan sasaran
  isHit: false,                  // Status terkena tembakan
  score: 0                       // Akumulasi skor pemain
};

let pig = {
  x: 58,
  y: 7,
  initialX: 58,
  initialY: 7,
  vx: 0,
  vy: 0,
  v: 0,
  rotation: 0,
  rotSpeed: 0,
  isFlying: false,
  landed: false,
  landX: 58,
  Hmax: 7
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
let simplePopups = [];           // Pop-up komik (TUMBUKAN!, HANCUR!, THUMP!)
let screenShake = 0;             // Getaran kamera
let clouds = [];                 // Awan kartun

// --- Pengaturan Tampilan Visual (Toggle) ---
let showVectors = true;          // Panah vektor kecepatan
let showTrail = true;            // Garis jejak lintasan
let showTheoreticalPath = true;  // Garis putus-putus analitis (hanya saat terbang)
let showMarkers = true;          // Penanda Hmaks dan Xmaks (hanya saat terbang)
let autoScale = true;            // Skala adaptif otomatis

// --- Interaksi Tarik Meriam & Mouse Dragging ---
let isAimingCannon = false;      // Sedang menarik laras meriam dengan mouse
let isDraggingPlatform = false;  // Sedang menyeret platform tebing h0
let cannonRecoilOffset = 0;      // Efek per/pegas saat ditarik mundur

// --- Konfigurasi Koordinat Kanvas ---
const ORIGIN_X = 90;             // Titik poros peluncur di kanvas (pixel)
const GROUND_Y = 470;            // Garis permukaan tanah (pixel)
const VIEW_W = 880;              // Lebar efektif area pandang (pixel)
const VIEW_H = 410;              // Tinggi efektif area pandang (pixel)
let meterToPixel = 4.2;          // Rasio skala meter ke pixel

// --- Elemen Antarmuka Pengguna (UI Komponen) ---
let sliders = {};
let buttons = [];

// =========================================================================================
// BAGIAN 2: FUNGSI SETUP (DIJALANKAN SEKALI SAAT APLIKASI DIMULAI)
// =========================================================================================
function setup() {
  let cnv = createCanvas(1040, 665);
  // Lampirkan canvas ke div container agar terpusat rapi dan tidak meluncur keluar layar
  let container = document.getElementById('sim-container') || document.querySelector('.container');
  if (container) {
    cnv.parent(container);
  }
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
  // Inisialisasi 4 Slider Parameter Fisika (Batas v0: 10 - 50 m/s; Sudut: 0 - 360°)
  // ---------------------------------------------------------------------------------------
  sliders.v0 = new CartoonSlider(45, 544, 215, 10, 50, v0, 'Kecepatan Awal (v₀)', 'm/s', 1, '#ff5722');
  sliders.angle = new CartoonSlider(290, 544, 215, 0, 360, angleDeg, 'Sudut Peluncur (θ)', '°', 1, '#ff9800');
  sliders.h0 = new CartoonSlider(535, 544, 215, 0, 50, h0, 'Ketinggian Awal (h₀)', 'm', 1, '#4caf50');
  sliders.gravity = new CartoonSlider(780, 544, 215, 1.0, 20.0, gravity, 'Percepatan Gravitasi (g)', 'm/s²', 0.1, '#00bcd4');

  // ---------------------------------------------------------------------------------------
  // Inisialisasi Tombol Kontrol Aksi Utama
  // ---------------------------------------------------------------------------------------
  buttons.push(new CartoonButton(45, 598, 130, 38, 'TEMBAK!', '#4caf50', '#388e3c', () => {
    fireProjectile();
  }));

  buttons.push(new CartoonButton(186, 598, 115, 38, 'JEDA', '#2196f3', '#1976d2', function() {
    if (simState === 'FLYING') {
      simState = 'PAUSED';
      this.label = 'LANJUT';
      this.baseColor = '#ff9800';
      this.hoverColor = '#f57c00';
    } else if (simState === 'PAUSED') {
      simState = 'FLYING';
      this.label = 'JEDA';
      this.baseColor = '#2196f3';
      this.hoverColor = '#1976d2';
    }
  }));

  buttons.push(new CartoonButton(312, 598, 105, 38, 'RESET', '#f44336', '#d32f2f', () => {
    resetSimulation();
  }));

  buttons.push(new CartoonButton(428, 598, 140, 38, 'TARGET BARU', '#9c27b0', '#7b1fa2', () => {
    randomizeTarget();
  }));

  buttons.push(new CartoonButton(579, 598, 125, 38, 'Laju: 1.0x', '#607d8b', '#455a64', function() {
    if (simSpeed === 1.0) {
      simSpeed = 0.5;
      this.label = 'Slow: 0.5x';
    } else if (simSpeed === 0.5) {
      simSpeed = 0.25;
      this.label = 'Slow: 0.25x';
    } else {
      simSpeed = 1.0;
      this.label = 'Laju: 1.0x';
    }
  }));

  buttons.push(new CartoonButton(715, 598, 125, 38, 'Vektor: ON', '#3f51b5', '#303f9f', function() {
    showVectors = !showVectors;
    this.label = showVectors ? 'Vektor: ON' : 'Vektor: OFF';
  }));

  buttons.push(new CartoonButton(851, 598, 145, 38, 'Hapus Titik', '#78909c', '#546e7a', () => {
    pastTrails = [];
    currentTrail = [];
    pigTrail = [];
    sampledNodes = [];
    pigSampledNodes = [];
    selectedNode = null;
  }));

  // Membangun benteng kotak kayu awal di lokasi target
  initTargetFortress(target.x, target.y);

  // Inisialisasi kalkulasi awal
  let anaInit = calculateAnalytical(v0, angleDeg, h0, gravity);
  firstParabolaXmax = anaInit.Xmax;
  firstParabolaHmax = anaInit.Hmax;
  firstParabolaXpeak = anaInit.xPeak;
  initialTTotal = anaInit.tTotal;
}

// =========================================================================================
// INISIALISASI BENTENG KOTAK KAYU ANGRY BIRDS (STABIL SEBELUM DITABRAK)
// =========================================================================================
function initTargetFortress(tx, ty) {
  boxes = [];
  
  // Konstruksi benteng kotak kayu yang stabil dan kokoh
  // Kotak bawah menempel di tanah (y = h/2) sehingga tidak jatuh
  let hGround = 2.4;
  boxes.push({
    id: 0, x: tx - 1.8, y: hGround / 2, initX: tx - 1.8, initY: hGround / 2,
    w: 2.2, h: hGround, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.0,
    hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, isAwake: false, colorType: 'wood1'
  });
  boxes.push({
    id: 1, x: tx + 1.8, y: hGround / 2, initX: tx + 1.8, initY: hGround / 2,
    w: 2.2, h: hGround, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.0,
    hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, isAwake: false, colorType: 'wood1'
  });

  // Balok lantai tengah bertengger di atas kotak 0 dan 1
  let hBeam = 0.9;
  let yBeam = hGround + hBeam / 2;
  boxes.push({
    id: 2, x: tx, y: yBeam, initX: tx, initY: yBeam,
    w: 6.0, h: hBeam, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 3.5,
    hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, isAwake: false, colorType: 'beam'
  });

  // Kotak tumpuan atas di tengah balok
  let hPedestal = 2.0;
  let yPedestal = hGround + hBeam + hPedestal / 2;
  boxes.push({
    id: 3, x: tx, y: yPedestal, initX: tx, initY: yPedestal,
    w: 2.2, h: hPedestal, vx: 0, vy: 0, rot: 0, rotSpeed: 0, mass: 2.5,
    hp: 100, maxHp: 100, damageState: 0, wobble: 0, isDestroyed: false, isAwake: false, colorType: 'wood2'
  });

  // Babi duduk manis di atas kotak tumpuan atas
  pig.x = tx;
  pig.y = yPedestal + hPedestal / 2 + 1.1;
  pig.initialX = tx;
  pig.initialY = pig.y;
  pig.landX = tx;
  target.y = pig.y;
}

// =========================================================================================
// BAGIAN 3: DRAW LOOP UTAMA (DIULANG ~60 KALI PER DETIK)
// =========================================================================================
function draw() {
  if (!isAimingCannon) {
    v0 = sliders.v0.value;
    angleDeg = sliders.angle.value;
  }
  h0 = sliders.h0.value;
  gravity = sliders.gravity.value;

  let ana = calculateAnalytical(v0, angleDeg, h0, gravity);
  updateScale(firstParabolaXmax || ana.Xmax, firstParabolaHmax || ana.Hmax);

  drawCartoonEnvironment();

  if (simState === 'FLYING') {
    updatePhysics(ana);
  }

  updateParticles();
  updateWoodDebris();
  updateSimplePopups();

  let cannonY = GROUND_Y - h0 * meterToPixel;

  // Efek Getaran Layar
  push();
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake *= 0.88;
    if (screenShake < 0.2) screenShake = 0;
  }

  drawMeterRuler(firstParabolaXmax || ana.Xmax, firstParabolaHmax || ana.Hmax);
  drawWoodenPlatform(ORIGIN_X, GROUND_Y, cannonY, h0);

  // 1. PREVIEW LINTASAN HANYA MUNCUL SETELAH DITEMBAKKAN (TIDAK MUNCUL DI IDLE)
  if (showTheoreticalPath && simState !== 'IDLE') {
    drawTheoreticalPath(initialV0, initialAngleDeg, initialH0, gravity, initialTTotal);
  }

  if (showTrail) {
    drawPastTrails();
    drawCurrentTrail();
  }

  // Menggambar Kotak-Kotak Target Kayu
  drawDestructibleBoxes();

  // Menggambar Babi & Sasaran
  drawChallengeTarget();

  // 2. PENANDA HMAKS & XMAKS PARABOLA PERTAMA HANYA MUNCUL SETELAH DITEMBAKKAN
  if (showMarkers && simState !== 'IDLE') {
    drawMarkers(ana);
  }

  // Menggambar Titik Sampel Lintasan (Click to Inspect)
  drawSampledNodes();

  // Menggambar Peluncur Meriam Kartun (Bukan Ketapel)
  drawCartoonLauncher(ORIGIN_X, cannonY, angleDeg);

  // Menggambar Karakter Burung Proyektil & Vektor Kecepatan
  drawCharacterProjectile(ORIGIN_X, cannonY, ana);

  // Menggambar Partikel, Serpihan Kayu, dan Teks Komik
  drawParticles();
  drawWoodDebris();
  drawSimplePopups();

  pop(); // Akhir blok getaran kamera

  if (selectedNode) {
    drawNodeInspectorCard(selectedNode);
  }

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

  let maxRefX = Math.max(Math.abs(Xmax), target.x + 18, Math.abs(proj.x) + 15, 20);
  if (collisionData) {
    maxRefX = Math.max(maxRefX, pig.landX + 15, (proj.landX || 0) + 15);
  }
  let maxRefY = Math.max(Hmax, target.y + 12, Math.max(0, proj.y) + 10, (pig.Hmax || 0) + 10, 15);

  let safeW = VIEW_W - 90;
  let safeH = VIEW_H - 75;

  let targetScaleX = safeW / maxRefX;
  let targetScaleY = safeH / maxRefY;
  let targetScale = constrain(Math.min(targetScaleX, targetScaleY), 0.05, 8.0);

  if (simState === 'IDLE' && !isDraggingPlatform) {
    meterToPixel = lerp(meterToPixel, targetScale, 0.15);
  } else if (simState === 'FLYING') {
    if (targetScale < meterToPixel) {
      meterToPixel = lerp(meterToPixel, targetScale, 0.05);
    }
  }
}

// =========================================================================================
// BAGIAN 6: LOGIKA TEMBAK, INTEGRASI FISIKA NUMERIK, AMBANG KERUSAKAN KOTAK & PANTULAN
// =========================================================================================
function fireProjectile() {
  if (simState === 'FLYING') return;

  let rad = radians(angleDeg);
  let v0x = v0 * Math.cos(rad);
  let v0y = v0 * Math.sin(rad);

  // Simpan nilai awal untuk kalkulasi garis parabola pertama dan penanda Xmaks
  initialV0 = v0;
  initialAngleDeg = angleDeg;
  initialH0 = h0;
  let anaInit = calculateAnalytical(v0, angleDeg, h0, gravity);
  firstParabolaXmax = anaInit.Xmax;
  firstParabolaHmax = anaInit.Hmax;
  firstParabolaXpeak = anaInit.xPeak;
  initialTTotal = anaInit.tTotal;

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
  simplePopups = [];
  screenShake = 0;

  addSampledNode(0, proj.x, proj.y, proj.vx, proj.vy, proj.v, 1);

  let cannonY = GROUND_Y - h0 * meterToPixel;
  let muzzleX = ORIGIN_X + 46 * Math.cos(rad);
  let muzzleY = cannonY - 46 * Math.sin(rad);
  createPuffParticles(muzzleX, muzzleY);

  simState = 'FLYING';

  let pauseBtn = buttons.find(b => b.label.includes('JEDA') || b.label.includes('LANJUT'));
  if (pauseBtn) {
    pauseBtn.label = 'JEDA';
    pauseBtn.baseColor = '#2196f3';
    pauseBtn.hoverColor = '#1976d2';
  }
}

function updatePhysics(ana) {
  let effectiveDt = dt * simSpeed;
  simTime += effectiveDt;

  // =======================================================================================
  // 1. GERAK PROYEKTIL BURUNG (SEMI-IMPLICIT EULER)
  // =======================================================================================
  if (!proj.landed) {
    proj.vy -= gravity * effectiveDt;
    proj.x += proj.vx * effectiveDt;
    proj.y += proj.vy * effectiveDt;
    proj.v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);

    if (proj.y > 0.05) {
      proj.rotation = Math.atan2(-proj.vy, proj.vx);
    }

    currentTrail.push({ x: proj.x, y: Math.max(0, proj.y), phase: collisionData ? 2 : 1 });

    if (simTime - lastSampleTime >= 0.12) {
      lastSampleTime = simTime;
      addSampledNode(simTime, proj.x, proj.y, proj.vx, proj.vy, proj.v, collisionData ? 2 : 1);
    }

    // =====================================================================================
    // 2. FISIKA PENDARATAN TANAH (BURUNG MEMANTUL & BERGULING ALAMI)
    // =====================================================================================
    if (proj.y <= 0) {
      proj.y = 0;
      if (Math.abs(proj.vy) > 1.2) {
        proj.vy = -proj.vy * 0.42; // Pantulan elastis tanah
        proj.bounceCount++;
        createDirtThud(ORIGIN_X + proj.x * meterToPixel, GROUND_Y);
      } else {
        proj.vy = 0;
      }

      // Perlambatan gesekan rumput saat berguling
      proj.vx *= 0.94;
      proj.rotation += (proj.vx * effectiveDt) / 0.8;

      if (Math.abs(proj.vx) > 1.8 && frameCount % 4 === 0) {
        createDirtThud(ORIGIN_X + proj.x * meterToPixel, GROUND_Y);
      }

      // Berhenti perlahan setelah energi gesekan habis
      if (Math.abs(proj.vx) < 0.22 && proj.vy === 0) {
        proj.vx = 0;
        proj.v = 0;
        proj.landed = true;
        proj.landX = proj.x;
        addSampledNode(simTime, proj.x, 0, 0, 0, 0, collisionData ? 2 : 1);
      }
    }

    // =====================================================================================
    // 3. DETEKSI TUMBUKAN KOTAK DENGAN AMBANG KERUSAKAN (DAMAGE THRESHOLD)
    //    Hanya berlaku jika burung sudah terbang dan mendekati posisi kotak!
    // =====================================================================================
    if (proj.x > 5.0) { // Menghindari false detection saat burung baru keluar laras
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
            // Kotak bangun dari mode diam
            box.isAwake = true;

            // Bangunkan kotak-kotak yang bertumpu di atasnya
            for (let other of boxes) {
              if (!other.isDestroyed && other.y > box.y && Math.abs(other.x - box.x) < 3.2) {
                other.isAwake = true;
              }
            }

            let mBird = 1.0;
            let mBox = box.mass;

            // EVALUASI AMBANG KERUSAKAN (DAMAGE THRESHOLD)
            if (v_rel < 7.5) {
              // TINGKAT 1: PELAN (Wobble & geser sedikit, tidak hancur)
              let dmg = Math.round(map(v_rel, 0, 7.5, 5, 20));
              box.hp -= dmg;
              if (box.damageState === 0) box.damageState = 1;
              box.wobble = (proj.vx > 0 ? 0.08 : -0.08);
              box.vx += (proj.vx > 0 ? 0.25 : -0.25) * (v_rel / 7.5);

              let e = 0.45;
              let impulse = -(1 + e) * v_normal / (1 / mBird + 1 / mBox);
              proj.vx += (impulse / mBird) * nx * 0.7;
              proj.vy += (impulse / mBird) * ny * 0.7;

              let hitPx = ORIGIN_X + nearX * meterToPixel;
              let hitPy = GROUND_Y - nearY * meterToPixel;
              createPuffParticles(hitPx, hitPy, 3);
              triggerSimplePopup(hitPx, hitPy, `-${dmg} HP`, '#64748b');

            } else if (v_rel < 17.0 && box.hp > 35) {
              // TINGKAT 2: SEDANG (Retakan muncul pada balok kayu)
              let dmg = Math.round(map(v_rel, 7.5, 17.0, 35, 65));
              box.hp -= dmg;
              box.damageState = 2; // Retakan muncul
              box.vx += proj.vx * 0.35;
              box.vy += Math.max(proj.vy * 0.3, 1.8);
              box.rotSpeed = random(-2, 2);

              let e = 0.55;
              let impulse = -(1 + e) * v_normal / (1 / mBird + 1 / mBox);
              proj.vx += (impulse / mBird) * nx * 0.75;
              proj.vy += (impulse / mBird) * ny * 0.75;

              let hitPx = ORIGIN_X + nearX * meterToPixel;
              let hitPy = GROUND_Y - nearY * meterToPixel;
              createWoodDebris(hitPx, hitPy, 4);
              createPuffParticles(hitPx, hitPy, 4);
              triggerSimplePopup(hitPx, hitPy, 'Retak', '#d97706');
              screenShake = 2;

            } else {
              // TINGKAT 3: KERAS (Kotak hancur rapi menjadi beberapa serpihan kayu)
              box.hp = 0;
              box.damageState = 3;
              box.isDestroyed = true;
              target.score += 50;

              let hitPx = ORIGIN_X + box.x * meterToPixel;
              let hitPy = GROUND_Y - box.y * meterToPixel;
              createWoodDebris(hitPx, hitPy, 6);
              createPuffParticles(hitPx, hitPy, 5);
              triggerSimplePopup(hitPx, hitPy, '+50', '#059669');
              screenShake = 3;

              proj.vx *= 0.72;
              proj.vy *= 0.78;
            }

            addSampledNode(simTime, proj.x, proj.y, proj.vx, proj.vy, proj.v, 2);
          }
        }
      }
    }

    // =====================================================================================
    // 4. DETEKSI TUMBUKAN DENGAN BABI (AMBANG KERUSAKAN & MOMENTUM 2D)
    // =====================================================================================
    let dPig = dist(proj.x, proj.y, pig.x, pig.y);
    let pigRadius = 1.8;

    if (!pig.isHit && dPig <= pigRadius && proj.x > 5.0) {
      let dx = pig.x - proj.x;
      let dy = pig.y - proj.y;
      let dActual = Math.sqrt(dx * dx + dy * dy);
      if (dActual < 0.001) dActual = 0.001;
      let nx = dx / dActual;
      let ny = dy / dActual;
      let tx = -ny;
      let ty = nx;

      let u1n = proj.vx * nx + proj.vy * ny;
      let u1t = proj.vx * tx + proj.vy * ty;
      let v_rel = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);

      if (v_rel < 6.0) {
        // Tumbukan pelan: babi kaget dan bergoyang sedikit
        pig.rotation += (proj.vx > 0 ? 0.2 : -0.2);
        pig.x += (proj.vx > 0 ? 0.3 : -0.3);
        triggerSimplePopup(ORIGIN_X + pig.x * meterToPixel, GROUND_Y - pig.y * meterToPixel, 'Kaget!', '#475569');
        proj.vx *= -0.3;
      } else {
        // Tumbukan keras: babi terpental dalam hukum kekekalan momentum 2D!
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

        v2y_prime = Math.max(v2y_prime, 3.8);
        v2x_prime = Math.max(v2x_prime, 4.5);

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
        pig.rotSpeed = random(6, 11);

        target.isHit = true;
        target.score += 100;

        let hitPx = ORIGIN_X + pig.x * meterToPixel;
        let hitPy = GROUND_Y - pig.y * meterToPixel;
        createPuffParticles(hitPx, hitPy, 5);
        createWoodDebris(hitPx, hitPy, 5);
        triggerSimplePopup(hitPx, hitPy, '+100', '#059669');
        screenShake = 3;

        addCollisionSampleNode(simTime, proj.x, proj.y, collisionData);
      }
    }
  }

  // =======================================================================================
  // 4B. DUKUNGAN FISIKA BENTENG & BABI (JATUH JIKA PENOPANG DI BAWAHNYA HANCUR/JATUH)
  //     Menghindari babi atau balok atas melayang saat struktur bawahnya runtuh!
  // =======================================================================================
  // A. Kotak tingkat atas kehilangan balok penopang bawah
  for (let b of boxes) {
    if (b.isDestroyed || b.isAwake) continue;
    if (b.y > b.h / 2 + 0.3) {
      let hasSupport = false;
      for (let lower of boxes) {
        if (lower.id !== b.id && !lower.isDestroyed) {
          let overlapX = Math.abs(b.x - lower.x) < (b.w / 2 + lower.w / 2 - 0.3);
          let underY = (lower.y + lower.h / 2) >= (b.y - b.h / 2 - 0.4) && (lower.y < b.y);
          if (overlapX && underY) {
            hasSupport = true;
            if (lower.isAwake && Math.abs(lower.vy) > 0.4) {
              b.isAwake = true;
            }
            break;
          }
        }
      }
      if (!hasSupport) {
        b.isAwake = true;
        b.vy = -1.0;
      }
    }
  }

  // B. Babi kehilangan kotak penopang langsung di bawahnya
  if (!pig.landed && !pig.isFlying) {
    let supported = false;
    let supportBox = null;
    let highestTop = 0;

    for (let box of boxes) {
      if (box.isDestroyed) continue;
      let halfW = box.w / 2 + 0.5;
      if (Math.abs(pig.x - box.x) < halfW) {
        let topY = box.y + box.h / 2;
        // Babi hanya ditopang jika permukaannya persis di bawah telapak babi (jarak < 0.45m)
        let distToSole = (pig.y - 1.1) - topY;
        if (Math.abs(distToSole) <= 0.45 && topY > highestTop) {
          highestTop = topY;
          supportBox = box;
          supported = true;
        }
      }
    }

    if (supported && supportBox) {
      if (supportBox.isAwake) {
        pig.y = highestTop + 1.1;
        pig.vy = supportBox.vy;
        pig.vx = supportBox.vx * 0.7;
        pig.rotation = supportBox.rot;
        if (supportBox.y <= supportBox.h / 2 + 0.1 && Math.abs(supportBox.vy) < 0.2) {
          pig.y = highestTop + 1.1;
          pig.vy = 0;
          pig.vx = 0;
        }
      } else {
        pig.y = highestTop + 1.1;
      }
    } else {
      // TIDAK ADA KOTAK YANG MENAHANNYA! Babi langsung jatuh bebas ke tanah!
      pig.isFlying = true;
      pig.isHit = true;
      target.isHit = true;
      target.score += 100;
      pig.vy = -1.2;
      pig.vx = (random() > 0.5 ? 1 : -1) * random(0.5, 1.2);
      pig.rotSpeed = random(-3, 3);
      triggerSimplePopup(ORIGIN_X + pig.x * meterToPixel, GROUND_Y - pig.y * meterToPixel, '+100', '#059669');
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
  // 6. GERAK FISIKA KOTAK-KOTAK KAYU YANG BANGUN (TERJATUH & MEMANTUL)
  //    Kotak hanya bergerak jika isAwake: true!
  // =======================================================================================
  for (let box of boxes) {
    if (box.isDestroyed || !box.isAwake) continue;

    if (box.y > box.h / 2) {
      box.vy -= gravity * effectiveDt;
      box.x += box.vx * effectiveDt;
      box.y += box.vy * effectiveDt;
      box.rot += box.rotSpeed * effectiveDt;
    }

    // Kotak jatuh menabrak tanah
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

  // Cek apakah seluruh gerak burung dan babi sudah selesai
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
  simplePopups = [];
  screenShake = 0;

  // Reset benteng kotak kayu
  initTargetFortress(target.x, target.y);

  // Perbarui kalkulasi parabola pertama
  let anaInit = calculateAnalytical(v0, angleDeg, h0, gravity);
  firstParabolaXmax = anaInit.Xmax;
  firstParabolaHmax = anaInit.Hmax;
  firstParabolaXpeak = anaInit.xPeak;
  initialTTotal = anaInit.tTotal;

  let pauseBtn = buttons.find(b => b.label.includes('JEDA') || b.label.includes('LANJUT'));
  if (pauseBtn) {
    pauseBtn.label = 'JEDA';
    pauseBtn.baseColor = '#2196f3';
    pauseBtn.hoverColor = '#1976d2';
  }
}

function randomizeTarget() {
  target.x = Math.round(random(35, 100));
  target.y = Math.round(random(3, 18));
  initTargetFortress(target.x, target.y);
  target.isHit = false;
  resetSimulation();
}

// =========================================================================================
// BAGIAN 7: PENGGAMBARAN ALAM & LINGKUNGAN KARTUN
// =========================================================================================
function drawCartoonEnvironment() {
  for (let y = 0; y < GROUND_Y; y += 4) {
    let inter = map(y, 0, GROUND_Y, 0, 1);
    let c = lerpColor(color(186, 230, 253), color(224, 242, 254), inter);
    stroke(c);
    strokeWeight(4);
    line(0, y, width, y);
  }

  noStroke();
  fill(255, 235, 59, 120);
  ellipse(width - 130, 95, 105, 105);
  fill(255, 214, 0);
  ellipse(width - 130, 95, 75, 75);

  drawClouds();

  fill(167, 243, 208);
  arc(220, GROUND_Y, 440, 190, PI, TWO_PI);
  fill(110, 231, 183);
  arc(580, GROUND_Y, 520, 220, PI, TWO_PI);
  fill(52, 211, 153);
  arc(930, GROUND_Y, 480, 170, PI, TWO_PI);

  fill(34, 197, 94);
  stroke(22, 163, 74);
  strokeWeight(2);
  rect(0, GROUND_Y, width, 18);

  fill(146, 64, 14);
  noStroke();
  rect(0, GROUND_Y + 18, width, height - (GROUND_Y + 18));

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

  fill(71, 85, 105);
  noStroke();
  textSize(9.5);
  textAlign(CENTER, TOP);
  for (let m = 0; m <= maxMeter; m += stepMeter) {
    let px = ORIGIN_X + m * meterToPixel;
    if (px > width - 20) break;
    text(m + 'm', px, GROUND_Y + 4);
  }

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
// BAGIAN 10: PENGGAMBARAN PELUNCUR MERIAM KARTUN (TETAP MERIAM, BISA DITARIK DEPAN/BELAKANG)
// =========================================================================================
function drawCartoonLauncher(baseX, cannonY, angle) {
  push();
  translate(baseX, cannonY);

  let dMouse = dist(mouseX, mouseY, baseX, cannonY);
  let isHover = (dMouse < 85 && simState === 'IDLE');

  // Lingkaran area interaksi halus saat hover
  if (isHover || isAimingCannon) {
    fill(255, 235, 59, 35);
    stroke(255, 193, 7, 160);
    strokeWeight(1.5);
    drawingContext.setLineDash([4, 4]);
    ellipse(0, 0, 130, 130);
    drawingContext.setLineDash([]);
  }

  // 1. RODA PEDATI MERIAM KAYU (CARTOON CANNON CARRIAGE)
  fill(160, 95, 45);
  stroke(90, 45, 15);
  strokeWeight(2.5);
  ellipse(0, 6, 38, 38);

  // Ruji-ruji roda kayu
  stroke(110, 60, 20);
  strokeWeight(1.8);
  for (let a = 0; a < TWO_PI; a += PI / 4) {
    line(0, 6, 17 * Math.cos(a), 6 + 17 * Math.sin(a));
  }

  // Velg tengah roda
  fill(210, 140, 75);
  stroke(90, 45, 15);
  strokeWeight(2);
  ellipse(0, 6, 16, 16);
  fill(90, 45, 15);
  noStroke();
  ellipse(0, 6, 6, 6);

  // 2. LARAS MERIAM BESI BERPUTAR 360 DERAJAT
  push();
  rotate(-radians(angle));

  // Efek kompresi pegas jika ditarik ke belakang
  let recoilX = (isAimingCannon ? cannonRecoilOffset : 0);

  // Pegas recoil jika meriam ditarik ke belakang
  if (isAimingCannon && cannonRecoilOffset < -3) {
    stroke(255, 193, 7);
    strokeWeight(2.5);
    noFill();
    beginShape();
    for (let sx = -15; sx <= recoilX; sx += 3) {
      let sy = ((sx % 6 === 0) ? -5 : 5);
      vertex(sx, sy);
    }
    endShape();
  }

  // Tabung Badan Laras Meriam
  fill(isAimingCannon ? '#e53935' : '#d32f2f');
  stroke(70, 15, 15);
  strokeWeight(2.5);
  rect(recoilX, -10, 48, 20, 5);

  // Cincin Kuningan Moncong Meriam
  fill(255, 193, 7);
  stroke(130, 95, 0);
  strokeWeight(2);
  rect(recoilX + 42, -11, 9, 22, 3);

  // Lubang Moncong Meriam
  fill(40, 15, 15);
  stroke(255, 235, 59);
  strokeWeight(1.5);
  ellipse(recoilX + 47, 0, 9, 11);

  pop();

  pop();

  // 3. BADGE SUDUT ELEVASI
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

  // 4. INDIKATOR GARIS BIDIK & PENGUKUR DAYA SAAT MERIAM DI-DRAG
  if (isAimingCannon && simState === 'IDLE') {
    let rad = -radians(angle);
    let muzzleDist = 46 + (cannonRecoilOffset || 0);
    let mx = baseX + muzzleDist * Math.cos(rad);
    let my = cannonY + muzzleDist * Math.sin(rad);

    // Garis bidik putus-putus ke arah sasaran
    stroke(255, 152, 0, 180);
    strokeWeight(1.8);
    drawingContext.setLineDash([4, 4]);
    line(mx, my, mx + 45 * Math.cos(rad), my + 45 * Math.sin(rad));
    drawingContext.setLineDash([]);

    // Tali elastis penanda tarikan mouse jika ditarik ke belakang
    if (mouseX < baseX) {
      stroke(229, 57, 53, 140);
      strokeWeight(1.5);
      drawingContext.setLineDash([2, 3]);
      line(baseX, cannonY, mouseX, mouseY);
      drawingContext.setLineDash([]);
      fill(229, 57, 53);
      noStroke();
      ellipse(mouseX, mouseY, 6, 6);
    }
    let pGaugeX = baseX;
    let pGaugeY = cannonY - 55;
    let pGaugeW = 145;
    let pGaugeH = 24;

    fill(255, 255, 255, 245);
    stroke(255, 87, 34);
    strokeWeight(1.5);
    rect(pGaugeX - pGaugeW / 2, pGaugeY, pGaugeW, pGaugeH, 6);

    let fillW = map(v0, 10, 50, 4, pGaugeW - 8);
    let powerColor = lerpColor(color(76, 175, 80), color(244, 67, 54), map(v0, 10, 50, 0, 1));
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
    let rad = radians(angleDeg);
    let muzzleOffset = (isAimingCannon ? 46 + cannonRecoilOffset : 46);
    px = baseX + muzzleOffset * Math.cos(rad);
    py = cannonY - muzzleOffset * Math.sin(rad);
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
  } else {
    rotate(-radians(angleDeg));
  }

  // Badan Bulat Merah Burung
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

  // Jambul Bulu
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

    rect(-pw / 2, -ph / 2, pw, ph, 3);

    // Pola Palang Kayu Silang
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

    // EFEK AMBANG KERUSAKAN: RETAKAN NYATA PADA KAYU
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
    let pPx = ORIGIN_X + pig.x * meterToPixel;
    let pPy = GROUND_Y - pig.y * meterToPixel;
    let breath = Math.sin(frameCount * 0.08) * 1.2;
    pPy += breath;

    fill(92, 184, 92);
    stroke(46, 125, 50);
    strokeWeight(2);
    ellipse(pPx - 11, pPy - 13, 8, 10);
    ellipse(pPx + 11, pPy - 13, 8, 10);
    fill(46, 125, 50);
    noStroke();
    ellipse(pPx - 11, pPy - 13, 4, 6);
    ellipse(pPx + 11, pPy - 13, 4, 6);

    fill(139, 195, 74);
    stroke(46, 125, 50);
    strokeWeight(2.5);
    ellipse(pPx, pPy, 32, 28);

    fill(178, 223, 138, 140);
    noStroke();
    ellipse(pPx - 4, pPy - 7, 18, 10);

    fill(165, 214, 167);
    stroke(46, 125, 50);
    strokeWeight(2);
    ellipse(pPx, pPy + 2, 14, 10);
    fill(46, 125, 50);
    noStroke();
    ellipse(pPx - 3.5, pPy + 2, 3, 4);
    ellipse(pPx + 3.5, pPy + 2, 3, 4);

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

    stroke(46, 125, 50);
    strokeWeight(2);
    noFill();
    arc(pPx - 7, pPy - 8.5, 7, 4, PI + 0.3, TWO_PI);
    arc(pPx + 7, pPy - 8.5, 7, 4, PI, TWO_PI - 0.3);

    fill(255);
    stroke(105, 55, 20);
    strokeWeight(2);
    rect(pPx - 42, pPy - 36, 84, 19, 5);

    noStroke();
    fill(105, 55, 20);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(`X:${target.x}m Y:${Math.round(target.y)}m`, pPx, pPy - 26);
    textStyle(NORMAL);

  } else {
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

  // 1. Penanda Titik Puncak H_maks Parabola Pertama
  if (firstParabolaHmax > 0.5) {
    let peakPx = ORIGIN_X + firstParabolaXpeak * meterToPixel;
    let peakPy = GROUND_Y - firstParabolaHmax * meterToPixel;

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
    text('Hmaks: ' + firstParabolaHmax.toFixed(1) + 'm', hBadgeX, hBadgeY + hBadgeH / 2);
    textStyle(NORMAL);
  }

  // 2. PENANDA XMAKS PARABOLA PERTAMA (TETAP MENANDAI PENDARATAN PARABOLA AWAL)
  //    TIDAK BERUBAH OLEH HASIL PANTULAN ATAU TUMBUKAN!
  if (Math.abs(firstParabolaXmax) > 0.5) {
    let landPx = ORIGIN_X + firstParabolaXmax * meterToPixel;
    let landPy = GROUND_Y;

    // Tiang bendera merah
    stroke(229, 57, 53);
    strokeWeight(2.5);
    line(landPx, landPy, landPx, landPy - 26);

    fill(229, 57, 53);
    noStroke();
    triangle(landPx, landPy - 26, landPx, landPy - 14, landPx + 16, landPy - 20);
    ellipse(landPx, landPy, 8, 8);

    // Kotak badge X_maks di atas bendera (py - 52) bebas dari panel bawah
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
    text('Xmaks: ' + firstParabolaXmax.toFixed(1) + 'm', badgeX, badgeY + badgeH / 2);
    textStyle(NORMAL);
  }

  // 3. Penanda Pendaratan Babi Pasca-Tumbukan
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
    text('X Babi: ' + pig.landX.toFixed(1) + 'm', bBadgeX, bBadgeY + bBadgeH / 2);
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

function createPuffParticles(x, y, count = 5) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-1.5, 2.0),
      vy: random(-1.8, 1.2),
      size: random(4, 8),
      alpha: 150,
      decay: random(7, 12),
      color: color(245, 245, 245)
    });
  }
}

function createDirtThud(x, y) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-2.5, 2.5),
      vy: random(-3, -1),
      size: random(3, 5),
      alpha: 180,
      decay: random(9, 15),
      color: color(166, 115, 68)
    });
  }
}

function createWoodDebris(x, y, count = 5) {
  let woodColors = ['#8d6e63', '#6d4c41', '#a1887f', '#bcaaa4'];
  for (let i = 0; i < count; i++) {
    woodDebris.push({
      x: x,
      y: y,
      vx: random(-3.0, 4.0),
      vy: random(-4.5, -1.2),
      w: random(4, 7),
      h: random(2, 4),
      rot: random(TWO_PI),
      vRot: random(-0.2, 0.2),
      col: random(woodColors),
      alpha: 240
    });
  }
}

function updateWoodDebris() {
  for (let i = woodDebris.length - 1; i >= 0; i--) {
    let d = woodDebris[i];
    d.x += d.vx;
    d.y += d.vy;
    d.vy += 0.35;
    d.rot += d.vRot;

    if (d.y >= GROUND_Y - 2) {
      d.y = GROUND_Y - 2;
      d.vy = -d.vy * 0.25;
      d.vx *= 0.6;
      d.vRot *= 0.5;
    }

    d.alpha -= 3.5;
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
    noStroke();
    rect(-d.w / 2, -d.h / 2, d.w, d.h, 1);
    pop();
  }
  pop();
}

function triggerSimplePopup(x, y, text, col = '#0284c7') {
  simplePopups.push({
    x: x,
    y: y - 10,
    text: text,
    col: col,
    alpha: 255,
    life: 42
  });
}

function updateSimplePopups() {
  for (let i = simplePopups.length - 1; i >= 0; i--) {
    let p = simplePopups[i];
    p.y -= 0.5;
    p.life--;
    p.alpha = map(p.life, 0, 42, 0, 255);
    if (p.life <= 0) {
      simplePopups.splice(i, 1);
    }
  }
}

function drawSimplePopups() {
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(12);
  for (let p of simplePopups) {
    let c = color(p.col);
    fill(red(c), green(c), blue(c), p.alpha);
    noStroke();
    text(p.text, p.x, p.y);
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
  text('TELEMETRI FISIKA', boxX + 12, boxY + 14);

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
  drawWhiteDataRow('Kecepatan (vx)', proj.vx.toFixed(2) + ' m/s', '#1e88e5', boxX + 12, sy + lh * 3);
  drawWhiteDataRow('Kecepatan (vy)', proj.vy.toFixed(2) + ' m/s', '#43a047', boxX + 12, sy + lh * 4);
  drawWhiteDataRow('Resultan Laju (v)', proj.v.toFixed(2) + ' m/s', '#f57c00', boxX + 12, sy + lh * 5);

  stroke(226, 232, 240);
  strokeWeight(1);
  line(boxX + 10, sy + lh * 6 - 2, boxX + boxW - 10, sy + lh * 6 - 2);

  drawWhiteDataRow('Tinggi Maks (Hmaks)', firstParabolaHmax.toFixed(2) + ' m', '#ff9800', boxX + 12, sy + lh * 6 + 7);
  drawWhiteDataRow('Jangkauan Pertama (Xmaks)', firstParabolaXmax.toFixed(2) + ' m', '#e53935', boxX + 12, sy + lh * 7 + 7);

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
  text('MISI TANTANGAN SASARAN', banX + 14, banY + 10);

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
  text('💡 Tips: Tarik laras meriam ke depan atau ke belakang untuk membidik & menentukan laju awal, lalu lepaskan untuk menembak!', 245, 517);

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

    // Area sentuh diperbesar untuk jari (HP/tablet), tetap presisi untuk mouse
    let isTouch = millis() - lastTouchTime < 300;
    let handleR = isTouch ? 26 : 14;
    let padY = isTouch ? 16 : 6;
    if (dist(mx, my, handleX, handleY) < handleR || (mx >= this.x - (isTouch ? 10 : 0) && mx <= this.x + this.w + (isTouch ? 10 : 0) && my >= this.y - padY && my <= this.y + this.h + padY)) {
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
// BAGIAN 19: PENANGANAN INTERAKSI MOUSE (MERIAM DRAG DEPAN / BELAKANG & 360°)
// =========================================================================================
function updateMouseCursor(cannonY) {
  let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
  let isNearCannon = (dCannon < 85 && simState === 'IDLE');
  let isNearPlatform = (simState === 'IDLE' && isOnPlatformBody(cannonY));

  if (hoveredNode) {
    cursor('pointer');
  } else if (isAimingCannon) {
    cursor('crosshair');
  } else if (isDraggingPlatform) {
    cursor('ns-resize');
  } else if (isNearPlatform) {
    cursor('ns-resize');
  } else if (isNearCannon) {
    cursor('grab');
  } else {
    cursor(ARROW);
  }
}

function mousePressed(e) {
  // Abaikan event mouse tiruan yang dikirim browser setelah sentuhan (hindari klik ganda)
  if (e && e.type === 'mousedown' && millis() - lastTouchTime < 800) return;
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

  // 4. Interaksi Tarik Meriam (Drag Depan atau Belakang)
  if (simState === 'IDLE') {
    // Badan menara (di bawah meriam) diperiksa lebih dulu agar menara bisa diseret;
    // sebelumnya area ini tertutup oleh radius tarik meriam sehingga meriam yang tertangkap.
    if (isOnPlatformBody(cannonY)) {
      isDraggingPlatform = true;
      platformGrabOffset = (GROUND_Y - mouseY) / meterToPixel - h0;
      return;
    }

    let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
    if (dCannon < 85) {
      isAimingCannon = true;
      updateCannonDragFromMouse(cannonY);
      return;
    }

    if (mouseX >= 25 && mouseX <= ORIGIN_X + 30 && Math.abs(mouseY - cannonY) < 20) {
      isDraggingPlatform = true;
      platformGrabOffset = 0;
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
    updateCannonDragFromMouse(cannonY);
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

function mouseReleased(e) {
  if (e && e.type === 'mouseup' && millis() - lastTouchTime < 800) return;
  let cannonY = GROUND_Y - h0 * meterToPixel;

  if (isAimingCannon && simState === 'IDLE') {
    let d = dist(mouseX, mouseY, ORIGIN_X, cannonY);
    isAimingCannon = false;
    cannonRecoilOffset = 0;

    // Jika tarikan cukup besar (> 18px), lepaskan tembakan!
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

function updateCannonDragFromMouse(cannonY) {
  let dx = mouseX - ORIGIN_X;
  let dy = mouseY - cannonY;
  let d = dist(mouseX, mouseY, ORIGIN_X, cannonY);

  // Aturan Tarikan Presisi 180 Derajat:
  // - Jika ditarik ke belakang (dx < 0, mouse di sebelah kiri meriam):
  //   Arah tembak tepat berlawanan 180 derajat ke depan!
  //   Contoh: Serong kiri bawah (dx < 0, dy > 0) -> mengarah serong kanan atas (aimX > 0, aimY_phys > 0)
  //           Serong kiri atas (dx < 0, dy < 0)   -> mengarah serong kanan bawah (aimX > 0, aimY_phys < 0)
  let aimX, aimY_phys;
  if (dx < 0) {
    aimX = -dx;       // Positif (ke kanan)
    aimY_phys = dy;   // dy > 0 (bawah di layar) menjadi positif (atas di koordinat fisika)
    cannonRecoilOffset = -map(constrain(d, 10, 130), 10, 130, 0, 14);
  } else {
    // Ditarik ke depan (dx >= 0): membidik langsung searah kursor mouse
    aimX = dx;        // Positif (ke kanan)
    aimY_phys = -dy;  // dy < 0 (atas di layar) menjadi positif (atas di koordinat fisika)
    cannonRecoilOffset = map(constrain(d, 10, 130), 10, 130, 0, 6);
  }

  // Hitung sudut tembak 360 derajat
  let deg = degrees(Math.atan2(aimY_phys, aimX));
  if (deg < 0) deg += 360;
  deg = Math.round(deg);
  angleDeg = deg;
  sliders.angle.value = deg;

  // Jarak tarikan menentukan laju awal v0 (batas 10 - 50 m/s)
  let dClamped = constrain(d, 10, 130);
  let speed = Math.round(map(dClamped, 10, 130, sliders.v0.min, sliders.v0.max));
  v0 = speed;
  sliders.v0.value = speed;
}

let platformGrabOffset = 0;   // jarak (m) titik pegang di bawah puncak menara

function isOnPlatformBody(cannonY) {
  return h0 > 0 && Math.abs(mouseX - ORIGIN_X) <= 40 && mouseY >= cannonY + 22 && mouseY <= GROUND_Y;
}

function updateHeightFromMouse() {
  let pixelH = GROUND_Y - mouseY;
  let mHeight = pixelH / meterToPixel - platformGrabOffset;
  mHeight = constrain(Math.round(mHeight), 0, 50);
  sliders.h0.value = mHeight;
  h0 = mHeight;
}


// =========================================================================================
// DUKUNGAN LAYAR SENTUH (HP / TABLET)
// p5.js tidak memanggil mousePressed() saat jari pertama kali menyentuh layar, sehingga
// slider, meriam, dan platform tidak bisa diseret. Fungsi di bawah meneruskan sentuhan
// ke handler mouse yang sama, dan mencegah halaman ikut bergulir saat menyeret di kanvas.
// =========================================================================================
let lastTouchTime = -10000;

function isCanvasTouch(e) {
  return !!(e && e.target && e.target.tagName === 'CANVAS');
}

function isDraggingAnything() {
  if (isAimingCannon || isDraggingPlatform) return true;
  for (let key in sliders) {
    if (sliders[key].isDragging) return true;
  }
  return false;
}

function touchStarted(e) {
  if (!isCanvasTouch(e)) return true;   // sentuhan di luar kanvas: biarkan halaman bergulir
  lastTouchTime = millis();
  mousePressed();
  return false;
}

function touchMoved(e) {
  if (!isCanvasTouch(e) && !isDraggingAnything()) return true;
  lastTouchTime = millis();
  mouseDragged();
  return false;
}

function touchEnded(e) {
  if (!isCanvasTouch(e) && !isDraggingAnything()) return true;
  lastTouchTime = millis();
  mouseReleased();
  return false;
}
