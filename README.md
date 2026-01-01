Aplikasi web manajemen toko sederhana (Point of Sales) yang terintegrasi dengan **AI Chatbot (Google Gemini)**. Chatbot ini mampu menjawab pertanyaan pelanggan mengenai stok, harga, dan rekomendasi produk secara *real-time* menggunakan data dari database toko.

## 🚀 Fitur Utama

* **Katalog Produk:** Menampilkan daftar barang, harga, dan sisa stok.
* **Sistem Kasir (POS):** Input pembelian banyak barang sekaligus (multi-item checkout).
* **Manajemen Transaksi:** Riwayat pembelian dan fitur *Cancel Order* (stok otomatis kembali).
* **AI Smart Chatbot:**
    * Terintegrasi dengan Google Gemini AI.
    * Mengetahui stok & harga secara *real-time*.
    * Bisa merekomendasikan barang berdasarkan budget (misal: "Laptop di bawah 5 juta").
    * Bisa memberi saran ukuran sepatu.

## 🛠️ Teknologi

* **Backend:** Node.js, Express.js
* **Database:** SQLite3 (Tanpa perlu install software database tambahan)
* **Frontend:** EJS (Templating Engine), Bootstrap 5
* **AI:** Google Generative AI SDK (`@google/generative-ai`)

---

## 📦 Cara Install & Menjalankan

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di komputermu.

### 1. Clone atau Download Project
Pastikan kamu sudah berada di dalam folder proyek melalui terminal/CMD.

### 2. Install Dependencies
Jalankan perintah berikut untuk mengunduh semua library yang dibutuhkan (`express`, `sqlite3`, `dotenv`, dll):

`npm install` 

### 3. Dapatkan Google Gemini API Key
Chatbot membutuhkan "kunci" agar bisa berkomunikasi dengan server Google.

Buka Google AI Studio.

Login dengan akun Google kamu.

Klik "Get API Key" atau "Create API Key".

Salin (Copy) kode kunci tersebut.

### 4. Konfigurasi Environment (.env)
Agar API Key aman dan tidak terekspos, kita menyimpannya di file environment.

Buat file baru di dalam folder utama proyek bernama .env (tanpa nama depan, hanya titik lalu env).

Buka file tersebut dan isi dengan format berikut:

Cuplikan kode

API_KEY=Paste_Kode_Kunci_Google_Kamu_Disini
(Catatan: Jangan gunakan tanda kutip, langsung tempel saja kodenya)

### 5. Jalankan Server
Setelah konfigurasi selesai, jalankan server dengan perintah:

Bash

node server.js
Jika berhasil, akan muncul pesan di terminal:

App berjalan di https://www.google.com/search?q=http://localhost:3000 Seeding Database... (Muncul hanya saat pertama kali dijalankan)

### 6. Buka di Browser
Buka browser favoritmu (Chrome, Edge, Firefox) dan akses alamat:

http://localhost:3000
