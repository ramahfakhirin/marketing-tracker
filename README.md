# Marketing & CRM Tracker Nanoidn

Sistem Pemantauan Progress & Database Marketing Nanoidn adalah aplikasi web berbasis **Progressive Web App (PWA)** yang dirancang khusus untuk memantau, mengelola, dan menganalisis progress aktivitas marketing, CRM (*Customer Relationship Management*), serta database sekolah target secara real-time.

Aplikasi ini memfasilitasi kolaborasi erat antara jajaran manajemen (**Super Admin** dan **Manager**) dengan tim di lapangan (**Account Executive** dan **Marketing Lapangan**).

---

## 🚀 Fitur Utama

### 1. Dashboard Analytics & Monitoring
*   **Ringkasan Indikator Utama**: Grafik visual jumlah target, prospek yang sedang dijajaki, serta tingkat closing success secara instan.
*   **Kontribusi Account Executive (AE)**: Visualisasi kontribusi performa masing-masing AE menggunakan bagan interaktif (*Recharts*).
*   **Analisis Kualitas Peluang (Closing Probability)**: Distribusi probabilitas keberhasilan untuk mengukur kualitas pipeline marketing.

### 2. Manajemen Database Sekolah & Pipeline CRM
*   **Dual-View Mode**: Mode tampilan fleksibel antara **Prospects** (sekolah prospek yang sedang ditargetkan) dan **Surveyed** (sekolah yang telah disurvei).
*   **Sistem Filter Canggih**: Penyaringan data berdasarkan Provinsi, Kota, Jenjang Pendidikan, Status Follow-up, PIC Marketing, hingga Probabilitas Closing.
*   **Pencarian Multi-parameter**: Kotak pencarian responsif untuk mencari berdasarkan nama sekolah, narahubung, catatan, akun sosial media, maupun nama PIC.

### 3. Detail Profil Sekolah & Integrasi Kontak Cepat
*   **Instagram & TikTok Integration**: Tautan langsung untuk meninjau profil media sosial sekolah guna analisis potensi.
*   **WhatsApp Quick Connect**: Fitur sekali klik untuk langsung menghubungi narahubung sekolah via WhatsApp tanpa perlu menyimpan nomor terlebih dahulu.
*   **Catatan Progress Historis**: Menambahkan updates atau catatan aktivitas kunjungan/follow-up secara kronologis.

### 4. Manajemen Tim (Team Management)
*   **Pembagian Peran & Target**: Menetapkan dan memantau target individu serta pencapaian dari masing-masing anggota tim marketing.
*   **Analisis Kinerja**: Distribusi tugas serta histori log performa dari masing-masing personal.

### 5. CSV Import & Export
*   **Ekspor Data**: Mengunduh database sekolah aktif atau hasil survei ke dalam format file `.csv` kapan pun dibutuhkan.
*   **Impor Data Massal**: Mengunggah ratusan database sekolah baru sekaligus melalui fitur import CSV dengan pencocokan kolom otomatis yang intuitif.

---

## 🔐 Hak Akses & Peran Pengguna (Role-based Access)

Aplikasi menerapkan kontrol akses ketat berdasarkan peran masing-masing pengguna:

1.  **Super Admin**
    *   Akses penuh ke seluruh sistem, termasuk pengaturan database, dashboard, dan manajemen tim.
    *   Dapat menghapus, mengedit, mengimpor, dan mengekspor seluruh data sekolah.
2.  **Manager**
    *   Dapat meninjau dashboard, progress seluruh AE, serta mengelola penugasan tim.
    *   Memiliki wewenang untuk menyetujui perubahan status prospek penting.
3.  **Account Executive (AE)**
    *   Dapat memperbarui data prospek sekolah yang ditugaskan kepadanya.
    *   Dapat menambahkan catatan harian, memperbarui probabilitas, serta status closing.
4.  **Marketing Lapangan**
    *   Fokus pada entri data survei baru dari lapangan secara cepat dan efisien.

---

## 🛠️ Detail Teknis & Arsitektur

*   **Frontend**: React (v18+) menggunakan **TypeScript** untuk keamanan tipe data (*type safety*).
*   **Build Tool**: **Vite** untuk kompilasi yang cepat dan performa optimal.
*   **Styling**: **Tailwind CSS** untuk desain antarmuka modern yang responsif (desktop & mobile-friendly).
*   **Animasi**: **Framer Motion / Motion** untuk transisi interaktif yang halus dan profesional.
*   **Ikon**: **Lucide React** sebagai pustaka ikon vektor yang konsisten.
*   **Grafik**: **Recharts** untuk visualisasi metrik performa real-time pada dashboard.

---

## 📦 Cara Memulai Pengembangan Lokal

### Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi 16 atau lebih baru) di perangkat Anda.

### Langkah-Langkah Instalasi
1.  **Klon Repositori**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Instalasi Dependensi**:
    ```bash
    npm install
    ```

3.  **Menjalankan Mode Pengembangan**:
    ```bash
    npm run dev
    ```
    Aplikasi akan berjalan secara lokal di `http://localhost:3000`.

4.  **Melakukan Build Produksi**:
    ```bash
    npm run build
    ```
    Output build produksi akan disimpan di dalam folder `dist/` untuk siap dideploy.

5.  **Menjalankan Linter**:
    ```bash
    npm run lint
    ```

---

## 📱 Kemampuan PWA (Progressive Web App)
Aplikasi ini mendukung instalasi langsung ke layar beranda ponsel atau komputer Anda sebagai aplikasi mandiri (*standalone PWA*) dengan performa yang dioptimalkan untuk akses seluler.
