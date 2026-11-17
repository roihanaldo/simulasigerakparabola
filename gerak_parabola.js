/**
 * ============================================================================
 * SIMULASI FISIKA INTERAKTIF: GERAK PARABOLA (PROJECTILE MOTION)
 * EDISI KHUSUS: TEMA CERAH "ANGRY BIRDS" + MODE TANTANGAN (CHALLENGE)
 * + INSPEKSI KLIK TITIK LINTASAN (TRAJECTORY POINT INSPECTOR)
 * ============================================================================
 * Dibuat untuk p5.js & p5.js Web Editor (https://editor.p5js.org)
 * 
 * Fitur Spesial:
 * 1. Visual Kartun Cerah & Ceria (Langit Biru, Bukit Hijau, Awan, Rumput & Tanah).
 * 2. Meriam / Peluncur Kayu Interaktif (Bisa ditarik langsung untuk atur sudut & tinggi).
 * 3. Mode Tantangan Berhadiah Target (Karakter Sasaran di atas Menara Kayu).
 * 4. Inspeksi Titik Lintasan: Setiap titik lingkaran di lintasan DAPAT DIKLIK untuk
 *    menampilkan kartu telemetri detail (t, x, y, vx, vy, v, arah vektor).
 * 5. Partikel Konfeti & Bintang saat target berhasil dihancurkan!
 * ============================================================================
 */

// --- Parameter Simulasi Fisika ---
let v0 = 42;                     // Kecepatan awal (m/s), range: 10 - 100 m/s
let angleDeg = 45;               // Sudut elevasi (derajat), range: 0 - 90 deg
let gravity = 9.8;               // Gravitasi (m/s^2), range: 1 - 20 m/s^2
let h0 = 12;                     // Ketinggian awal (meter), range: 0 - 50 m

// --- Status Simulasi ---
let simState = 'IDLE';           // 'IDLE', 'FLYING', 'PAUSED', 'LANDED'
let simTime = 0;                 // Waktu berjalan (detik)
let simSpeed = 1.0;              // Kecepatan animasi (1.0x, 0.5x, 0.25x)
const dt = 1 / 60;               // Waktu per frame (60 FPS)

// --- Keadaan Proyektil (Burung / Peluru) ---
let proj = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  v: 0,
  rotation: 0
};

// --- Titik Sampel Lintasan yang Bisa Diklik (Trajectory Inspection Nodes) ---
let sampledNodes = [];           // Array objek data [{ t, x, y, vx, vy, v, deg }]
let selectedNode = null;         // Titik yang sedang diklik/diinspeksi oleh pengguna
let hoveredNode = null;          // Titik yang sedang disorot kursor mouse
let lastSampleTime = 0;          // Interval pencatatan titik sampel (tiap 0.12 detik)

// --- Riwayat Lintasan (Trails) ---
let currentTrail = [];           // Jejak garis aktif
let pastTrails = [];             // Jejak garis tembakan sebelumnya

// --- Sistem Mode Tantangan (Target Menara Kayu) ---
let challengeMode = true;
let target = {
  x: 68,                         // Jarak horizontal target (meter)
  y: 8,                          // Ketinggian target dari tanah (meter)
  radius: 3.2,                   // Radius area tabrakan (meter)
  isHit: false,                  // Status terkena tembakan
  hitAnim: 0,                    // Timer animasi hancur
  score: 0,                      // Total skor kemenangan
  combo: 0                       // Jumlah hit berturut-turut
};

// --- Partikel Visual (Konfeti, Bintang, Asap, Percikan) ---
let particles = [];
let confetti = [];
let clouds = [];

// --- Tampilan & Pengaturan Visual ---
let showVectors = true;
let showTrail = true;
let showTheoreticalPath = true;
let showMarkers = true;
let autoScale = true;

// --- Status Drag Interaktif Mouse ---
let isAimingCannon = false;
let isDraggingPlatform = false;

// --- Konfigurasi Koordinat Tampilan ---
const ORIGIN_X = 90;
const GROUND_Y = 470;
const VIEW_W = 880;
const VIEW_H = 410;
let meterToPixel = 3.6;

// --- UI Komponen (Sliders & Buttons bergaya Kartun) ---
let sliders = {};
let buttons = [];
let presetButtons = [];

// ----------------------------------------------------------------------------
// SETUP p5.js
// ----------------------------------------------------------------------------
function setup() {
  createCanvas(1040, 725);
  textFont('Segoe UI, Tahoma, sans-serif');

  // Inisialisasi Awan Melayang di Langit
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: random(width),
      y: random(35, 170),
      speed: random(0.2, 0.5),
      scale: random(0.7, 1.3)
    });
  }

  // 1. Slider Kecepatan Awal
  sliders.v0 = new CartoonSlider(40, 560, 215, 10, 100, v0, 'Kecepatan Awal (v₀)', 'm/s', 1, '#ff5722');

  // 2. Slider Sudut Elevasi
  sliders.angle = new CartoonSlider(280, 560, 215, 0, 90, angleDeg, 'Sudut Elevasi (θ)', '°', 1, '#ff9800');

  // 3. Slider Ketinggian Awal
  sliders.h0 = new CartoonSlider(520, 560, 215, 0, 50, h0, 'Ketinggian Awal (h₀)', 'm', 1, '#4caf50');

  // 4. Slider Gravitasi
  sliders.gravity = new CartoonSlider(760, 560, 215, 1.0, 20.0, gravity, 'Gravitasi (g)', 'm/s²', 0.1, '#00bcd4');

  // Tombol Aksi Utama
  buttons.push(new CartoonButton(40, 660, 130, 38, '🚀 TEMBAK!', '#4caf50', '#388e3c', () => {
    fireProjectile();
  }));

  buttons.push(new CartoonButton(180, 660, 115, 38, '⏸ JEDA', '#2196f3', '#1976d2', function() {
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

  buttons.push(new CartoonButton(305, 660, 105, 38, '🔄 RESET', '#f44336', '#d32f2f', () => {
    resetSimulation();
  }));

  // Tombol Tantangan Baru (Acak Posisi Sasaran)
  buttons.push(new CartoonButton(420, 660, 140, 38, '🎯 TARGET BARU', '#9c27b0', '#7b1fa2', () => {
    randomizeTarget();
  }));

  // Tombol Pilihan Kecepatan Animasi
  buttons.push(new CartoonButton(570, 660, 125, 38, '⏱ Laju: 1.0x', '#607d8b', '#455a64', function() {
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

  // Tombol Toggle Vektor
  buttons.push(new CartoonButton(705, 660, 125, 38, '🏹 Vektor: ON', '#3f51b5', '#303f9f', function() {
    showVectors = !showVectors;
    this.label = showVectors ? '🏹 Vektor: ON' : '🏹 Vektor: OFF';
  }));

  // Tombol Hapus Jejak & Inspeksi
  buttons.push(new CartoonButton(840, 660, 140, 38, '🧹 Bersihkan Titik', '#78909c', '#546e7a', () => {
    pastTrails = [];
    currentTrail = [];
    sampledNodes = [];
    selectedNode = null;
  }));

  // Presets Sudut
  const anglePresets = [
    { name: '0° Datar', a: 0 },
    { name: '30°', a: 30 },
    { name: '45°', a: 45 },
    { name: '60°', a: 60 }
  ];
  for (let i = 0; i < anglePresets.length; i++) {
    presetButtons.push({
      x: 280 + i * 54,
      y: 512,
      w: 49,
      h: 22,
      label: anglePresets[i].name,
      a: anglePresets[i].a
    });
  }

  // Presets Ketinggian
  const heightPresets = [
    { name: '0m', h: 0 },
    { name: '10m', h: 10 },
    { name: '25m', h: 25 },
    { name: '40m', h: 40 }
  ];
  for (let i = 0; i < heightPresets.length; i++) {
    presetButtons.push({
      x: 520 + i * 54,
      y: 512,
      w: 49,
      h: 22,
      label: heightPresets[i].name,
      h: heightPresets[i].h
    });
  }

  // Presets Gravitasi
  const gravPresets = [
    { name: '🌍 Bumi', g: 9.8 },
    { name: '🌕 Bulan', g: 1.62 },
    { name: '🔴 Mars', g: 3.71 },
    { name: '🪐 Yupiter', g: 20.0 }
  ];
  for (let i = 0; i < gravPresets.length; i++) {
    presetButtons.push({
      x: 760 + i * 54,
      y: 512,
      w: 49,
      h: 22,
      label: gravPresets[i].name,
      g: gravPresets[i].g
    });
  }
}

// ----------------------------------------------------------------------------
// DRAW LOOP p5.js
// ----------------------------------------------------------------------------
function draw() {
  // 1. Gambar Langit Cerah, Matahari, Awan, dan Perbukitan
  drawCartoonEnvironment();

  // 2. Sinkronkan nilai kontrol saat tidak melayang
  if (simState === 'IDLE') {
    v0 = sliders.v0.value;
    angleDeg = sliders.angle.value;
    h0 = sliders.h0.value;
    gravity = sliders.gravity.value;
    proj.x = 0;
    proj.y = h0;
  }

  // 3. Kalkulasi Analitis Fisika
  let ana = calculateAnalytical(v0, angleDeg, h0, gravity);
  updateScale(ana.Rmax, ana.Hmax);

  // 4. Update Fisika Proyektil
  if (simState === 'FLYING') {
    updatePhysics(ana);
  }

  // 5. Update Partikel Visual (Asap, Bintang, Konfeti)
  updateParticles();

  // 6. Gambar Grid Ukur Meter
  drawMeterRuler(ana.Rmax, ana.Hmax);

  // 7. Gambar Platform Tebing Kayu/Batu
  let cannonY = GROUND_Y - h0 * meterToPixel;
  drawWoodenPlatform(ORIGIN_X, GROUND_Y, cannonY, h0);

  // 8. Gambar Preview Garis Teoretis
  if (showTheoreticalPath) {
    drawTheoreticalPath(v0, angleDeg, h0, gravity, ana.tTotal);
  }

  // 9. Gambar Jejak Terdahulu & Jejak Aktif
  if (showTrail) {
    drawPastTrails();
    drawCurrentTrail();
  }

  // 10. Gambar Titik-Titik Sampel Lintasan (Interactive Clickable Nodes)
  drawSampledNodes();

  // 11. Gambar Sasaran Tantangan (Target Menara Karakter)
  drawChallengeTarget();

  // 12. Gambar Penanda Titik Tertinggi (Hmax) & Titik Jatuh (Rmax)
  if (showMarkers) {
    drawMarkers(ana);
  }

  // 13. Gambar Peluncur Ketapel/Meriam Kayu
  drawCartoonLauncher(ORIGIN_X, cannonY, angleDeg);

  // 14. Gambar Bola Karakter Proyektil & Vektor Kecepatan
  drawCharacterProjectile(ORIGIN_X, cannonY, ana);

  // 15. Gambar Partikel Visual
  drawParticles();

  // 16. Gambar Kartu Detail Inspeksi Titik (Jika Ada Titik yang Diklik)
  if (selectedNode) {
    drawNodeInspectorCard(selectedNode);
  }

  // 17. Gambar Panel Telemetri Data & Papan Skor Tantangan
  drawTelemetryOverlay(ana);
  drawChallengeBanner();

  // 18. Gambar Panel Kontrol Bawah
  drawControlInterface();

  // 19. Update Kursor Mouse Interaktif
  updateMouseCursor(cannonY);
}

// ----------------------------------------------------------------------------
// KALKULASI ANALITIS FISIKA IDEAL
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// ADAPTIVE AUTO-SCALE
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// SISTEM FISIKA & DETEKSI TABRAKAN TANTANGAN
// ----------------------------------------------------------------------------
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

  // Catat titik awal (t = 0)
  addSampledNode(0, proj.x, proj.y, proj.vx, proj.vy, proj.v);

  // Efek Asap Peluncuran
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
  proj.rotation = Math.atan2(-proj.vy, proj.vx); // Sudut orientasi gerak

  currentTrail.push({ x: proj.x, y: proj.y });

  // Catat titik inspeksi secara berkala (tiap ~0.12 detik)
  if (simTime - lastSampleTime >= 0.12) {
    lastSampleTime = simTime;
    addSampledNode(simTime, proj.x, proj.y, proj.vx, proj.vy, proj.v);
  }

  // Deteksi Tabrakan dengan Sasaran Tantangan (Target Collision)
  if (!target.isHit) {
    let dTarget = dist(proj.x, proj.y, target.x, target.y);
    if (dTarget <= target.radius) {
      target.isHit = true;
      target.score += 100;
      target.combo += 1;
      let targetPx = ORIGIN_X + target.x * meterToPixel;
      let targetPy = GROUND_Y - target.y * meterToPixel;
      createVictoryConfetti(targetPx, targetPy);
    }
  }

  // Deteksi Mendarat di Tanah (y <= 0)
  if (simTime >= ana.tTotal || (proj.y <= 0 && simTime > 0.04)) {
    proj.x = ana.Rmax;
    proj.y = 0;
    let vyLand = -Math.sqrt(ana.v0y * ana.v0y + 2 * gravity * h0);
    proj.vy = vyLand;
    proj.v = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
    simTime = ana.tTotal;
    simState = 'LANDED';

    // Catat titik akhir saat mendarat
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

// ----------------------------------------------------------------------------
// GAMBAR LINGKUNGAN CERAH (SKY, SUN, CLOUDS, HILLS, GROUND)
// ----------------------------------------------------------------------------
function drawCartoonEnvironment() {
  push();

  // 1. Gradasi Langit Biru Cerah
  let skyTop = color(68, 178, 255);
  let skyBottom = color(196, 238, 255);
  for (let y = 0; y <= GROUND_Y + 30; y += 4) {
    let inter = map(y, 0, GROUND_Y, 0, 1);
    stroke(lerpColor(skyTop, skyBottom, inter));
    strokeWeight(4.5);
    line(0, y, width, y);
  }

  // 2. Matahari Kartun Bersinar di Kanan Atas
  noStroke();
  fill(255, 235, 59, 70);
  ellipse(width - 110, 80, 110, 110);
  fill(255, 235, 59, 120);
  ellipse(width - 110, 80, 80, 80);
  fill(255, 241, 118);
  ellipse(width - 110, 80, 56, 56);

  // 3. Awan Kartun Bergerak
  drawClouds();

  // 4. Perbukitan Latar Belakang (Distant Hills)
  fill(140, 214, 112);
  noStroke();
  ellipse(260, GROUND_Y + 70, 720, 240);
  ellipse(780, GROUND_Y + 60, 680, 220);

  fill(108, 196, 85);
  ellipse(480, GROUND_Y + 80, 800, 200);

  // 5. Permukaan Tanah & Rumput Kartun (Ground Layers)
  // Lapisan Tanah Coklat Subur
  fill(166, 115, 68);
  rect(0, GROUND_Y, width, height - GROUND_Y);

  // Lapisan Batu Kecil di Tanah
  fill(138, 92, 51);
  for (let bx = 40; bx < width; bx += 85) {
    ellipse(bx, GROUND_Y + 22, 14, 8);
    ellipse(bx + 40, GROUND_Y + 36, 10, 6);
  }

  // Strip Rumput Hijau Segar
  fill(76, 175, 80);
  rect(0, GROUND_Y, width, 14);

  // Aksen Gelombang Rumput Kartun
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

// ----------------------------------------------------------------------------
// GAMBAR GRID & METER RULER
// ----------------------------------------------------------------------------
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

    // Angka Meter pada Tanah
    noStroke();
    fill(255);
    textSize(10);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text(m + 'm', px, GROUND_Y + 16);
    textStyle(NORMAL);
  }

  // Garis Pengukur Vertikal
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

// ----------------------------------------------------------------------------
// GAMBAR PLATFORM TEBING KAYU (ANGRY BIRDS STYLE)
// ----------------------------------------------------------------------------
function drawWoodenPlatform(baseX, groundY, cannonY, currentH0) {
  if (currentH0 <= 0.05) return;
  push();

  let platLeft = 30;
  let platRight = baseX + 24;
  let platW = platRight - platLeft;
  let platH = groundY - cannonY;

  // Tiang Menara Kayu
  fill(160, 95, 45);
  stroke(105, 55, 20);
  strokeWeight(2.5);
  rect(platLeft, cannonY, platW, platH, 4, 4, 0, 0);

  // Palang Kayu Penguat (Cross Beams)
  stroke(105, 55, 20);
  strokeWeight(2);
  for (let y = groundY; y >= cannonY + 25; y -= 35) {
    line(platLeft + 2, y, platRight - 2, y - 25);
    line(platLeft + 2, y - 25, platRight - 2, y);
  }

  // Papan Atas Tempat Dudukan Peluncur
  fill(210, 140, 75);
  stroke(95, 45, 15);
  strokeWeight(2.5);
  rect(platLeft - 4, cannonY - 6, platW + 8, 9, 3);

  // Label Ketinggian h0
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

  // Handle Drag Ketinggian
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

// ----------------------------------------------------------------------------
// GAMBAR PELUNCUR MERIAM KARTUN (INTERACTIVE DRAG BARREL)
// ----------------------------------------------------------------------------
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

  // Roda Peluncur Kayu
  fill(160, 95, 45);
  stroke(90, 45, 15);
  strokeWeight(2.5);
  ellipse(0, 4, 34, 34);
  fill(210, 140, 75);
  ellipse(0, 4, 18, 18);
  fill(90, 45, 15);
  ellipse(0, 4, 7, 7);

  // Rotasi Laras Meriam
  rotate(-radians(angle));

  // Laras Meriam Merah Ceria (Angry Bird Color)
  fill(isAimingCannon ? '#e53935' : '#d32f2f');
  stroke(70, 15, 15);
  strokeWeight(2.5);
  rect(0, -9, 48, 18, 5);

  // Cincin Moncong Kuning Emas
  fill(255, 193, 7);
  stroke(130, 95, 0);
  strokeWeight(2);
  rect(42, -10, 9, 20, 3);

  // Tombol Drag Sudut di Ujung
  fill(255, 235, 59);
  stroke(255);
  strokeWeight(1.5);
  ellipse(46, 0, 9, 9);

  // Garis Bidik Putus-putus
  stroke(255, 87, 34, 180);
  strokeWeight(1.5);
  drawingContext.setLineDash([4, 4]);
  line(55, 0, 115, 0);
  drawingContext.setLineDash([]);
  pop();

  // Busur Derajat Sudut
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

// ----------------------------------------------------------------------------
// GAMBAR BOLA KARAKTER & VEKTOR KECEPATAN
// ----------------------------------------------------------------------------
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

  // Gambar Panah Vektor
  if (showVectors && simState !== 'LANDED') {
    drawVelocityVectors(px, py, currentVx, currentVy, currentV);
  }

  // Karakter Burung Merah Kartun
  push();
  translate(px, py);
  if (simState === 'FLYING') {
    rotate(proj.rotation);
  }

  // Badan Bulat Merah
  fill(229, 57, 53);
  stroke(136, 14, 14);
  strokeWeight(2);
  ellipse(0, 0, 22, 22);

  // Perut Krem Cerah
  fill(255, 236, 179);
  noStroke();
  arc(0, 4, 16, 12, 0, PI);

  // Mata Kartun Ekspresif
  fill(255);
  stroke(40);
  strokeWeight(1);
  ellipse(4, -3, 6, 7);
  ellipse(-2, -3, 6, 7);

  // Pupil Mata
  fill(20);
  noStroke();
  ellipse(5, -3, 3, 3);
  ellipse(-1, -3, 3, 3);

  // Alis Hitam Galak
  stroke(20);
  strokeWeight(2);
  line(-5, -8, 2, -6);
  line(2, -6, 8, -8);

  // Paruh Kuning
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

  // 1. Horisontal vx (Biru Cerah)
  drawArrow(px, py, px + vxLen, py, color(33, 150, 243), 'vₓ = ' + vx.toFixed(1), 2.2);

  // 2. Vertikal vy (Hijau Segar)
  drawArrow(px, py, px, py + vyLen, color(76, 175, 80), 'vᵧ = ' + vy.toFixed(1), 2.2);

  // 3. Resultan v (Oranye Terang)
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

// ----------------------------------------------------------------------------
// GAMBAR SASARAN TANTANGAN (ANGRY BIRDS TARGET PIG ON TOWER)
// ----------------------------------------------------------------------------
function drawChallengeTarget() {
  push();
  let tPx = ORIGIN_X + target.x * meterToPixel;
  let tPy = GROUND_Y - target.y * meterToPixel;

  // Menara Balok Kayu di Bawah Target
  fill(210, 140, 75);
  stroke(105, 55, 20);
  strokeWeight(2);
  rect(tPx - 14, tPy + 14, 28, GROUND_Y - (tPy + 14), 3);

  // Tekstur Kotak Peti
  for (let by = tPy + 14; by < GROUND_Y - 10; by += 26) {
    line(tPx - 14, by, tPx + 14, by);
    line(tPx - 14, by, tPx + 14, by + 26);
    line(tPx - 14, by + 26, tPx + 14, by);
  }

  // Jika Target Terkena Tembakan
  if (target.isHit) {
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

  // Karakter Babi Hijau Sasaran
  fill(129, 199, 132);
  stroke(46, 125, 50);
  strokeWeight(2.5);
  ellipse(tPx, tPy, 28, 28);

  // Hidung Babi
  fill(165, 214, 167);
  ellipse(tPx, tPy + 2, 12, 9);
  fill(46, 125, 50);
  noStroke();
  ellipse(tPx - 3, tPy + 2, 2.5, 3.5);
  ellipse(tPx + 3, tPy + 2, 2.5, 3.5);

  // Mata Karakter Sasaran
  fill(255);
  stroke(30);
  strokeWeight(1);
  ellipse(tPx - 6, tPy - 4, 6, 7);
  ellipse(tPx + 6, tPy - 4, 6, 7);
  fill(20);
  noStroke();
  ellipse(tPx - 5, tPy - 4, 2.5, 2.5);
  ellipse(tPx + 5, tPy - 4, 2.5, 2.5);

  // Lingkaran Bidik Target
  noFill();
  stroke(244, 67, 54, 180);
  strokeWeight(1.8);
  drawingContext.setLineDash([4, 4]);
  ellipse(tPx, tPy, target.radius * meterToPixel * 2, target.radius * meterToPixel * 2);
  drawingContext.setLineDash([]);

  // Label Target Jarak & Tinggi
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

// ----------------------------------------------------------------------------
// TITIK-TITIK SAMPEL LINTASAN (CLICKABLE INSPECTION NODES)
// ----------------------------------------------------------------------------
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
      // Cincin emas berdenyut untuk titik terpilih
      noFill();
      stroke(255, 193, 7);
      strokeWeight(3);
      ellipse(px, py, 16 + sin(frameCount * 0.15) * 4, 16 + sin(frameCount * 0.15) * 4);

      // Gambar mini vektor pada titik inspeksi
      drawArrow(px, py, px + pt.vx * 0.9, py, color(33, 150, 243), '', 2);
      drawArrow(px, py, px, py - pt.vy * 0.9, color(76, 175, 80), '', 2);
      drawArrow(px, py, px + pt.vx * 0.9, py - pt.vy * 0.9, color(255, 111, 0), '', 2.4);
    }

    // Titik Sampel Lingkaran
    fill(isSelected ? '#ff9800' : (isHover ? '#ffffff' : '#ffd54f'));
    stroke(isSelected ? '#ffffff' : (isHover ? '#ff5722' : '#bf360c'));
    strokeWeight(isHover || isSelected ? 2.5 : 1.5);
    ellipse(px, py, isHover ? 11 : 7.5, isHover ? 11 : 7.5);
  }
  pop();
}

// ----------------------------------------------------------------------------
// KARTU DETAIL INSPEKSI TITIK (POPUP DIALOG CALLOUT)
// ----------------------------------------------------------------------------
function drawNodeInspectorCard(node) {
  push();
  let px = ORIGIN_X + node.x * meterToPixel;
  let py = GROUND_Y - node.y * meterToPixel;

  // Letak kartu di atas titik
  let cardW = 220;
  let cardH = 135;
  let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
  let cardY = constrain(py - cardH - 20, 25, GROUND_Y - cardH - 10);

  // Segitiga Penunjuk (Callout Pointer)
  fill(255);
  noStroke();
  triangle(px, py - 4, px - 8, cardY + cardH, px + 8, cardY + cardH);

  // Background Kartu Bersih Modern
  fill(255);
  stroke(255, 152, 0);
  strokeWeight(2.5);
  rect(cardX, cardY, cardW, cardH, 10);

  // Header Kartu
  fill(255, 152, 0);
  noStroke();
  rect(cardX, cardY, cardW, 26, 10, 10, 0, 0);

  fill(255);
  textSize(10.5);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('🔍 DETAIL FISIKA TITIK LINTASAN', cardX + 10, cardY + 13);

  // Tombol Tutup [X]
  fill(255);
  textAlign(RIGHT, CENTER);
  text('✕', cardX + cardW - 10, cardY + 13);
  textStyle(NORMAL);

  // Baris Data Telemetri Titik
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

// ----------------------------------------------------------------------------
// GAMBAR JEJAK LINTASAN & PREVIEW
// ----------------------------------------------------------------------------
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

  // Hmax Marker
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

    fill(255, 248, 225);
    stroke(190, 130, 0);
    strokeWeight(1.5);
    rect(peakPx - 42, peakPy - 24, 84, 18, 4);

    noStroke();
    fill(130, 75, 0);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('Hₘₐₖₛ: ' + ana.Hmax.toFixed(1) + 'm', peakPx, peakPy - 15);
    textStyle(NORMAL);
  }

  // Rmax Marker (Bendera Merah)
  if (ana.Rmax > 1.0) {
    stroke(229, 57, 53);
    strokeWeight(2);
    line(landPx, landPy, landPx, landPy - 20);

    fill(229, 57, 53);
    noStroke();
    triangle(landPx, landPy - 20, landPx, landPy - 10, landPx + 15, landPy - 15);
    ellipse(landPx, landPy, 8, 8);

    fill(255, 235, 238);
    stroke(198, 40, 40);
    strokeWeight(1.5);
    rect(landPx - 42, landPy + 16, 84, 18, 4);

    noStroke();
    fill(198, 40, 40);
    textSize(9.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('Rₘₐₖₛ: ' + ana.Rmax.toFixed(1) + 'm', landPx, landPy + 25);
    textStyle(NORMAL);
  }
  pop();
}

// ----------------------------------------------------------------------------
// EFEK PARTIKEL CERAH (KONFETI & ASAP)
// ----------------------------------------------------------------------------
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
    c.vy += 0.35; // Gravitasi konfeti
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

// ----------------------------------------------------------------------------
// PANEL TELEMETRI REAL-TIME CERAH
// ----------------------------------------------------------------------------
function drawTelemetryOverlay(ana) {
  push();
  let boxX = width - 305;
  let boxY = 25;
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

  // Status Badge
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

// ----------------------------------------------------------------------------
// BANNER SKOR TANTANGAN (ANGRY BIRDS CHALLENGE)
// ----------------------------------------------------------------------------
function drawChallengeBanner() {
  push();
  let banX = 30;
  let banY = 25;
  let banW = 270;
  let banH = 46;

  fill(255, 255, 255, 240);
  stroke(76, 175, 80);
  strokeWeight(2);
  rect(banX, banY, banW, banH, 8);

  fill(76, 175, 80);
  textSize(11);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('🎯 MISI TANTANGAN SASARAN:', banX + 10, banY + 8);

  fill(55, 65, 81);
  textSize(9.5);
  textStyle(NORMAL);
  text(`Target di X: ${target.x}m, Y: ${target.y}m | Skor: ${target.score}`, banX + 10, banY + 26);
  pop();
}

// ----------------------------------------------------------------------------
// PANEL KONTROL BAWAH (WARNA CERAH RAMAH PENGGUNA)
// ----------------------------------------------------------------------------
function drawControlInterface() {
  push();
  fill(255, 255, 255, 245);
  stroke(203, 213, 225);
  strokeWeight(1.5);
  rect(30, 495, width - 60, 218, 12);

  fill(71, 85, 105);
  noStroke();
  textSize(10.5);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  text('🎛 KONTROL:', 42, 523);
  text('📐 PRESET SUDUT:', 170, 523);
  text('🏔 TINGGI h₀:', 440, 523);
  text('🌍 GRAVITASI:', 680, 523);
  textStyle(NORMAL);

  for (let pb of presetButtons) {
    let isHover = mouseX >= pb.x && mouseX <= pb.x + pb.w && mouseY >= pb.y && mouseY <= pb.y + pb.h;
    fill(isHover ? '#ffeb3b' : '#f8fafc');
    stroke(isHover ? '#f57c00' : '#cbd5e1');
    strokeWeight(1);
    rect(pb.x, pb.y, pb.w, pb.h, 4);

    fill(51, 65, 85);
    noStroke();
    textSize(8.5);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(pb.label, pb.x + pb.w / 2, pb.y + pb.h / 2);
    textStyle(NORMAL);
  }

  for (let key in sliders) sliders[key].draw();
  for (let btn of buttons) btn.draw();
  pop();
}

// ----------------------------------------------------------------------------
// KELAS KOMPONEN UI CANVAS: SLIDER CERAH
// ----------------------------------------------------------------------------
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

    // Rel Belakang
    stroke(226, 232, 240);
    strokeWeight(7);
    strokeCap(ROUND);
    line(this.x, this.y + 6, this.x + this.w, this.y + 6);

    // Rel Aktif Berwarna
    let handleX = map(this.value, this.minVal, this.maxVal, this.x, this.x + this.w);
    stroke(this.themeColor);
    strokeWeight(7);
    line(this.x, this.y + 6, handleX, this.y + 6);

    // Handle Bulat Menawan
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

// ----------------------------------------------------------------------------
// KELAS KOMPONEN UI CANVAS: BUTTON CERAH
// ----------------------------------------------------------------------------
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

    // Drop shadow tipis kartun
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

// ----------------------------------------------------------------------------
// KONTROL KURSOR MOUSE
// ----------------------------------------------------------------------------
function updateMouseCursor(cannonY) {
  let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
  let isNearCannon = (dCannon < 75 && mouseX >= ORIGIN_X - 10 && simState === 'IDLE');
  let isNearPlatform = (h0 > 0 && mouseX >= 25 && mouseX <= ORIGIN_X + 25 && mouseY >= cannonY - 15 && mouseY <= cannonY + 15 && simState === 'IDLE');

  if (hoveredNode) {
    cursor('pointer'); // Hovering di atas titik inspeksi lintasan
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

// ----------------------------------------------------------------------------
// EVENT LISTENER MOUSE
// ----------------------------------------------------------------------------
function mousePressed() {
  let cannonY = GROUND_Y - h0 * meterToPixel;

  // 1. Cek Klik pada Titik Sampel Lintasan (Point Inspection)
  for (let pt of sampledNodes) {
    let px = ORIGIN_X + pt.x * meterToPixel;
    let py = GROUND_Y - pt.y * meterToPixel;
    if (dist(mouseX, mouseY, px, py) < 12) {
      selectedNode = pt;
      return;
    }
  }

  // Cek Tombol Tutup Kartu Inspeksi
  if (selectedNode) {
    let cardW = 220;
    let cardH = 135;
    let px = ORIGIN_X + selectedNode.x * meterToPixel;
    let py = GROUND_Y - selectedNode.y * meterToPixel;
    let cardX = constrain(px - cardW / 2, 25, width - cardW - 25);
    let cardY = constrain(py - cardH - 20, 25, GROUND_Y - cardH - 10);
    // Klik di area [X] pojok kanan atas kartu
    if (mouseX >= cardX + cardW - 25 && mouseX <= cardX + cardW && mouseY >= cardY && mouseY <= cardY + 25) {
      selectedNode = null;
      return;
    }
  }

  // 2. Cek Drag Meriam untuk ubah sudut
  if (simState === 'IDLE') {
    let dCannon = dist(mouseX, mouseY, ORIGIN_X, cannonY);
    if (dCannon < 80 && mouseX >= ORIGIN_X - 15) {
      isAimingCannon = true;
      updateAngleFromMouse(cannonY);
      return;
    }

    // 3. Cek Drag Platform untuk ubah tinggi awal
    if (mouseX >= 25 && mouseX <= ORIGIN_X + 30 && Math.abs(mouseY - cannonY) < 20) {
      isDraggingPlatform = true;
      updateHeightFromMouse();
      return;
    }
  }

  // 4. Cek Sliders
  for (let key in sliders) {
    if (sliders[key].checkMousePressed(mouseX, mouseY)) return;
  }

  // 5. Cek Tombol Aksi
  for (let btn of buttons) {
    if (btn.checkClick(mouseX, mouseY)) return;
  }

  // 6. Cek Preset
  for (let pb of presetButtons) {
    if (mouseX >= pb.x && mouseX <= pb.x + pb.w && mouseY >= pb.y && mouseY <= pb.y + pb.h) {
      if (pb.g !== undefined) {
        sliders.gravity.value = pb.g;
        gravity = pb.g;
      }
      if (pb.a !== undefined) {
        sliders.angle.value = pb.a;
        angleDeg = pb.a;
      }
      if (pb.h !== undefined) {
        sliders.h0.value = pb.h;
        h0 = pb.h;
      }
      return;
    }
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
