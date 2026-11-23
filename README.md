# Simulasi Fisika Interaktif: Gerak Parabola (Projectile Motion)

Simulasi fisika interaktif berbasis web untuk materi **Gerak Parabola (Projectile Motion)** tanpa hambatan udara (kasus ideal), dikembangkan menggunakan pustaka **[p5.js](https://p5js.org/)**. 

Simulasi ini mengusung estetika cerah bertema petualangan kartun khas *Angry Birds*, dilengkapi **mekanika meriam drag maju/mundur 360°**, **benteng kotak kayu stabil dengan ambang batas kerusakan (damage threshold)**, **penanda $X_{\max}$ permanen pada parabola pertama**, **pendaratan pantul & guling tanah**, serta **inspeksi titik lintasan (click-to-inspect)**.

---

## Fitur Utama

### 1. Kontrol Parameter Interaktif (Slider Presisi)
* **Kecepatan Awal ($v_0$):** Mengatur kelajuan lontaran peluru ($10 - 50\text{ m/s}$), dibatasi agar jangkauan tetap proporsional di dalam kanvas.
* **Sudut Peluncur ($\theta$):** Mengatur arah tembakan bebas 360 derajat ($0^\circ - 360^\circ$).
* **Ketinggian Awal ($h_0$):** Mengatur tinggi peluncur dari atas tanah ($0 - 50\text{ meter}$) untuk mensimulasikan tembakan dari atas platform/tebing.
* **Percepatan Gravitasi ($g$):** Mengatur kuat medan gravitasi ($1.0 - 20.0\text{ m/s}^2$).

### 2. Mekanika Peluncur Meriam Kartun (Direct Drag & Aim)
* **Tetap Berbentuk Meriam:** Peluncur berupa meriam kartun dengan roda pedati kayu dan laras baja/perunggu yang dapat berputar $360^\circ$.
* **Tarik Maju atau Mundur:**
  * **Tarik Mundur:** Menyeret ke belakang mengompresi pegas recoil laras, sementara meriam tetap membidik dan menembak ke depan (lawan arah tarikan).
  * **Tarik Maju:** Menyeret ke depan mengarahkan moncong meriam langsung ke arah kursor mouse.
* **Penentuan Laju Awal Otomatis:** Jarak tarikan mouse ($10 - 130\text{ piksel}$) memetakan laju awal proyektil ($v_0$) secara halus antara $10 - 50\text{ m/s}$.
* **Lepas untuk Menembak:** Melepaskan tarikan mouse langsung meluncurkan burung ke udara.
* **Tarik Platform:** Klik dan seret dudukan platform naik atau turun untuk mengubah ketinggian awal ($h_0$) secara instan.

### 3. Benteng Kotak Kayu Stabil & Ambang Kerusakan (Damage Threshold)
* **Stabilitas Struktur:** Kotak-kotak benteng berada dalam status diam stabil (`isAwake: false`) sejak awal simulasi, sehingga tidak runtuh sendiri saat meriam baru ditembakkan.
* **Aktivasi Fisika Saat Tertabrak:** Kotak hanya bergerak dan menerima kerusakan saat terkena benturan proyektil burung.
* **Ambang Kerusakan Realistis:**
  * **Tumbukan Pelan ($< 7.5\text{ m/s}$):** Kotak hanya bergoyang dan bergeser sedikit tanpa hancur (`THUMP!`).
  * **Tumbukan Sedang ($7.5 - 17\text{ m/s}$):** Muncul retakan nyata pada tekstur balok kayu dan kotak terdorong jatuh (`RETAK!`).
  * **Tumbukan Keras ($\ge 17\text{ m/s}$):** Kotak meledak hancur berkeping-keping menjadi serpihan puing kayu (`HANCUR! +50 PTS`).

### 4. Penanda $X_{\max}$ Permanen pada Parabola Pertama
* **Titik Pendaratan Analitis Murni:** Penanda bendera dan lencana nilai $X_{\max}$ tersimpan tetap pada titik pendaratan lintasan parabola pertama hasil kalkulasi analitis awal.
* **Tidak Terpengaruh Pantulan atau Tumbukan:** Posisi penanda $X_{\max}$ tidak bergeser meskipun burung memantul di tanah, menabrak benteng, atau berguling hingga berhenti di titik akhir ($X_{\text{akhir}}$).

### 5. Mode Bersiap Bersih (Preview Tersembunyi)
* Garis putus-putus lintasan analitis dan penanda puncak ($H_{\max}$) serta pendaratan ($X_{\max}$) **disembunyikan pada mode bersiap (IDLE)** agar pengguna dapat memperkirakan tembakan secara mandiri.
* Seluruh penanda dan jejak lintasan otomatis muncul setelah proyektil ditembakkan.

### 6. Fisika Pendaratan Tanah (Pantulan & Berguling Alami)
* Burung **tidak langsung berhenti mendadak** saat menyentuh tanah.
* Mengalami pantulan vertikal elastis ($e = 0.42$), berguling di atas rumput dengan perlambatan gesekan, mengepulkan debu tanah, dan berhenti perlahan pada titik jangkauan akhir.
* Babi dan kotak-kotak yang jatuh juga mengalami pantulan dan gesekan serupa.

### 7. Karakter Babi Dinamis & Tumbukan 2D
* Babi duduk di atas struktur benteng.
* Tumbukan pelan membuatnya kaget dan bergoyang.
* Tumbukan keras memicu hukum kekekalan momentum 2D ($e = 0.65$), melontarkan babi dalam gerak parabola terpisah hingga mendarat dengan efek bintang pusing.

### 8. Inspeksi Titik Lintasan (Click to Inspect)
* Di sepanjang lintasan burung, titik benturan, dan lintasan babi, terdapat titik-titik sampel data.
* **Klik sembarang titik** untuk membuka dialog telemetri analitis:
  * Waktu tempuh saat di titik tersebut ($t$).
  * Koordinat posisi horizontal ($x$) dan vertikal ($y$).
  * Komponen kecepatan horizontal ($v_x$) dan vertikal ($v_y$).
  * Resultan kecepatan ($v$) dan sudut arah vektor gerak ($\theta$).
  * Khusus titik benturan: menampilkan perbandingan momentum sebelum dan sesudah tumbukan.

### 9. Skala Adaptif Otomatis (Auto-Scale)
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
4. **Jarak Jangkauan Terjauh Parabola Pertama ($X_{\max}$):**
   $$X_{\max} = v_x \cdot t_{\text{total}} = (v_0 \cos\theta) \cdot t_{\text{total}}$$
5. **Laju saat Menyentuh Tanah ($v_{\text{land}}$):**
   $$v_{\text{land}} = \sqrt{v_0^2 + 2 g h_0}$$

---

## Struktur Berkas

```
simulasigerakparabola/
├── index.html          # Halaman web pembungkus kanvas p5.js (dukungan offline)
├── sketch.js           # Skrip utama logika fisika, grafis kartun, dan interaksi
├── gerak_parabola.js   # Salinan skrip simulasi mandiri
├── p5.min.js           # Pustaka p5.js lokal untuk pengoperasian luring
├── .gitignore          # Konfigurasi pengabaian file Git
└── README.md           # Dokumentasi lengkap proyek
```

---

## Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Bebas digunakan untuk keperluan belajar, mengajar, maupun pengembangan materi fisika interaktif.
