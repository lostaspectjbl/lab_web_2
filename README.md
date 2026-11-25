# XSS Lab Series — CTF & Security Training Platform

Platform pelatihan keamanan web interaktif bertema Cross-Site Scripting (XSS) yang dirancang khusus untuk kompetisi CTF dan pembelajaran di lingkungan terisolasi.

Terinspirasi dari modul XSS pada PortSwigger Web Security Academy, lab ini menyajikan skenario realistis dengan arsitektur modern, proteksi terhadap kerentanan tidak disengaja (hardened against unintended vulnerabilities), dan mekanisme flag per lab yang aman.

---

## 🚀 Fitur Utama (Tahap 1)
- **Tech Stack**: Node.js 20, Express, EJS, SQLite (`better-sqlite3`).
- **Desain Bersih & Konsisten**: UI modern, responsif, dan mudah dipahami layaknya blog/aplikasi web produksi.
- **Strictly Hardened**:
  - Semua query database menggunakan **parameterized query** (`db.prepare(...).run/all(...)`) untuk mencegah celah SQL Injection.
  - Tidak ada path traversal, RCE, atau SSRF.
  - Header keamanan `X-Content-Type-Options: nosniff` dan penghapusan `X-Powered-By`.
  - Non-root container (`node`), `read_only` root filesystem dengan volume terpisah untuk `/data`.
- **Flag per Lab**: Flag diambil dari environment variable (`FLAG_LAB01`, `FLAG_LAB02`, dst.) dan tidak di-hardcode di dalam image maupun codebase.

---

## 📂 Struktur Project

```text
.
├── .dockerignore
├── .env.example              # Template environment variable & flags
├── docker-compose.yml        # Konfigurasi container service
├── Dockerfile                # Docker build (Node 20 Alpine, unprivileged)
├── package.json
├── README.md
├── internal/
│   └── notes.md              # Catatan edukasi internal, analisis source/sink, & mitigasi
├── public/
│   ├── css/
│   │   └── style.css         # Styling modern, bersih & responsif
│   └── js/
│       └── vendor/
│           └── jquery-1.8.3.min.js # Pustaka jQuery lokal untuk lab DOM
└── src/
    ├── config.js             # Loader konfigurasi & flags
    ├── db.js                 # Setup SQLite, skema, seed & reset data
    ├── server.js             # Entry point Express server
    ├── routes/
    │   ├── index.js          # Route dashboard
    │   ├── lab01.js          # Route Lab 01 (Reflected XSS)
    │   ├── lab02.js          # Route Lab 02 (Stored XSS)
    │   ├── lab03.js          # Route Lab 03 (DOM XSS document.write)
    │   ├── lab04.js          # Route Lab 04 (DOM XSS innerHTML)
    │   └── lab05.js          # Route Lab 05 (DOM XSS jQuery href)
    └── views/
        ├── index.ejs         # Halaman utama daftar lab
        ├── lab01.ejs         # Tampilan Lab 01
        ├── lab02.ejs         # Tampilan Lab 02
        ├── lab03.ejs         # Tampilan Lab 03
        ├── lab04.ejs         # Tampilan Lab 04
        ├── lab05.ejs         # Tampilan Lab 05
        └── partials/
            ├── header.ejs    # Header & navigasi
            └── footer.ejs    # Footer
```

---

## 🧪 Rincian Lab Tantangan

### 1. Lab 01: Reflected XSS into HTML context with nothing encoded
- **URL**: `http://localhost:3000/lab01`
- **Parameter**: `search` (contoh: `/lab01?search=test`)
- **Mekanisme**:
  Input dari parameter query `search` dipantulkan langsung ke dalam dokumen HTML hasil pencarian (`<h3>Results for: <%- search %></h3>`) tanpa dilakukan HTML entity encoding.
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB01`.

### 2. Lab 02: Stored XSS into HTML context with nothing encoded
- **URL**: `http://localhost:3000/lab02`
- **Fitur**: Form komentar artikel blog.
- **Mekanisme**:
  Pengunjung dapat mengirim komentar via form `POST /lab02/comment`. Komentar disimpan secara aman ke SQLite menggunakan parameterized query, namun konten komentar dirender langsung ke browser pengunjung lain menggunakan `<%- comment.content %>` tanpa encoding.
- **Reset**: Tersedia tombol "Reset Comments" (`POST /lab02/reset`) untuk mengembalikan komentar ke kondisi awal saat kompetisi berlangsung.
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB02`.

### 3. Lab 03: DOM XSS in document.write sink using source location.search
- **URL**: `http://localhost:3000/lab03`
- **Parameter**: `search` (contoh: `/lab03?search=test`)
- **Mekanisme**:
  Fungsi pelacak analitik sisi klien membaca parameter query `search` dari `location.search` dan menyusun tag gambar menggunakan `document.write('<img src="/images/tracker.gif?searchTerms=' + query + '">')` tanpa sanitasi, memungkinkan injeksi tag baru dengan memutus atribut `src` menggunakan `">`.
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB03`.

### 4. Lab 04: DOM XSS in innerHTML sink using source location.search
- **URL**: `http://localhost:3000/lab04`
- **Parameter**: `search` (contoh: `/lab04?search=test`)
- **Mekanisme**:
  Skrip pencarian sisi klien membaca parameter query dari `location.search` dan memperbarui pesan hasil pencarian menggunakan properti `innerHTML`. Meskipun tag `<script>` tidak dieksekusi oleh parser `innerHTML` di browser modern, elemen dengan event handler (seperti `<img src=x onerror=...>`) tetap dieksekusi.
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB04`.

### 5. Lab 05: DOM XSS in jQuery anchor href attribute sink using location.search
- **URL**: `http://localhost:3000/lab05`
- **Parameter**: `returnPath` (contoh: `/lab05?returnPath=/`)
- **Mekanisme**:
  Halaman formulir feedback menggunakan jQuery lokal (`1.8.3`) untuk mengatur atribut `href` pada tombol "Back" (`$('#backLink').attr('href', returnPath)`). Karena skema URL tidak divalidasi, penyerang dapat menyuntikkan skema `javascript:`.
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB05`.

### 6. Lab 06: DOM XSS in jQuery selector sink using a hashchange event
- **URL**: `http://localhost:3000/lab06`
- **Mekanisme**:
  Postingan blog mendengarkan event `hashchange` dan menyalurkan nilai `location.hash` ke selector jQuery (`$('section.blog-list h2:contains(' + query + ')')`). Di jQuery 1.8.x, string dengan tag HTML (seperti `<img src=x onerror=...>`) menyebabkan parser mengevaluasi elemen DOM baru.
- **Pemicu**: Gunakan [Challenge Helper Page](#challenge-helper-page) untuk mengirim dokumen HTML pemicu via iframe lintas-origin.
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB06`.

### 7. Lab 07: Reflected XSS into attribute with angle brackets HTML-encoded
- **URL**: `http://localhost:3000/lab07`
- **Parameter**: `search` (contoh: `/lab07?search=test`)
- **Mekanisme**:
  Kata pencarian dipantulkan ke atribut `value="..."` pada tag `<input>`. Karakter `<` dan `>` di-encode oleh server, namun tanda kutip (`"` dan `'`) tidak di-encode sehingga penyerang dapat keluar dari atribut menggunakan event listener (contoh: `" onfocus="alert(1)" autofocus="`).
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB07`.

### 8. Lab 08: Stored XSS into anchor href attribute with double quotes HTML-encoded
- **URL**: `http://localhost:3000/lab08`
- **Fitur**: Form komentar blog dengan kolom Website.
- **Mekanisme**:
  Komentar pembaca disimpan ke SQLite dengan parameterized query. Kolom "Website" digunakan sebagai atribut `href` nama komentator. Server meng-encode tanda kutip ganda (`"`), namun tidak memvalidasi skema URL sehingga skema `javascript:` dapat dieksekusi saat tautan diklik.
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB08`.

### 9. Lab 09: Reflected XSS into a JavaScript string with angle brackets HTML encoded
- **URL**: `http://localhost:3000/lab09`
- **Parameter**: `search` (contoh: `/lab09?search=test`)
- **Mekanisme**:
  Kata pencarian dipantulkan ke dalam variabel JavaScript inline `var searchTerms = '...';`. Karakter kurung siku `<` dan `>` di-encode, namun tanda kutip tunggal (`'`) dan backslash (`\`) tidak di-escape, memungkinkan *string literal breakout* (contoh: `';alert(1);//`).
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB09`.

### 10. Lab 10: DOM XSS in document.write sink using location.search inside a select element
- **URL**: `http://localhost:3000/lab10`
- **Parameter**: `storeId` (contoh: `/lab10?storeId=London`)
- **Mekanisme**:
  Halaman produk memiliki dropdown `<select>`. Skrip sisi klien membaca parameter query `storeId` dan menulis opsi toko langsung menggunakan `document.write` di dalam tag `<select>`. Penyerang dapat menutup tag `</select>` dan menyuntikkan elemen HTML baru (contoh: `storeId=London"></select><img src=x onerror=alert(1)>`).
- **Flag Cookie**: Cookie `flag` diset dengan nilai `$FLAG_LAB10`.

---

## 🛠️ Challenge Helper Page (Exploit Server)
- **URL**: `http://localhost:3001/helper` (atau via lab utama `http://localhost:3000/helper`)
- **Origin**: `http://localhost:3001` (Origin terpisah dari lab utama `http://localhost:3000`).
- **Fitur**:
  - Menyimpan satu dokumen HTML exploit per tim (`team_id`) dengan batas ukuran maksimum **10 KB**.
  - Menyajikan dokumen mentah pada URL tetap `http://localhost:3001/helper/<team_id>` dengan header `Content-Type: text/html`.

---

## 🔄 Endpoint Reset Data Internal
- **Endpoint**: `POST /reset` (atau via tombol reset pada halaman komentar Lab 02 & Lab 08).
- **Fungsi**: Mengosongkan data komentar yang dikirim peserta dan mengembalikan database SQLite ke kondisi seed bersih. Dapat dipanggil via cron job berkala.

---

## ⚙️ Cara Menjalankan

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)

1. Buat file `.env` dari template:
   ```bash
   cp .env.example .env
   ```
   *(Sesuaikan isi flag jika diperlukan).*

2. Build dan jalankan container:
   ```bash
   docker compose up -d --build
   ```

3. Buka browser:
   - Dashboard: [http://localhost:3000](http://localhost:3000)
   - Lab 01: [http://localhost:3000/lab01](http://localhost:3000/lab01)
   - Lab 02: [http://localhost:3000/lab02](http://localhost:3000/lab02)

4. Menghentikan container:
   ```bash
   docker compose down
   ```

---

### Opsi 2: Menjalankan Secara Lokal (Node.js)

1. Pastikan Node.js 20+ sudah terinstal.
2. Salin environment file:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Jalankan aplikasi:
   ```bash
   npm start
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

---

## 🔒 Catatan Keamanan Lingkungan CTF
- Platform ini **hanya boleh dijalankan di jaringan privat atau lingkungan terisolasi** untuk tujuan edukasi keamanan dan kompetisi CTF.
- File system container dikunci (`read_only: true`), hanya direktori data SQLite (`/data`) dan `/tmp` yang diizinkan untuk penulisan data.
