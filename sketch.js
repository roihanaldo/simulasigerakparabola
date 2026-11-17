/**
 * =========================================================================================
 * SIMULASI FISIKA INTERAKTIF: GERAK PARABOLA (PROJECTILE MOTION)
 * EDISI: TEMA CERAH "ANGRY BIRDS" + MODE TANTANGAN SASARAN + INSPEKSI KLIK TITIK LINTASAN
 * =========================================================================================
 * Pustaka : p5.js (https://p5js.org/)
 * Kompatibel : Browser Lokal (HTML5) & p5.js Web Editor (https://editor.p5js.org/)
 * 
 * =========================================================================================
 * 📖 TEORI & KONSEP FISIKA GERAK PARABOLA (KASUS IDEAL TANPA GESEKAN UDARA)
 * =========================================================================================
 * Gerak parabola merupakan perpaduan dua gerak lurus yang saling tegak lurus dan independen:
 * 
 * 1. SUMBU HORIZONTAL (X) -> Gerak Lurus Beraturan (GLB):
 *    - Tidak ada gaya horizontal yang bekerja (ax = 0).
 *    - Komponen kecepatan horizontal selalu bernilai konstan:
 *        vx(t) = v0 * cos(theta) = konstan
 *    - Posisi horizontal proyektil pada setiap detik t:
 *        x(t)  = vx * t = v0 * cos(theta) * t
 * 
 * 2. SUMBU VERTIKAL (Y) -> Gerak Lurus Berubah Beraturan (GLBB):
 *    - Bekerja gaya gravitasi konstan ke bawah (ay = -g).
 *    - Komponen kecepatan vertikal berubah linear terhadap waktu:
 *        vy(t) = v0 * sin(theta) - g * t
 *    - Posisi vertikal proyektil (memperhitungkan ketinggian awal h0):
 *        y(t)  = h0 + v0 * sin(theta) * t - 0.5 * g * t^2
 * 
 * 3. BESAR DAN ARAH KECEPATAN RESULTAN:
 *    - Besar laju sesaat: v(t) = sqrt(vx(t)^2 + vy(t)^2)
 *    - Arah kemiringan gerak: alpha = arctan(vy / vx)
 * 
 * 4. PARAMETER TITIK PUNCAK & PENDARATAN:
 *    - Waktu menuju titik tertinggi (vy = 0):
 *        tp = (v0 * sin(theta)) / g
 *    - Ketinggian maksimum total dari tanah:
 *        Hmax = h0 + (v0^2 * sin^2(theta)) / (2 * g)
 *    - Waktu total melayang di udara sampai menyentuh tanah (y = 0):
 *        t_total = (v0 * sin(theta) + sqrt((v0 * sin(theta))^2 + 2 * g * h0)) / g
 *    - Jarak jangkauan horizontal terjauh:
 *        Rmax = vx * t_total = v0 * cos(theta) * t_total
 *    - Laju akhir sesaat sebelum menyentuh tanah (Hukum Kekekalan Energi):
 *        v_land = sqrt(v0^2 + 2 * g * h0)
 * =========================================================================================
 */

// =========================================================================================
// BAGIAN 1: VARIABEL & PARAMETER SIMULASI
// =========================================================================================

// --- Parameter Fisika Input ---
let v0 = 42;                     // Kecepatan awal proyektil (m/s), batas: 10 - 100 m/s
let angleDeg = 45;               // Sudut elevasi penembakan (derajat), batas: 0 - 90 derajat
let h0 = 12;                     // Ketinggian awal peluncur dari tanah (meter), batas: 0 - 50 m
let gravity = 9.8;               // Percepatan gravitasi (m/s^2), batas: 1 - 20 m/s^2

// --- Status Mesin Simulasi (State Machine) ---
// 'IDLE'   : Diam di peluncur, siap ditembakkan
// 'FLYING' : Sedang melayang di udara
// 'PAUSED' : Dijeda sementara
// 'LANDED' : Sudah menyentuh tanah / selesai melayang
let simState = 'IDLE';
let simTime = 0;                 // Stopwatch waktu gerak proyektil (detik)
let simSpeed = 1.0;              // Pengali laju animasi (1.0x normal, 0.5x, 0.25x slow motion)
const dt = 1 / 60;               // Langkah delta waktu per frame pada standar layar 60 FPS

// --- Objek Keadaan Proyektil (Posisi & Vektor Gerak) ---
let proj = {
  x: 0,                          // Koordinat jarak horizontal saat ini (meter)
  y: 0,                          // Koordinat tinggi vertikal saat ini (meter)
  vx: 0,                         // Komponen kecepatan horizontal saat ini (m/s)
  vy: 0,                         // Komponen kecepatan vertikal saat ini (m/s)
  v: 0,                          // Resultan kecepatan saat ini (m/s)
  rotation: 0                    // Sudut rotasi visual karakter sesuai arah geraknya
};

// --- Riwayat Garis Lintasan (Trajectory Trails) ---
let currentTrail = [];           // Menyimpan titik-titik lintasan tembakan aktif
let pastTrails = [];             // Menyimpan riwayat lintasan tembakan sebelumnya untuk perbandingan

// --- Titik Sampel Lintasan untuk Fitur Inspeksi (Click to Inspect) ---
let sampledNodes = [];           // Menyimpan data lengkap titik: [{ t, x, y, vx, vy, v, deg }]
let selectedNode = null;         // Titik yang sedang aktif diklik dan ditampilkan kartunya
let hoveredNode = null;          // Titik yang sedang disentuh oleh kursor mouse
let lastSampleTime = 0;          // Pencatat interval pencuplikan titik (tiap 0.12 detik)

// --- Misi Mode Tantangan (Angry Birds Challenge Target) ---
let target = {
  x: 68,                         // Posisi horizontal sasaran (meter)
  y: 8,                          // Ketinggian sasaran dari tanah (meter)
  radius: 3.2,                   // Radius area tabrakan sasaran (meter)
  isHit: false,                  // Status apakah sasaran sudah terkena tembakan
  score: 0                       // Akumulasi skor pemain
};

// --- Efek Visual Partikel ---
let particles = [];              // Partikel asap dan percikan tanah
let confetti = [];               // Partikel konfeti warna-warni saat target hancur
let clouds = [];                 // Awan kartun yang bergerak di latar belakang

// --- Pengaturan Tampilan Visual (Toggle) ---
let showVectors = true;          // Tampilkan panah vektor kecepatan (vx, vy, v)
let showTrail = true;            // Tampilkan garis jejak lintasan
let showTheoreticalPath = true;  // Tampilkan garis putus-putus perkiraan lintasan analitis
let showMarkers = true;          // Tampilkan penanda puncak (Hmax) dan pendaratan (Rmax)
let autoScale = true;            // Penyesuaian skala otomatis agar seluruh parabola muat di layar

// --- Status Interaksi Mouse Dragging ---
let isAimingCannon = false;      // Sedang menyeret laras meriam dengan mouse
let isDraggingPlatform = false;  // Sedang menyeret tebing/platform naik-turun dengan mouse

// --- Konfigurasi Koordinat Kanvas ---
const ORIGIN_X = 90;             // Titik X poros pangkal peluncur di kanvas (pixel)
const GROUND_Y = 470;            // Garis permukaan tanah di kanvas (pixel)
const VIEW_W = 880;              // Lebar efektif area visualisasi (pixel)
const VIEW_H = 410;              // Tinggi efektif area visualisasi (pixel)
let meterToPixel = 3.6;          // Rasio konversi skala: berapa pixel mewakili 1 meter di dunia nyata

// --- Elemen Antarmuka Pengguna (UI Komponen) ---
let sliders = {};                // Objek penyimpan 4 slider utama (v0, theta, h0, g)
let buttons = [];                // Objek penyimpan tombol aksi utama

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
  // Inisialisasi 4 Slider Parameter Fisika (Posisi Presisi & Proporsional)
  // Format: CartoonSlider(x, y, lebar, minVal, maxVal, nilaiAwal, label, satuan, step, warna)
  // ---------------------------------------------------------------------------------------
  sliders.v0 = new CartoonSlider(45, 544, 215, 10, 100, v0, 'Kecepatan Awal (v₀)', 'm/s', 1, '#ff5722');
  sliders.angle = new CartoonSlider(290, 544, 215, 0, 90, angleDeg, 'Sudut Elevasi (θ)', '°', 1, '#ff9800');
  sliders.h0 = new CartoonSlider(535, 544, 215, 0, 50, h0, 'Ketinggian Awal (h₀)', 'm', 1, '#4caf50');
  sliders.gravity = new CartoonSlider(780, 544, 215, 1.0, 20.0, gravity, 'Percepatan Gravitasi (g)', 'm/s²', 0.1, '#00bcd4');

  // ---------------------------------------------------------------------------------------
  // Inisialisasi Tombol Kontrol Aksi Utama (Langsung di bawah Slider secara Proporsional)
  // Format: CartoonButton(x, y, lebar, tinggi, label, warnaDasar, warnaHover, fungsiAksi)
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
    sampledNodes = [];
    selectedNode = null;
  }));
}

// =========================================================================================
// BAGIAN 3: DRAW LOOP UTAMA (DIULANG ~60 KALI PER DETIK)
// =========================================================================================
function draw() {
  drawCartoonEnvironment();

  if (simState === 'IDLE') {
    v0 = sliders.v0.value;
    angleDeg = sliders.angle.value;
    h0 = sliders.h0.value;
    gravity = sliders.gravity.value;
    proj.x = 0;
    proj.y = h0;
  }

  let ana = calculateAnalytical(v0, angleDeg, h0, gravity);
  updateScale(ana.Rmax, ana.Hmax);

  if (simState === 'FLYING') {
    updatePhysics(ana);
  }

  updateParticles();
  drawMeterRuler(ana.Rmax, ana.Hmax);

  let cannonY = GROUND_Y - h0 * meterToPixel;
  drawWoodenPlatform(ORIGIN_X, GROUND_Y, cannonY, h0);

  if (showTheoreticalPath) {
    drawTheoreticalPath(v0, angleDeg, h0, gravity, ana.tTotal);
  }

  if (showTrail) {
    drawPastTrails();
    drawCurrentTrail();
  }

  drawSampledNodes();
  drawChallengeTarget();

  if (showMarkers) {
    drawMarkers(ana);
  }

  drawCartoonLauncher(ORIGIN_X, cannonY, angleDeg);
  drawCharacterProjectile(ORIGIN_X, cannonY, ana);
  drawParticles();

  if (selectedNode) {
    drawNodeInspectorCard(selectedNode);
  }

  drawTelemetryOverlay(ana);
  drawChallengeBanner();
  drawControlInterface();
  updateMouseCursor(cannonY);
}

// =========================================================================================
// BAGIAN 4: KALKULASI ANALITIS FISIKA IDEAL
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

  let Rmax = v0x * tTotal;
  let vLand = Math.sqrt(v_init * v_init + 2 * g_acc * y0);

  return { rad, v0x, v0y, tPeak, Hmax, tTotal, Rmax, xPeak, vLand };
}

// =========================================================================================
// BAGIAN 5: SISTEM SKALA ADAPTIF OTOMATIS (AUTO-SCALING)
// =========================================================================================
function updateScale(Rmax, Hmax) {
  if (!autoScale) return;

  let maxRefX = Math.max(Rmax, target.x + 10, 20);
  let maxRefY = Math.max(Hmax, target.y + 10, 15);

  let safeW = VIEW_W - 90;
  let safeH = VIEW_H - 75;

  let targetScaleX = safeW / maxRefX;
  let targetScaleY = safeH / maxRefY;
  let targetScale = constrain(Math.min(targetScaleX, targetScaleY), 0.05, 10.0);

  if (simState === 'IDLE' && !isDraggingPlatform) {
    meterToPixel = lerp(meterToPixel, targetScale, 0.15);
  }
}

// =========================================================================================
// BAGIAN 6: LOGIKA TEMBAK, INTEGRASI FISIKA NUMERIK, & TABRAKAN TARGET
// =========================================================================================
function fireProjectile() {
  v0 = sliders.v0.value;
  angleDeg = sliders.angle.value;
  h0 = sliders.h0.value;
  gravity = sliders.gravity.value;

  let ana = calculateAnalytical(v0, angleDeg, h0, gravity);
  simTime = 0;
  lastSampleTime = 0;
  proj.x = 0;
  proj.y = h0;
  proj.vx = ana.v0x;
  proj.vy = ana.v0y;
  proj.v = v0;
  proj.rotation = -radians(angleDeg);

  if (currentTrail.length > 1) {
    pastTrails.push([...currentTrail]);
    if (pastTrails.length > 5) pastTrails.shift();
  }
  currentTrail = [{ x: 0, y: h0 }];
  sampledNodes = [];
  selectedNode = null;

  addSampledNode(0, proj.x, proj.y, proj.vx, proj.vy, proj.v);

  let rad = radians(angleDeg);
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

  proj.x = ana.v0x * simTime;
  proj.y = h0 + (ana.v0y * simTime) - (0.5 * gravity * simTime * simTime);

  proj.vx = ana.v0x;
  proj.vy = ana.v0y - (gravity * simTime);
  proj.v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
  proj.rotation = Math.atan2(-proj.vy, proj.vx);

  currentTrail.push({ x: proj.x, y: proj.y });

  if (simTime - lastSampleTime >= 0.12) {
    lastSampleTime = simTime;
    addSampledNode(simTime, proj.x, proj.y, proj.vx, proj.vy, proj.v);
  }

  if (!target.isHit) {
    let dTarget = dist(proj.x, proj.y, target.x, target.y);
    if (dTarget <= target.radius) {
      target.isHit = true;
      target.score += 100;
      let targetPx = ORIGIN_X + target.x * meterToPixel;
      let targetPy = GROUND_Y - target.y * meterToPixel;
      createVictoryConfetti(targetPx, targetPy);
    }
  }

  if (simTime >= ana.tTotal || (proj.y <= 0 && simTime > 0.04)) {
    proj.x = ana.Rmax;
    proj.y = 0;
    let vyLand = -Math.sqrt(ana.v0y * ana.v0y + 2 * gravity * h0);
    proj.vy = vyLand;
    proj.v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
    simTime = ana.tTotal;
    simState = 'LANDED';

    addSampledNode(simTime, proj.x, proj.y, proj.vx, proj.vy, proj.v);

    let landPx = ORIGIN_X + proj.x * meterToPixel;
    createDirtThud(landPx, GROUND_Y);
  }
}

function addSampledNode(t, x, y, vx, vy, v) {
  let deg = degrees(Math.atan2(vy, vx));
  sampledNodes.push({
    t: t,
    x: x,
    y: Math.max(0, y),
    vx: vx,
    vy: vy,
    v: v,
    deg: deg
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
  currentTrail = [];
  sampledNodes = [];
  selectedNode = null;
  particles = [];
  confetti = [];
  target.isHit = false;

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
  target.isHit = false;
  resetSimulation();
}

// =========================================================================================
// BAGIAN 7: PENGGAMBARAN ALAM & LINGKUNGAN KARTUN
// =========================================================================================
function drawCartoonEnvironment() {
  push();
  let skyTop = color(68, 178, 255);
  let skyBottom = color(196, 238, 255);
  for (let y = 0; y <= GROUND_Y + 30; y += 4) {
    let inter = map(y, 0, GROUND_Y, 0, 1);
    stroke(lerpColor(skyTop, skyBottom, inter));
    strokeWeight(4.5);
    line(0, y, width, y);
  }

  noStroke();
  fill(255, 235, 59, 70);
  ellipse(width - 110, 80, 110, 110);
  fill(255, 235, 59, 120);
  ellipse(width - 110, 80, 80, 80);
  fill(255, 241, 118);
  ellipse(width - 110, 80, 56, 56);

  drawClouds();

  fill(140, 214, 112);
  noStroke();
  ellipse(260, GROUND_Y + 70, 720, 240);
  ellipse(780, GROUND_Y + 60, 680, 220);

  fill(108, 196, 85);
  ellipse(480, GROUND_Y + 80, 800, 200);

  fill(166, 115, 68);
  rect(0, GROUND_Y, width, height - GROUND_Y);

  fill(138, 92, 51);
  for (let bx = 40; bx < width; bx += 85) {
    ellipse(bx, GROUND_Y + 22, 14, 8);
    ellipse(bx + 40, GROUND_Y + 36, 10, 6);
  }

  fill(76, 175, 80);
  rect(0, GROUND_Y, width, 14);

  fill(102, 187, 106);
  for (let rx = 0; rx < width; rx += 22) {
    triangle(rx, GROUND_Y, rx + 11, GROUND_Y - 7, rx + 22, GROUND_Y);
  }
  pop();
}

function drawClouds() {
  push();
  noStroke();
  fill(255, 255, 255, 225);
  for (let c of clouds) {
    c.x += c.speed;
    if (c.x > width + 100) c.x = -120;

    let cx = c.x;
    let cy = c.y;
    let s = c.scale;
    ellipse(cx, cy, 50 * s, 32 * s);
    ellipse(cx + 20 * s, cy - 10 * s, 42 * s, 34 * s);
    ellipse(cx - 20 * s, cy - 6 * s, 38 * s, 28 * s);
    ellipse(cx + 38 * s, cy, 34 * s, 24 * s);
  }
  pop();
}

// =========================================================================================
// BAGIAN 8: PENGGARIS SKALA SATUAN METER (GRID SYSTEM)
// =========================================================================================
function drawMeterRuler(Rmax, Hmax) {
  push();
  let stepMeter = 10;
  if (meterToPixel < 0.25) stepMeter = 200;
  else if (meterToPixel < 0.6) stepMeter = 100;
  else if (meterToPixel < 1.4) stepMeter = 50;
  else if (meterToPixel < 3.2) stepMeter = 20;
  else if (meterToPixel < 6.5) stepMeter = 10;
  else stepMeter = 5;

  let maxXMeter = (width - 60 - ORIGIN_X) / meterToPixel;
  for (let m = 0; m <= maxXMeter; m += stepMeter) {
    let px = ORIGIN_X + m * meterToPixel;
    if (px > width - 40) break;

    stroke(255, 255, 255, 75);
    strokeWeight(1);
    drawingContext.setLineDash([3, 4]);
    line(px, 35, px, GROUND_Y);
    drawingContext.setLineDash([]);

    noStroke();
    fill(255);
    textSize(10);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text(m + 'm', px, GROUND_Y + 7);
    textStyle(NORMAL);
  }

  let maxYMeter = (GROUND_Y - 35) / meterToPixel;
  for (let m = stepMeter; m <= maxYMeter; m += stepMeter) {
    let py = GROUND_Y - m * meterToPixel;
    if (py < 35) break;

    stroke(255, 255, 255, 75);
    strokeWeight(1);
    drawingContext.setLineDash([3, 4]);
    line(ORIGIN_X - 10, py, width - 40, py);
    drawingContext.setLineDash([]);

    noStroke();
    fill(255);
    textSize(10);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text(m + 'm', ORIGIN_X - 14, py);
    textStyle(NORMAL);
  }
  pop();
}

// =========================================================================================
// BAGIAN 9: PENGGAMBARAN PLATFORM TEBING KAYU (h0)
// =========================================================================================
function drawWoodenPlatform(baseX, groundY, cannonY, currentH0) {
  if (currentH0 <= 0.05) return;
  push();

  let platLeft = 30;
  let platRight = baseX + 24;
  let platW = platRight - platLeft;
  let platH = groundY - cannonY;

  fill(160, 95, 45);
  stroke(105, 55, 20);
  strokeWeight(2.5);
  rect(platLeft, cannonY, platW, platH, 4, 4, 0, 0);

  stroke(105, 55, 20);
  strokeWeight(2);
  for (let y = groundY; y >= cannonY + 25; y -= 35) {
    line(platLeft + 2, y, platRight - 2, y - 25);
    line(platLeft + 2, y - 25, platRight - 2, y);
  }

  fill(210, 140, 75);
  stroke(95, 45, 15);
  strokeWeight(2.5);
  rect(platLeft - 4, cannonY - 6, platW + 8, 9, 3);

  fill(255);
  stroke(105, 55, 20);
  strokeWeight(2);
  rect(platLeft + 4, (groundY + cannonY) / 2 - 10, platW - 8, 20, 5);

  noStroke();
  fill(105, 55, 20);
  textSize(10);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text('h₀: ' + currentH0.toFixed(0) + 'm', platLeft + platW / 2, (groundY + cannonY) / 2);
  textStyle(NORMAL);

  fill(255, 215, 0);
  stroke(180, 130, 0);
  strokeWeight(1.5);
  ellipse(platRight - 4, cannonY - 14, 16, 16);
  fill(60);
  noStroke();
  triangle(platRight - 4, cannonY - 19, platRight - 8, cannonY - 14, platRight, cannonY - 14);
  triangle(platRight - 4, cannonY - 9, platRight - 8, cannonY - 14, platRight, cannonY - 14);
  pop();
}

// =========================================================================================
// BAGIAN 10: PENGGAMBARAN PELUNCUR MERIAM KARTUN
// =========================================================================================
function drawCartoonLauncher(baseX, cannonY, angle) {
  push();
  translate(baseX, cannonY);

  let dMouse = dist(mouseX, mouseY, baseX, cannonY);
  let isHover = (dMouse < 75 && simState === 'IDLE');

  if (isHover || isAimingCannon) {
    fill(255, 235, 59, 50);
    stroke(255, 193, 7, 180);
    strokeWeight(1.5);
    drawingContext.setLineDash([4, 4]);
    ellipse(0, 0, 115, 115);
    drawingContext.setLineDash([]);
  }

  fill(160, 95, 45);
  stroke(90, 45, 15);
  strokeWeight(2.5);
  ellipse(0, 4, 34, 34);
  fill(210, 140, 75);
  ellipse(0, 4, 18, 18);
  fill(90, 45, 15);
  ellipse(0, 4, 7, 7);

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

  stroke(255, 87, 34, 180);
  strokeWeight(1.5);
  drawingContext.setLineDash([4, 4]);
  line(55, 0, 115, 0);
  drawingContext.setLineDash([]);
  pop();

  push();
  noFill();
  stroke(255, 87, 34);
  strokeWeight(2);
  arc(baseX, cannonY, 56, 56, -radians(angle), 0);

  fill(255, 255, 255);
  stroke(180, 50, 20);
  strokeWeight(2);
  rect(baseX + 32, cannonY - 22, 34, 18, 4);

  noStroke();
  fill(180, 50, 20);
  textSize(10);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(Math.round(angle) + '°', baseX + 49, cannonY - 13);
  textStyle(NORMAL);
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
    px = baseX + 48 * Math.cos(rad);
    py = cannonY - 48 * Math.sin(rad);
  } else {
    px = ORIGIN_X + proj.x * meterToPixel;
    py = GROUND_Y - proj.y * meterToPixel;
    currentVx = proj.vx;
    currentVy = proj.vy;
    currentV = proj.v;
  }

  if (showVectors && simState !== 'LANDED') {
    drawVelocityVectors(px, py, currentVx, currentVy, currentV);
  }

  push();
  translate(px, py);
  if (simState === 'FLYING') {
    rotate(proj.rotation);
  }

  fill(229, 57, 53);
  stroke(136, 14, 14);
  strokeWeight(2);
  ellipse(0, 0, 22, 22);

  fill(255, 236, 179);
  noStroke();
  arc(0, 4, 16, 12, 0, PI);

  fill(255);
  stroke(40);
  strokeWeight(1);
  ellipse(4, -3, 6, 7);
  ellipse(-2, -3, 6, 7);

  fill(20);
  noStroke();
  ellipse(5, -3, 3, 3);
  ellipse(-1, -3, 3, 3);

  stroke(20);
  strokeWeight(2);
  line(-5, -8, 2, -6);
  line(2, -6, 8, -8);

  fill(255, 179, 0);
  stroke(180, 110, 0);
  strokeWeight(1);
  triangle(4, -1, 4, 4, 12, 1.5);
  pop();
}

function drawVelocityVectors(px, py, vx, vy, v) {
  let scale = 1.35;
  let vxLen = vx * scale;
  let vyLen = -vy * scale;

  drawArrow(px, py, px + vxLen, py, color(33, 150, 243), 'vₓ = ' + vx.toFixed(1), 2.2);
  drawArrow(px, py, px, py + vyLen, color(76, 175, 80), 'vᵧ = ' + vy.toFixed(1), 2.2);
  drawArrow(px, py, px + vxLen, py + vyLen, color(255, 111, 0), 'v = ' + v.toFixed(1), 2.8);
}

function drawArrow(x1, y1, x2, y2, col, label, weight) {
  let d = dist(x1, y1, x2, y2);
  if (d < 5) return;

  push();
  stroke(col);
  strokeWeight(weight);
  fill(col);
  line(x1, y1, x2, y2);

  let angle = atan2(y2 - y1, x2 - x1);
  let arrowSize = 8;
  translate(x2, y2);
  rotate(angle);
  triangle(0, 0, -arrowSize, -arrowSize * 0.45, -arrowSize, arrowSize * 0.45);
  pop();

  push();
  noStroke();
  fill(col);
  textSize(9.5);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  let midX = (x1 + x2) / 2 + 10 * Math.sin(atan2(y2 - y1, x2 - x1));
  let midY = (y1 + y2) / 2 - 10 * Math.cos(atan2(y2 - y1, x2 - x1));
  text(label, midX, midY);
  textStyle(NORMAL);
  pop();
}

// =========================================================================================
// BAGIAN 12: PENGGAMBARAN SASARAN TANTANGAN (TARGET TOWER)
// =========================================================================================
function drawChallengeTarget() {
  push();
  let tPx = ORIGIN_X + target.x * meterToPixel;
  let tPy = GROUND_Y - target.y * meterToPixel;

  fill(210, 140, 75);
  stroke(105, 55, 20);
  strokeWeight(2);
  rect(tPx - 14, tPy + 14, 28, GROUND_Y - (tPy + 14), 3);

  for (let by = tPy + 14; by < GROUND_Y - 10; by += 26) {
    line(tPx - 14, by, tPx + 14, by);
    line(tPx - 14, by, tPx + 14, by + 26);
    line(tPx - 14, by + 26, tPx + 14, by);
  }

  if (target.isHit) {
    noStroke();
    fill(255, 235, 59, 200);
    ellipse(tPx, tPy, 36, 36);
    fill(255, 87, 34);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('💥 HANCUR!', tPx, tPy);
    pop();
    return;
  }

  fill(129, 199, 132);
  stroke(46, 125, 50);
  strokeWeight(2.5);
  ellipse(tPx, tPy, 28, 28);

  fill(165, 214, 167);
  ellipse(tPx, tPy + 2, 12, 9);
  fill(46, 125, 50);
  noStroke();
  ellipse(tPx - 3, tPy + 2, 2.5, 3.5);
  ellipse(tPx + 3, tPy + 2, 2.5, 3.5);

  fill(255);
  stroke(30);
  strokeWeight(1);
  ellipse(tPx - 6, tPy - 4, 6, 7);
  ellipse(tPx + 6, tPy - 4, 6, 7);
  fill(20);
  noStroke();
  ellipse(tPx - 5, tPy - 4, 2.5, 2.5);
  ellipse(tPx + 5, tPy - 4, 2.5, 2.5);

  noFill();
  stroke(244, 67, 54, 180);
  strokeWeight(1.8);
  drawingContext.setLineDash([4, 4]);
  ellipse(tPx, tPy, target.radius * meterToPixel * 2, target.radius * meterToPixel * 2);
  drawingContext.setLineDash([]);

  fill(255);
  stroke(105, 55, 20);
  strokeWeight(2);
  rect(tPx - 38, tPy - 32, 76, 18, 5);

  noStroke();
  fill(105, 55, 20);
  textSize(9.5);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(`X:${target.x}m Y:${target.y}m`, tPx, tPy - 23);
  textStyle(NORMAL);
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
    let isHover = (dMouse < 9);
    if (isHover) hoveredNode = pt;

    let isSelected = (selectedNode === pt);

    if (isSelected) {
      noFill();
      stroke(255, 193, 7);
      strokeWeight(3);
      ellipse(px, py, 16 + sin(frameCount * 0.15) * 4, 16 + sin(frameCount * 0.15) * 4);

      drawArrow(px, py, px + pt.vx * 0.9, py, color(33, 150, 243), '', 2);
      drawArrow(px, py, px, py - pt.vy * 0.9, color(76, 175, 80), '', 2);
      drawArrow(px, py, px + pt.vx * 0.9, py - pt.vy * 0.9, color(255, 111, 0), '', 2.4);
    }

    fill(isSelected ? '#ff9800' : (isHover ? '#ffffff' : '#ffd54f'));
    stroke(isSelected ? '#ffffff' : (isHover ? '#ff5722' : '#bf360c'));
    strokeWeight(isHover || isSelected ? 2.5 : 1.5);
    ellipse(px, py, isHover ? 11 : 7.5, isHover ? 11 : 7.5);
  }
  pop();
}

function drawNodeInspectorCard(node) {
  push();
  let px = ORIGIN_X + node.x * meterToPixel;
  let py = GROUND_Y - node.y * meterToPixel;

  let cardW = 220;
  let cardH = 135;
  let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
  let cardY = constrain(py - cardH - 20, 25, GROUND_Y - cardH - 10);

  fill(255);
  noStroke();
  triangle(px, py - 4, px - 8, cardY + cardH, px + 8, cardY + cardH);

  fill(255);
  stroke(255, 152, 0);
  strokeWeight(2.5);
  rect(cardX, cardY, cardW, cardH, 10);

  fill(255, 152, 0);
  noStroke();
  rect(cardX, cardY, cardW, 26, 10, 10, 0, 0);

  fill(255);
  textSize(10.5);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('🔍 DETAIL FISIKA TITIK LINTASAN', cardX + 10, cardY + 13);

  fill(255);
  textAlign(RIGHT, CENTER);
  text('✕', cardX + cardW - 10, cardY + 13);
  textStyle(NORMAL);

  let sy = cardY + 38;
  let lh = 17;

  drawInspectorRow('Waktu (t)', node.t.toFixed(2) + ' detik', '#374151', cardX + 10, sy);
  drawInspectorRow('Jarak Horisontal (x)', node.x.toFixed(2) + ' m', '#1e88e5', cardX + 10, sy + lh);
  drawInspectorRow('Ketinggian (y)', node.y.toFixed(2) + ' m', '#43a047', cardX + 10, sy + lh * 2);
  drawInspectorRow('Kecepatan Horisontal (vₓ)', node.vx.toFixed(2) + ' m/s', '#1e88e5', cardX + 10, sy + lh * 3);
  drawInspectorRow('Kecepatan Vertikal (vᵧ)', node.vy.toFixed(2) + ' m/s', '#43a047', cardX + 10, sy + lh * 4);
  drawInspectorRow('Resultan Laju (v)', node.v.toFixed(2) + ' m/s (' + Math.round(node.deg) + '°)', '#f57c00', cardX + 10, sy + lh * 5);
  pop();
}

function drawInspectorRow(label, val, valColor, x, y) {
  noStroke();
  fill(100, 116, 139);
  textSize(9.5);
  textAlign(LEFT, CENTER);
  text(label, x, y);

  fill(valColor);
  textStyle(BOLD);
  textAlign(RIGHT, CENTER);
  text(val, x + 200, y);
  textStyle(NORMAL);
}

// =========================================================================================
// BAGIAN 14: LINTASAN TEORETIS & PENANDA TITIK KUNCI (Hmax & Rmax)
// =========================================================================================
function drawTheoreticalPath(v_init, deg, y0, g_acc, t_total) {
  if (t_total <= 0) return;
  push();
  stroke(255, 255, 255, 160);
  strokeWeight(2);
  noFill();

  let rad = radians(deg);
  let v0x = v_init * Math.cos(rad);
  let v0y = v_init * Math.sin(rad);

  drawingContext.setLineDash([5, 5]);
  beginShape();
  let steps = 60;
  for (let i = 0; i <= steps; i++) {
    let t = (i / steps) * t_total;
    let x_m = v0x * t;
    let y_m = y0 + v0y * t - 0.5 * g_acc * t * t;
    vertex(ORIGIN_X + x_m * meterToPixel, GROUND_Y - y_m * meterToPixel);
  }
  endShape();
  drawingContext.setLineDash([]);
  pop();
}

function drawPastTrails() {
  push();
  strokeWeight(1.8);
  noFill();
  for (let i = 0; i < pastTrails.length; i++) {
    let tr = pastTrails[i];
    let alphaVal = map(i, 0, pastTrails.length, 50, 130);
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
  if (currentTrail.length < 2) return;
  push();
  stroke(255, 87, 34);
  strokeWeight(3.2);
  noFill();
  beginShape();
  for (let pt of currentTrail) {
    vertex(ORIGIN_X + pt.x * meterToPixel, GROUND_Y - pt.y * meterToPixel);
  }
  endShape();
  pop();
}

function drawMarkers(ana) {
  push();
  let peakPx = ORIGIN_X + ana.xPeak * meterToPixel;
  let peakPy = GROUND_Y - ana.Hmax * meterToPixel;
  let landPx = ORIGIN_X + ana.Rmax * meterToPixel;
  let landPy = GROUND_Y;

  if (ana.Hmax > 0.5) {
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

  if (ana.Rmax > 1.0) {
    // Tiang bendera dan bendera penanda pendaratan
    stroke(229, 57, 53);
    strokeWeight(2.5);
    line(landPx, landPy, landPx, landPy - 26);

    fill(229, 57, 53);
    noStroke();
    triangle(landPx, landPy - 26, landPx, landPy - 14, landPx + 16, landPy - 20);
    ellipse(landPx, landPy, 9, 9);

    // Badge label R_maks diposisikan di ATAS bendera agar tidak tertutup panel kontrol bawah
    let badgeW = 90;
    let badgeH = 20;
    let badgeX = constrain(landPx, badgeW / 2 + 15, width - badgeW / 2 - 15);
    let badgeY = landPy - 52;

    // Garis sambung tipis dari bendera ke badge penanda
    stroke(229, 57, 53, 160);
    strokeWeight(1);
    line(landPx, landPy - 26, badgeX, badgeY + badgeH);

    // Kotak badge R_maks yang cerah dan kontras tinggi
    fill(255, 235, 238);
    stroke(198, 40, 40);
    strokeWeight(1.5);
    rect(badgeX - badgeW / 2, badgeY, badgeW, badgeH, 5);

    // Teks R_maks (Jangkauan Maksimum / Radius)
    noStroke();
    fill(198, 40, 40);
    textSize(10);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('Rₘₐₖₛ: ' + ana.Rmax.toFixed(1) + 'm', badgeX, badgeY + badgeH / 2);
    textStyle(NORMAL);
  }
  pop();
}

// =========================================================================================
// BAGIAN 15: EFEK PARTIKEL VISUAL (KONFETI, ASAP, DEBU PENDARATAN)
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
  for (let i = 0; i < 18; i++) {
    particles.push({
      x: x,
      y: y,
      vx: random(-2, 4),
      vy: random(-3, 3),
      size: random(8, 20),
      alpha: 220,
      decay: random(7, 14),
      color: color(255, random(220, 255), random(200, 255))
    });
  }
}

function createDirtThud(x, y) {
  for (let i = 0; i < 22; i++) {
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
  let boxH = 220;

  fill(255, 255, 255, 240);
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

  let statusText = (simState === 'FLYING') ? 'MELAYANG' : (simState === 'LANDED' ? 'MENDARAT' : 'SIAP TEMBAK');
  let statusBg = (simState === 'FLYING') ? '#4caf50' : (simState === 'LANDED' ? '#e53935' : '#2196f3');
  fill(statusBg);
  rect(boxX + boxW - 85, boxY + 6, 75, 16, 4);

  fill(255);
  textSize(9);
  textAlign(CENTER, CENTER);
  text(statusText, boxX + boxW - 47, boxY + 14);
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
  drawWhiteDataRow('Jarak Terjauh (Rₘₐₖₛ)', ana.Rmax.toFixed(2) + ' m', '#e53935', boxX + 12, sy + lh * 7 + 7);
  pop();
}

function drawWhiteDataRow(label, val, valColor, x, y) {
  noStroke();
  fill(100, 116, 139);
  textSize(10);
  textAlign(LEFT, CENTER);
  text(label, x, y);

  fill(valColor);
  textStyle(BOLD);
  textAlign(RIGHT, CENTER);
  text(val, x + 250, y);
  textStyle(NORMAL);
}

// -----------------------------------------------------------------------------------------
// PAPAN MISI TANTANGAN SASARAN (TULISAN TAJAM, BERSIH, TANPA EFEK STROKE)
// -----------------------------------------------------------------------------------------
function drawChallengeBanner() {
  push();
  let banX = 30;
  let banY = 22;
  let banW = 295;
  let banH = 54;

  // Background box putih bersih dengan border halus
  fill(255, 255, 255, 248);
  stroke(76, 175, 80);
  strokeWeight(2);
  rect(banX, banY, banW, banH, 10);

  // noStroke() mutlak dipanggil agar tulisan teks tajam dan tidak terkena stroke tebal
  noStroke();

  // Judul: Huruf tajam, kontras tinggi, dan berjarak lega
  fill(46, 125, 50);
  textSize(11.5);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('🎯 MISI TANTANGAN SASARAN', banX + 14, banY + 10);

  // Keterangan target dan skor: Spasi lega & mudah dibaca
  fill(30, 41, 59);
  textSize(10.5);
  textStyle(NORMAL);
  text(`Target: X = ${target.x}m, Y = ${target.y}m   |   Skor: ${target.score}`, banX + 14, banY + 29);
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
  textAlign(RIGHT, CENTER);
  text('💡 Tips: Anda juga bisa langsung menyeret laras meriam (sudut) & tebing (ketinggian) dengan mouse!', width - 45, 517);

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
  constructor(x, y, w, minVal, maxVal, defaultVal, label, unit, step, themeColor) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.minVal = minVal;
    this.maxVal = maxVal;
    this.value = defaultVal;
    this.label = label;
    this.unit = unit;
    this.step = step;
    this.themeColor = themeColor;
    this.isDragging = false;
  }

  draw() {
    push();
    noStroke();
    fill(71, 85, 105);
    textSize(10.5);
    textStyle(BOLD);
    textAlign(LEFT, BOTTOM);
    text(this.label, this.x, this.y - 7);

    fill(this.themeColor);
    textAlign(RIGHT, BOTTOM);
    let valStr = (this.step < 1) ? this.value.toFixed(1) : Math.round(this.value);
    text(valStr + ' ' + this.unit, this.x + this.w, this.y - 7);
    textStyle(NORMAL);

    stroke(226, 232, 240);
    strokeWeight(7);
    strokeCap(ROUND);
    line(this.x, this.y + 6, this.x + this.w, this.y + 6);

    let handleX = map(this.value, this.minVal, this.maxVal, this.x, this.x + this.w);
    stroke(this.themeColor);
    strokeWeight(7);
    line(this.x, this.y + 6, handleX, this.y + 6);

    fill(255);
    stroke(this.themeColor);
    strokeWeight(3);
    ellipse(handleX, this.y + 6, 18, 18);

    fill(this.themeColor);
    noStroke();
    ellipse(handleX, this.y + 6, 6, 6);
    pop();
  }

  checkMousePressed(mx, my) {
    let handleX = map(this.value, this.minVal, this.maxVal, this.x, this.x + this.w);
    if (dist(mx, my, handleX, this.y + 6) < 18 || (mx >= this.x && mx <= this.x + this.w && Math.abs(my - (this.y + 6)) < 14)) {
      this.isDragging = true;
      this.updateFromMouse(mx);
      return true;
    }
    return false;
  }

  updateFromMouse(mx) {
    let val = map(mx, this.x, this.x + this.w, this.minVal, this.maxVal);
    val = constrain(val, this.minVal, this.maxVal);
    if (this.step < 1) {
      this.value = Math.round(val * 10) / 10;
    } else {
      this.value = Math.round(val / this.step) * this.step;
    }
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
  }

  draw() {
    push();
    let isHover = mouseX >= this.x && mouseX <= this.x + this.w && mouseY >= this.y && mouseY <= this.y + this.h;

    fill(0, 0, 0, 25);
    noStroke();
    rect(this.x + 2, this.y + 2, this.w, this.h, 6);

    fill(isHover ? this.hoverColor : this.baseColor);
    stroke(255);
    strokeWeight(1.2);
    rect(this.x, this.y, this.w, this.h, 6);

    noStroke();
    fill(255);
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
// BAGIAN 19: PENANGANAN INTERAKSI MOUSE (MOUSE LISTENERS)
// =========================================================================================
function updateMouseCursor(cannonY) {
  let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
  let isNearCannon = (dCannon < 75 && mouseX >= ORIGIN_X - 10 && simState === 'IDLE');
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

  for (let pt of sampledNodes) {
    let px = ORIGIN_X + pt.x * meterToPixel;
    let py = GROUND_Y - pt.y * meterToPixel;
    if (dist(mouseX, mouseY, px, py) < 12) {
      selectedNode = pt;
      return;
    }
  }

  if (selectedNode) {
    let cardW = 220;
    let cardH = 135;
    let px = ORIGIN_X + selectedNode.x * meterToPixel;
    let py = GROUND_Y - selectedNode.y * meterToPixel;
    let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
    let cardY = constrain(py - cardH - 20, 25, GROUND_Y - cardH - 10);
    if (mouseX >= cardX + cardW - 25 && mouseX <= cardX + cardW && mouseY >= cardY && mouseY <= cardY + 25) {
      selectedNode = null;
      return;
    }
  }

  if (simState === 'IDLE') {
    let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
    if (dCannon < 80 && mouseX >= ORIGIN_X - 15) {
      isAimingCannon = true;
      updateAngleFromMouse(cannonY);
      return;
    }

    if (mouseX >= 25 && mouseX <= ORIGIN_X + 30 && Math.abs(mouseY - cannonY) < 20) {
      isDraggingPlatform = true;
      updateHeightFromMouse();
      return;
    }
  }

  for (let key in sliders) {
    if (sliders[key].checkMousePressed(mouseX, mouseY)) return;
  }

  for (let btn of buttons) {
    if (btn.checkClick(mouseX, mouseY)) return;
  }
}

function mouseDragged() {
  let cannonY = GROUND_Y - h0 * meterToPixel;

  if (isAimingCannon) {
    updateAngleFromMouse(cannonY);
    return;
  }

  if (isDraggingPlatform) {
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
  isAimingCannon = false;
  isDraggingPlatform = false;
  for (let key in sliders) {
    sliders[key].release();
  }
}

function updateAngleFromMouse(cannonY) {
  let dx = mouseX - ORIGIN_X;
  let dy = cannonY - mouseY;
  let deg = degrees(Math.atan2(dy, dx));
  deg = constrain(Math.round(deg), 0, 90);
  sliders.angle.value = deg;
  angleDeg = deg;
}

function updateHeightFromMouse() {
  let pixelH = GROUND_Y - mouseY;
  let mHeight = pixelH / meterToPixel;
  mHeight = constrain(Math.round(mHeight), 0, 50);
  sliders.h0.value = mHeight;
  h0 = mHeight;
}
