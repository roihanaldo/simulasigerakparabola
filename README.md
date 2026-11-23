# Simulasi Fisika Interaktif: Gerak Parabola (Projectile Motion)

Simulasi fisika interaktif berbasis web untuk materi **Gerak Parabola (Projectile Motion)** tanpa hambatan udara (kasus ideal), dikembangkan menggunakan pustaka **[p5.js](https://p5js.org/)**. 

Simulasi ini mengusung estetika cerah bertema petualangan kartun khas *Angry Birds*, dilengkapi **mekanika ketapel drag 360°**, **ambang batas kerusakan kotak benteng (damage threshold)**, **pendaratan pantul & guling tanah**, serta **inspeksi titik lintasan (click-to-inspect)**.

---

## Fitur Utama

### 1. Kontrol Parameter Interaktif (Slider Presisi)
* **Kecepatan Awal ($v_0$):** Mengatur kelajuan lontaran peluru ($10 - 100\text{ m/s}$).
* **Sudut Peluncur ($\theta$):** Mengatur arah tembakan bebas 360 derajat ($0^\circ - 360^\circ$).
* **Ketinggian Awal ($h_0$):** Mengatur tinggi peluncur dari atas tanah ($0 - 50\text{ meter}$) untuk mensimulasikan tembakan dari atas platform/tebing.
* **Percepatan Gravitasi ($g$):** Mengatur kuat medan gravitasi ($1.0 - 20.0\text{ m/s}^2$).

### 2. Mekanika Ketapel Angry Birds (Direct Drag & Release)
* **Tarik Mundur Ketapel:** Klik dan seret burung pada ketapel ke arah berlawanan untuk menentukan sudut tembakan (hingga 360°) dan laju awal ($v_0$) secara intuitif berdasarkan jarak tarikan.
* **Indikator Pita Karet & Pengukur Daya:** Dilengkapi visualisasi dua pita elastis yang meregang serta pengukur daya real-time saat membidik.
* **Lepas untuk Menembak:** Melepaskan tarikan mouse langsung meluncurkan burung ke udara.
* **Tarik Platform:** Klik dan seret dudukan platform naik atau turun untuk mengubah ketinggian awal ($h_0$) secara instan.

### 3. Benteng Kotak Kayu & Ambang Kerusakan (Destructible Boxes & Damage Threshold)
* Sasaran dilindungi oleh benteng balok kotak kayu bertingkat yang dapat ditabrak dan diruntuhkan.
* **Ambang Kerusakan Realistis:**
  * **Tumbukan Pelan ($< 7.5\text{ m/s}$):** Kotak hanya bergoyang dan bergeser sedikit tanpa hancur (`THUMP!`).
  * **Tumbukan Sedang ($7.5 - 17\text{ m/s}$):** Muncul retakan nyata pada tekstur balok kayu dan kotak terdorong jatuh (`RETAK!`).
  * **Tumbukan Keras ($\ge 17\text{ m/s}$):** Kotak meledak hancur berkeping-keping menjadi serpihan puing kayu (`HANCUR! +50 PTS`).

### 4. Fisika Pendaratan Tanah (Pantulan & Berguling Alami)
* Burung **tidak langsung berhenti mendadak** saat menyentuh tanah.
* Mengalami pantulan vertikal elastis ($e = 0.42$), berguling di atas rumput dengan perlambatan gesekan, mengepulkan debu tanah, dan berhenti perlahan pada titik jangkauan akhir $X_{\max}$.
* Babi dan kotak-kotak yang jatuh juga mengalami pantulan dan gesekan serupa.

### 5. Mode Bersiap Bersih (Preview Tersembunyi)
* Garis putus-putus lintasan analitis dan penanda puncak ($H_{\max}$) serta pendaratan ($X_{\max}$) **disembunyikan pada mode bersiap (IDLE)** agar pengguna dapat memperkirakan tembakan sendiri.
* Seluruh penanda dan jejak lintasan otomatis muncul setelah burung ditembakkan.

### 6. Karakter Babi Dinamis & Tumbukan 2D
* Babi duduk di atas struktur benteng.
* Tumbukan pelan membuatnya kaget dan bergoyang.
* Tumbukan keras memicu hukum kekekalan momentum 2D ($e = 0.65$), melontarkan babi dalam gerak parabola terpisah hingga mendarat dengan efek bintang pusing.

### 7. Inspeksi Titik Lintasan (Click to Inspect)
* Di sepanjang lintasan burung, titik benturan, dan lintasan babi, terdapat titik-titik sampel data.
* **Klik sembarang titik** untuk membuka dialog telemetri analitis:
  * Waktu tempuh saat di titik tersebut ($t$).
  * Koordinat posisi horizontal ($x$) dan vertikal ($y$).
  * Komponen kecepatan horizontal ($v_x$) dan vertikal ($v_y$).
  * Resultan kecepatan ($v$) dan sudut arah vektor gerak ($\theta$).
  * Khusus titik benturan: menampilkan perbandingan momentum sebelum dan sesudah tumbukan.

### 8. Skala Adaptif Otomatis (Auto-Scale)
* Skala tampilan kanvas menyesuaikan secara proporsional otomatis sehingga seluruh dinamika gerak parabola burung, puing kayu, dan babi tetap muat di dalam layar.

---

## Teori dan Rumus Fisika

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
4. **Jarak Jangkauan Terjauh ($X_{\max}$):**
   $$X_{\max} = v_x \cdot t_{\text{total}} = (v_0 \cos\theta) \cdot t_{\text{total}}$$
5. **Laju saat Menyentuh Tanah ($v_{\text{land}}$):**
   $$v_{\text{land}} = \sqrt{v_0^2 + 2 g h_0}$$

---

## Struktur Berkas

```
simulasigerakparabola/
├── index.html          # Halaman web pembungkus canvas p5.js
├── sketch.js           # Skrip utama logika fisika, grafis kartun, dan interaksi
├── gerak_parabola.js   # Salinan skrip simulasi mandiri
├── .gitignore          # Konfigurasi pengabaian file Git
└── README.md           # Dokumentasi lengkap proyek
```

---

## Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Bebas digunakan untuk keperluan belajar, mengajar, maupun pengembangan materi fisika interaktif.
