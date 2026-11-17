# 🎯 Simulasi Fisika Interaktif: Gerak Parabola (Projectile Motion)

Simulasi fisika interaktif berbasis web untuk materi **Gerak Parabola (Projectile Motion)** tanpa hambatan udara (kasus ideal), dikembangkan menggunakan pustaka **[p5.js](https://p5js.org/)**. 

Simulasi ini dikemas dengan estetika cerah bertema petualangan kartun (terinspirasi dari *Angry Birds*), dilengkapi fitur **inspeksi titik lintasan (click-to-inspect)** dan **mode tantangan sasaran**.

---

## 🌟 Fitur Utama

### 1. 🎛 Kontrol Parameter Interaktif
* **Kecepatan Awal ($v_0$):** Rentang $10 - 100\text{ m/s}$.
* **Sudut Elevasi ($\theta$):** Rentang $0^\circ - 90^\circ$.
* **Ketinggian Awal ($h_0$):** Rentang $0 - 50\text{ meter}$ (simulasi peluncuran dari atas tebing/platform).
* **Percepatan Gravitasi ($g$):** Rentang $1.0 - 20.0\text{ m/s}^2$ (default Bumi $9.8\text{ m/s}^2$).
* **Preset Cepat:**
  * **Sudut:** $0^\circ$ (datar), $30^\circ$, $45^\circ$ (maksimum di tanah datar), $60^\circ$.
  * **Tinggi:** $0\text{ m}$ (tanah), $10\text{ m}$, $25\text{ m}$, $40\text{ m}$ (tebing).
  * **Gravitasi Planet:** 🌍 Bumi ($9.8\text{ m/s}^2$), 🌕 Bulan ($1.62\text{ m/s}^2$), 🔴 Mars ($3.71\text{ m/s}^2$), 🪐 Yupiter ($20.0\text{ m/s}^2$).

### 2. 🎯 Kontrol Drag Langsung (Direct Manipulation)
* **Putar Laras Meriam:** Klik dan tarik (drag) moncong meriam secara langsung menggunakan kursor mouse untuk mengatur sudut tembakan secara bebas.
* **Tarik Platform/Menara:** Klik dan geser dudukan tebing ke atas/bawah untuk mengubah ketinggian awal ($h_0$).

### 3. 🔍 Inspeksi Titik Lintasan (Interactive Trajectory Inspector)
* Di sepanjang kurva lintasan, terdapat **titik-titik sampel kuning** yang dicatat setiap selang waktu.
* **Klik sembarang titik** untuk membuka **kartu dialog telemetri detail**:
  * Waktu tempuh saat di titik tersebut ($t$).
  * Posisi koordinat horizontal ($x$) dan vertikal ($y$).
  * Komponen kecepatan horizontal ($v_x$) dan vertikal ($v_y$).
  * Resultan kecepatan ($v$) serta sudut arah vektor geraknya ($\alpha$).
  * Visualisasi mini vektor kecepatan langsung pada titik yang dipilih.

### 4. 🐷 Mode Tantangan (Angry Birds Challenge)
* Sasaran karakter babi hijau berdiri di atas menara kayu pada koordinat $(X_{\text{target}}, Y_{\text{target}})$.
* Pemain ditantang memperhitungkan kecepatan, sudut, dan ketinggian yang tepat untuk mengenai target.
* Tembakan tepat sasaran memicu ledakan konfeti, bintang animasi, dan pertambahan skor.
* Tombol **"🎯 TARGET BARU"** mengacak posisi jarak dan ketinggian sasaran untuk variasi latihan tanpa batas.

### 5. 🏹 Visualisasi Vektor Real-time
* **$v_x$ (Biru Cerah):** Gerak Lurus Beraturan (GLB), nilainya selalu konstan.
* **$v_y$ (Hijau Segar):** Gerak Lurus Berubah Beraturan (GLBB), mengecil saat naik, bernilai nol di puncak, dan membesar ke arah bawah.
* **$v$ (Oranye Terang):** Vektor resultan yang menyinggung garis lengkung lintasan parabola.

### 6. 📐 Skala Adaptif Otomatis (Auto-Scale)
* Skala tampilan kanvas menyesuaikan secara proporsional secara otomatis sehingga kurva parabola selalu pas berada di dalam layar tanpa terpotong.

---

## 📚 Teori & Rumus Fisika

Gerak parabola tanpa hambatan udara merupakan perpaduan dua gerak yang saling bebas:

| Sumbu | Jenis Gerak | Persamaan Kecepatan | Persamaan Posisi |
| :--- | :--- | :--- | :--- |
| **Horisontal (X)** | GLB ($a_x = 0$) | $v_x(t) = v_0 \cos\theta = \text{konstan}$ | $x(t) = v_x \cdot t$ |
| **Vertikal (Y)** | GLBB ($a_y = -g$) | $v_y(t) = v_0 \sin\theta - g \cdot t$ | $y(t) = h_0 + v_0 \sin\theta \cdot t - \frac{1}{2} g t^2$ |

### Parameter Analitis Utama:
1. **Waktu Mencapai Titik Tertinggi ($t_p$):**
   $$t_p = \frac{v_0 \sin\theta}{g}$$
2. **Ketinggian Maksimum dari Tanah ($H_{\max}$):**
   $$H_{\max} = h_0 + \frac{(v_0 \sin\theta)^2}{2g}$$
3. **Waktu Total di Udara ($t_{\text{total}}$):**
   $$t_{\text{total}} = \frac{v_0 \sin\theta + \sqrt{(v_0 \sin\theta)^2 + 2 g h_0}}{g}$$
4. **Jarak Jangkauan Terjauh ($R_{\max}$):**
   $$R_{\max} = v_x \cdot t_{\text{total}} = (v_0 \cos\theta) \cdot t_{\text{total}}$$
5. **Laju saat Menyentuh Tanah ($v_{\text{land}}$):**
   $$v_{\text{land}} = \sqrt{v_0^2 + 2 g h_0}$$

---

## 🚀 Cara Menjalankan Simulasi

### Opsi 1: Buka Langsung di Browser
1. Clone repositori ini atau download file ZIP-nya:
   ```bash
   git clone https://github.com/roihanaldo-commits/simulasigerakparabola.git
   ```
2. Buka file `index.html` langsung di browser favorit Anda (Google Chrome, Mozilla Firefox, Microsoft Edge, dll).
3. Tidak memerlukan server lokal atau instalasi Node.js (100% mandiri / self-contained).

### Opsi 2: Menggunakan p5.js Web Editor
1. Kunjungi **[https://editor.p5js.org/](https://editor.p5js.org/)**.
2. Salin seluruh isi file `sketch.js` ke editor p5.js.
3. Klik tombol **Play (▶)** di pojok kiri atas.

### Opsi 3: GitHub Pages
Aktifkan **GitHub Pages** di repositori Anda (*Settings* > *Pages* > pilih branch `main` / root) untuk memainkan simulasi secara online kapan saja melalui tautan:
`https://roihanaldo-commits.github.io/simulasigerakparabola/`

---

## 📁 Struktur Berkas

```
simulasigerakparabola/
├── index.html          # Halaman web pembungkus canvas p5.js
├── sketch.js           # Skrip utama logika fisika, grafis kartun, dan interaksi
├── gerak_parabola.js   # Salinan skrip simulasi mandiri
├── .gitignore          # Konfigurasi pengabaian file Git
└── README.md           # Dokumentasi lengkap proyek
```

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Bebas digunakan untuk keperluan belajar, mengajar, maupun pengembangan materi fisika interaktif.
