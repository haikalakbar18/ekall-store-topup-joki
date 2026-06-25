const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Biar bisa buka index.html lewat server

// 1. Konfigurasi Koneksi ke MySQL XAMPP
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // User bawaan XAMPP otomatis 'root'
    password: '',      // Password bawaan XAMPP otomatis kosong
    database: 'ekall_store'
});

// Cek apakah koneksi database berhasil
db.connect((err) => {
    if (err) {
        console.error('Gagal konek ke MySQL:', err.message);
        return;
    }
    console.log('Hubungan Sukses! Server terkoneksi ke MySQL.');
});

// 2. API POST: Menerima Orderan dari index.html dan Simpan ke MySQL
app.post('/api/order', (req, res) => {
    const { player_id, paket_joki } = req.body;

    // Proteksi dasar agar data tidak kosong
    if (!player_id || !paket_joki) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap!' });
    }

    // Perintah SQL untuk memasukkan data (Menggantikan fs.writeFile db.json)
    const sql = 'INSERT INTO orders (player_id, paket_joki) VALUES (?, ?)';
    
    db.query(sql, [player_id, paket_joki], (err, result) => {
        if (err) {
            console.error('Gagal menyimpan data:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal menyimpan ke database' });
        }
        
        console.log(`Orderan baru masuk ke MySQL! ID: ${result.insertId}`);
        res.json({ success: true, message: 'Orderan berhasil diproses oleh MySQL!' });
    });
});

// 3. API GET: Mengambil Semua Data Orderan untuk admin.html
// ==========================================
// TAHAP 1: API GET - Mengambil Semua Data Orderan
// ==========================================
app.get('/api/orders', (req, res) => {
    // Mengambil semua data dari tabel 'orders' diurutkan dari yang terbaru (id terbesar)
    const sql = 'SELECT * FROM orders ORDER BY id DESC';
    
    // GANTI BAGIAN RESPONS QUERY KAMU JADI SEPERTI INI:
db.query(sql, (err, results) => {
    if (err) {
        console.error('Gagal mengambil data:', err.message);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data' });
    }
    
    // Bungkus hasilnya dengan properti success dan data
    res.json({ success: true, data: results });
});
});
// 1. Panggil library bcrypt di bagian paling atas file server.js (di bawah require('cors'))
const bcrypt = require('bcrypt');

// ... (kodingan middleware dan rute lainnya tetap sama) ...

// 2. Cari rute login kamu dan ubah total isinya menjadi seperti ini:
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 1. Cari user berdasarkan username
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        // 2. Cek apakah usernya ketemu
        if (results.length > 0) {
            const user = results[0];

            // 3. COCOKKAN PASSWORD (Bagian ini yang paling krusial, Kall!)
            // user.password di bawah ini akan mengambil data hash yang ada di MySQL kamu
            const passwordCocok = await bcrypt.compare(password, user.password);

            if (passwordCocok) {
                res.json({ success: true, message: 'Login Sukses, welcome Kall!' });
            } else {
                res.status(401).json({ success: false, message: 'Password salah, Kall!' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Username tidak terdaftar!' });
        }
    });
});
// ==========================================
// TAHAP 3: API PUT - Mengubah Status Orderan
// ==========================================
app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Mengambil status baru (Diproses/Selesai) dari frontend

    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    
    db.query(sql, [status, id], (err, results) => {
        if (err) {
            console.error('Gagal mengupdate status:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal mengupdate status' });
        }
        res.json({ success: true, message: 'Status orderan berhasil diperbarui!' });
    });
});

// ==========================================
// TAHAP 4: API DELETE - Menghapus Orderan
// ==========================================
app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params; // Mengambil ID orderan yang mau dihapus

    const sql = 'DELETE FROM orders WHERE id = ?';
    
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Gagal menghapus orderan:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal menghapus orderan' });
        }
        res.json({ success: true, message: 'Orderan berhasil dihapus dari database!' });
    });
});
// ==========================================
// TAHAP 5: API GET - Cari Status Berdasarkan ID (Buat Pembeli)
// ==========================================
app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;

    // Cari orderan berdasarkan ID yang dimasukkan pembeli
    const sql = 'SELECT * FROM orders WHERE id = ?';
    
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Gagal mencari orderan:', err.message);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
        }

        // Jika orderan ditemukan
        if (results.length > 0) {
            res.json({ success: true, data: results[0] });
        } else {
            // Jika ID tidak ada di database
            res.status(404).json({ success: false, message: 'ID Orderan tidak ditemukan, Kall! Coba cek lagi.' });
        }
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    console.log("--> Ada yang coba login dengan username:", username);
    console.log("--> Password yang diketik di web:", password);

    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error("Eror database:", err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        // Cek apakah usernya ketemu di database
        if (results.length > 0) {
            const user = results[0];
            
            console.log("--> User ketemu di database!");
            console.log("--> Password terenkripsi di database kamu:", user.password);

            try {
                // Proses pencocokan Bcrypt
                const passwordCocok = await bcrypt.compare(password, user.password);
                console.log("--> Apakah password cocok menurut Bcrypt?:", passwordCocok);

                if (passwordCocok) {
                    return res.json({ success: true, message: 'Login Sukses, welcome Kall!' });
                } else {
                    return res.status(401).json({ success: false, message: 'Password salah, Kall! Menurut Bcrypt tidak cocok.' });
                }
            } catch (bcryptError) {
                console.error("Eror internal Bcrypt:", bcryptError);
                return res.status(500).json({ success: false, message: 'Bcrypt gagal memproses password' });
            }

        } else {
            console.log("--> Username tidak ketemu di database!");
            return res.status(401).json({ success: false, message: 'Username tidak terdaftar!' });
        }
    });
});

// ... (kodingan rute lain di atasnya) ...

// RUTE LOGIN KAMU YANG ADA LOG-NYA (TETAP DIAMANKAN/JANGAN DIHAPUS)
app.post('/api/login', (req, res) => {
    // ... isi rute login ...
});

// KODINGAN BARU INI KAMU PASTE DI BAWAHNYA SINI, KALL 👇
// app.get('/buat-hash-otomatis', async (req, res) => {
//     try {
//         const hashBaru = await bcrypt.hash('ekall123', 10);
//         db.query('UPDATE users SET password = ? WHERE username = "admin"', [hashBaru], (err) => {
//             if (err) return res.send("Gagal update database: " + err.message);
//             res.send(`
//                 <h2>🔥 BERHASIL, KALL! 🔥</h2>
//                 <p>Bcrypt di laptopmu udah bikin kode acak yang sah!</p>
//                 <p>Sekarang balik ke <b>login.html</b> terus masuk pake <b>ekall123</b></p>
//             `);
//         });
//     } catch (e) {
//         res.send("Eror: " + e.message);
//     }
// });

// Baru setelah itu ditutup dengan perintah listen port kamu
app.listen(PORT, () => {
    console.log(`Server siap meluncur di port ${PORT}! 🚀`);
});

// Jalankan Server Port 3000
app.listen(PORT, () => {
    console.log(`Server siap meluncur di port ${PORT}! 🚀`);
});

