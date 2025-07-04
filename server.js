// 1. Memanggil library yang dibutuhkan
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

// 2. Inisialisasi aplikasi Express dan server HTTP
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 3. Menyajikan file statis dari folder root (untuk index.html)
app.use(express.static(__dirname));

// 4. Rute utama untuk menyajikan file index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 5. Logika Socket.IO (bagian real-time)
io.on('connection', (socket) => {
  console.log('Seorang pengguna terhubung');

  // Saat pengguna terputus
  socket.on('disconnect', () => {
    console.log('Pengguna terputus');
  });

  // Saat server menerima pesan 'chat message' dari klien
  socket.on('chat message', (msg) => {
    console.log('Pesan: ' + msg);
    // Mengirimkan pesan tersebut ke SEMUA klien yang terhubung
    io.emit('chat message', msg);
  });
});

// 6. Menjalankan server di port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});