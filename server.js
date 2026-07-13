const express = require('express');
const midtransClient = require('midtrans-client');
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: 'Mid-server-w_uyQH1TW1_4vnngfXdZ9qsy',
    clientKey: 'Mid-client-LmqgjE4mmbQH9oQW'
});
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});
const PORT = 3000;
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'haikalakbarwijaya18@gmail.com',
        pass: 'fchljzffisminlbp'
    }
});
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ekall_store'
});
db.connect((err) => {
    if (err) {
        console.error('Gagal konek ke MySQL:', err.message);
        return;
    }
    console.log('Hubungan Sukses! Server terkoneksi ke MySQL.');
});
const orderSchema = Joi.object({
    player_id: Joi.number().integer().min(1).max(9999999999).required().messages({
        'number.base': 'User ID harus berupa angka doang, Kall! Gak boleh ada huruf!',
        'number.empty': 'User ID gak boleh kosong!',
        'any.required': 'User ID wajib diisi!'
    }),
    
    zone_id: Joi.number().integer().min(1).max(999999).required().messages({
        'number.base': 'Zone ID harus berupa angka doang, Kall! Gak boleh ada huruf!',
        'number.empty': 'Zone ID gak boleh kosong!',
        'any.required': 'Zone ID wajib diisi!'
    }),
    paket_joki: Joi.string().required().messages({
        'string.empty': 'Paket layanan joki / top-up belum dipilih!',
        'any.required': 'Paket layanan joki / top-up wajib diisi!'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Format emailnya salah, Kall!',
        'string.empty': 'Email gak boleh kosong, Kall!',
        'any.required': 'Email wajib diisi untuk kirim bukti transaksi!'
    }),
    no_wa: Joi.string().min(9).max(15).required().messages({
        'string.min': 'Nomor WA minimal 9 digit!',
        'string.max': 'Nomor WA maksimal 15 digit!',
        'string.empty': 'Nomor WA gak boleh kosong, Kall!',
        'any.required': 'Nomor WA wajib diisi buat dihubungi!'
    })
});
const verifikasiJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Akses ditolak! Kamu belum login, Kall!' });
    }
    jwt.verify(token, 'KUNCI_RAHASIA_EKALL', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token ilegal atau expired, silahkan login lagi!' });
        }
        req.user = user;
        next();
    });
};
app.get('/api/orders', verifikasiJWT, (req, res) => {
    const sql = `
        SELECT o.*, u.username AS nama_admin 
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: results });
    });
});
const bcrypt = require('bcrypt');
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        if (results.length > 0) {
            const user = results[0];
            const passwordCocok = await bcrypt.compare(password, user.password);
            if (passwordCocok) {
                const token = jwt.sign(
                    { id: user.id, username: user.username }, 
                    'KUNCI_RAHASIA_EKALL', 
                    { expiresIn: '1h' }
                );
                res.json({ 
                    success: true, 
                    message: 'Login Sukses, welcome Kall!', 
                    token: token
                });
            } else {
                res.status(401).json({ success: false, message: 'Password salah, Kall!' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Username tidak terdaftar!' });
        }
    });
});
app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { status, email } = req.body;
    const sqlUpdate = 'UPDATE orders SET status = ? WHERE id = ?';
    
    db.query(sqlUpdate, [status, id], (err, results) => {
        if (err) {
            console.error('Gagal mengupdate status:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal mengupdate status' });
        }
        if (status === 'Selesai') {
            const sqlCheck = "SELECT paket_joki FROM orders WHERE id = ?";
            db.query(sqlCheck, [id], (errCheck, rows) => {
                if (!errCheck && rows.length > 0) {
                    const namaPaket = rows[0].paket_joki.toLowerCase();
                    if (namaPaket.includes('diamond') || namaPaket.includes('wdp')) {
                        if (email) {
                            const mailOptions = {
                                from: '"Ekall Store Official" <haikalakbarwijaya18@gmail.com>',
                                to: email,
                                subject: `Ekall Store - Top Up Sukses! 💎 (Invoice: #${id})`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px; background-color: #f9f9f9;">
                                        <h2 style="color: #28a745; text-align: center;">DIAMOND LU UDAH MASUK, SOB! 🎉</h2>
                                        <p>Halo Gamers,</p>
                                        <p>Pesanan top-up kamu dengan <b>No. Invoice #${id}</b> di <b>Ekall Store</b> sudah selesai diproses 100% oleh sistem kami!</p>
                                        <hr style="border: none; border-top: 1px solid #eee;">
                                        <p>Silakan login dan cek akun game kamu sekarang juga ya. Diamond-nya sudah berhasil di-inject ke dalam akun kamu.</p>
                                        <p>Terima kasih banyak sudah mempercayakan top up kamu di Ekall Store. Ditunggu orderan selanjutnya! 🔥</p>
                                        <hr style="border: none; border-top: 1px solid #eee;">
                                        <p style="font-size: 12px; color: #666; text-align: center;">Laporan ini dikirim otomatis oleh sistem backend Ekall Store.</p>
                                    </div>
                                `
                            };
                            transporter.sendMail(mailOptions, (errMail, info) => {
                                if (errMail) {
                                    console.error("[BACKEND] Aduh, gagal ngirim email diamond sukses:", errMail);
                                } else {
                                    console.log("[BACKEND] BOOM! Email notifikasi diamond sukses berhasil terbang ke: " + email);
                                }
                            });
                        } else {
                            console.log("[BACKEND] Status berubah jadi Selesai (Diamond), tapi email pembeli kosong dari frontend!");
                        }
                    } else {
                        console.log(`[BACKEND] Orderan Joki #${id} Selesai! Email diskip sesuai request biar akrab via WA manual.`);
                    }
                }
            });
        }
        res.json({ success: true, message: 'Status orderan berhasil diperbarui!' });
    });
});
app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM orders WHERE id = ?';
    
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Gagal menghapus orderan:', err.message);
            return res.status(500).json({ success: false, message: 'Gagal menghapus orderan' });
        }
        res.json({ success: true, message: 'Orderan berhasil dihapus dari database!' });
    });
});
app.get('/api/orders/:id', (req, res) => {
    const orderId = req.params.id.replace(/\D/g, ''); 
    if (!orderId) {
        return res.status(400).json({ success: false, message: 'ID tidak valid!' });
    }
    const sql = "SELECT id, player_id, zone_id, paket_joki, status FROM orders WHERE id = ?";
    
    db.query(sql, [orderId], (err, results) => {
        if (err) {
            console.error('Gagal mencari orderan:', err.message);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
        }
        if (results.length > 0) {
            const order = results[0];
            res.json({ 
                success: true, 
                data: {
                    id: order.id,
                    player_id: order.player_id,
                    zone_id: order.zone_id,
                    paket_joki: order.paket_joki,
                    status: order.status
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'ID Orderan #' + orderId + ' tidak ditemukan, Kall!' });
        }
    });
});
app.post('/api/order-joki', async (req, res) => {
    try {
        const { idUser, zona, paketJoki, totalHarga, email, whatsapp } = req.body; 
        const sql = 'INSERT INTO orders (player_id, zone_id, paket_joki, status, email, no_wa) VALUES (?, ?, ?, ?, ?, ?)';
        
        db.query(sql, [idUser, zona, paketJoki, 'Pending', email, whatsapp], async (err, result) => {
            if (err) {
                console.error('Gagal menyimpan order joki ke MySQL:', err.message);
                return res.status(500).json({ status: 'error', message: 'Gagal menyimpan ke database' });
            }
            
            const orderDatabaseId = result.insertId;
            console.log(`[MySQL] Data joki berhasil masuk! ID: ${orderDatabaseId}`);
            const fonnteToken = 'k4KJnApTx9Nd2RbVGreH'; 
            const pesanOrderBaru = `*ADA ORDERAN BARU MASUK, BOS EKALL!* 🚀🔥\n\n` +
                                   `----------------------------------------\n` +
                                   `👉 *NO. INVOICE:* #${orderDatabaseId}\n` +
                                   `🎮 *ID Player:* ${idUser} (${zona || 'Tanpa Server'})\n` +
                                   `📦 *Paket Joki:* ${paketJoki}\n` +
                                   `📧 *Email:* ${email || 'Tidak diisi'}\n` + 
                                   `📱 *WA Pembeli:* ${whatsapp || 'Tidak diisi'}\n` +
                                   `----------------------------------------\n\n` +
                                   `Pembeli lagi diarahin ke kasir Midtrans. Tunggu notif lunas selanjutnya ya! 😎🦾`;
            fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: {
                    'Authorization': fonnteToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target: '6285771151007',
                    message: pesanOrderBaru
                })
            })
            .then(response => response.json())
            .then(data => console.log('Respons Kirim WA Order Baru:', data))
            .catch(errWA => console.error('Gagal kirim WA Order Baru:', errWA));
            let parameter = {
                "transaction_details": {
                    "order_id": "JOKI-" + orderDatabaseId, 
                    "gross_amount": totalHarga 
                },
                "credit_card": {
                    "secure": true
                },
                "customer_details": {
                    "first_name": "Pembeli ID: " + idUser,
                    "email": email || "customer@ekallstore.com",
                    "phone": whatsapp || ""
                }
            };
            const transaction = await snap.createTransaction(parameter);
            res.json({
                status: 'success',
                redirect_url: transaction.redirect_url, 
                token: transaction.token,
                id: orderDatabaseId 
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});
app.post('/api/midtrans-webhook', async (req, res) => {
    try {
        const notification = req.body;
        let statusResponse = await snap.transaction.notification(notification);
        
        let orderId = statusResponse.order_id;
        let transactionStatus = statusResponse.transaction_status;
        let paymentType = statusResponse.payment_type;
        console.log(`[Midtrans Webhook] ID Order: ${orderId} | Status: ${transactionStatus}`);
        if (transactionStatus === 'settlement') {
            const targetId = orderId.includes('-') ? orderId.split('-')[1] : orderId;
            const queryUpdate = "UPDATE orders SET status = 'Lunas' WHERE id = ?";
            
            db.query(queryUpdate, [targetId], (err, result) => {
                if (err) console.error('Gagal update status di MySQL:', err);
                else console.log(`[MySQL Success] ID ${targetId} otomatis berubah jadi Lunas!`);
            });
            const queryAmbilData = "SELECT player_id, zone_id, paket_joki, email, no_wa FROM orders WHERE id = ?";
            
            db.query(queryAmbilData, [targetId], (errSelect, rows) => {
                if (errSelect || rows.length === 0) {
                    console.error('Gagal mengambil data player untuk WA & Email:', errSelect);
                    return;
                }
                const dataPlayer = rows[0].player_id;
                const dataZone = rows[0].zone_id;
                const dataPaket = rows[0].paket_joki;
                const targetEmail = rows[0].email;
                const targetWaPembeli = rows[0].no_wa;
                const fonnteToken = 'k4KJnApTx9Nd2RbVGreH'; 
                const pesanLunasLengkap = `*✅ PESANAN LUNAS, BOS EKALL!* 🔥\n\n` +
                                          `----------------------------------------\n` +
                                          `👉 *NO. INVOICE:* #${targetId}\n` +
                                          `🎮 *ID Player:* ${dataPlayer} (${dataZone || 'Tanpa Server'})\n` +
                                          `📦 *Paket Joki:* ${dataPaket}\n` +
                                          `📱 *WA Pembeli:* ${targetWaPembeli || 'Tidak diisi'}\n` + 
                                          `💳 *Metode Bayar:* ${paymentType.toUpperCase()}\n` +
                                          `----------------------------------------\n\n` +
                                          `Duit udah masuk ke Midtrans dan status di sistem udah otomatis UPDATE. Silakan langsung login akun pembeli dan gas push rank! 😎🕹️🦾`;
                fetch('https://api.fonnte.com/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': fonnteToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        target: '6285771151007',
                        message: pesanLunasLengkap
                    })
                })
                .then(response => response.json())
                .then(data => console.log('Respons Webhook Fonnte:', data))
                .catch(errWA => console.error('Fonnte Webhook Error:', errWA));
                const namaPaketLower = dataPaket.toLowerCase();
                if (namaPaketLower.includes('diamond') || namaPaketLower.includes('wdp')) {
                    if (targetEmail) {
                        const mailOptions = {
                            from: '"Ekall Store Official" <haikalakbarwijaya18@gmail.com>',
                            to: targetEmail,
                            subject: `Ekall Store - Top Up Sukses! 💎 (Invoice: #${targetId})`,
                            html: `
                                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 500px; background-color: #f9f9f9;">
                                    <h2 style="color: #28a745; text-align: center;">DIAMOND LU UDAH MASUK, SOB! 🎉</h2>
                                    <p>Halo Gamers,</p>
                                    <p>Pesanan top-up kamu dengan <b>No. Invoice #${targetId}</b> di <b>Ekall Store</b> sudah sukses diproses otomatis oleh sistem kami!</p>
                                    <hr style="border: none; border-top: 1px solid #eee;">
                                    <p>🎮 <b>ID Player:</b> ${dataPlayer} (${dataZone || ''})</p>
                                    <p>📦 <b>Paket:</b> ${dataPaket}</p>
                                    <hr style="border: none; border-top: 1px solid #eee;">
                                    <p>Silakan login dan cek akun game kamu sekarang juga ya. Diamond-nya sudah berhasil di-inject ke dalam akun kamu.</p>
                                    <p>Terima kasih banyak sudah mempercayakan top up kamu di Ekall Store. Ditunggu orderan selanjutnya! 🔥</p>
                                    <hr style="border: none; border-top: 1px solid #eee;">
                                    <p style="font-size: 12px; color: #666; text-align: center;">Laporan ini dikirim otomatis oleh sistem backend Ekall Store.</p>
                                </div>
                            `
                        };
                        transporter.sendMail(mailOptions, (errMail, info) => {
                            if (errMail) {
                                console.error("[BACKEND AUTOMATIC] Gagal ngirim email sukses diamond:", errMail);
                            } else {
                                console.log("[BACKEND AUTOMATIC] BOOM! Email sukses diamond langsung terbang begitu lunas ke: " + targetEmail);
                                const querySelesai = "UPDATE orders SET status = 'Selesai' WHERE id = ?";
                                db.query(querySelesai, [targetId], (errUpdate) => {
                                    if (errUpdate) console.error("Gagal auto-update ke Selesai:", errUpdate);
                                    else console.log(`[BACKEND AUTOMATIC] ID ${targetId} otomatis berubah jadi Selesai!`);
                                });
                            }
                        });
                    } else {
                        console.log(`[BACKEND AUTOMATIC] Orderan Diamond #${targetId} Lunas, tapi email pembeli di database kosong!`);
                    }
                } else {
                    console.log(`[BACKEND AUTOMATIC] Orderan Joki #${targetId} Lunas! Email dikunci, menunggu proses pengerjaan.`);
                }
            });
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error("Webhook Total Error:", error);
        res.status(500).send(error.message);
    }
});
app.get('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    const cleanId = orderId.replace('#', '');
    const sql = "SELECT id, player_id, zone_id, paket_joki, status FROM orders WHERE id = ?";
    db.query(sql, [cleanId], (err, rows) => {
        if (err) {
            console.error('Gagal cek status:', err);
            return res.status(500).json({ success: false, message: 'Gagal memuat data dari database' });
        }
        if (rows.length > 0) {
            return res.json({
                success: true,
                data: {
                    player_id: `${rows[0].player_id} (${rows[0].zone_id || 'Tanpa Server'})`,
                    paket_joki: rows[0].paket_joki,
                    status: rows[0].status
                }
            });
        } else {
            return res.status(404).json({ success: false, message: 'Nomor invoice gak ketemu, Kall!' });
        }
    });
});
app.listen(PORT, () => {
    console.log(`Server siap meluncur di port ${PORT}! 🚀`);
});

