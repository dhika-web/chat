require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const db = new Database('chat.db');

db.exec('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT, username TEXT, message TEXT, role TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)');

const sessionMiddleware = session({
    secret: 'ganti-dengan-secret-key-yang-sangat-rahasia',
    resave: false,
    saveUninitialized: true
});
app.use(sessionMiddleware);
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/');
    } else {
        res.send('Password salah. <a href="/admin">Coba lagi</a>');
    }
});

// TAMBAHKAN DUA BLOK INI DI server.js

// Rute untuk menampilkan halaman riwayat
app.get('/admin/history', (req, res) => {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'history.html'));
    } else {
        res.status(403).send('Akses ditolak. Hanya untuk admin.');
    }
});

// Rute API untuk melakukan pencarian
app.get('/api/search', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Akses ditolak.' });
    }
    
    const { term } = req.query;
    if (!term) {
        return res.status(400).json({ error: 'Kata kunci pencarian dibutuhkan.' });
    }

    try {
        const searchQuery = `%${term}%`;
        const stmt = db.prepare(`
            SELECT * FROM messages 
            WHERE username LIKE ? OR message LIKE ? 
            ORDER BY timestamp DESC
        `);
        const results = stmt.all(searchQuery, searchQuery);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengambil data dari database.' });
    }
});

io.on('connection', (socket) => {
    const session = socket.request.session;
    if (session.isAdmin) {
        socket.role = 'admin';
        socket.username = 'Admin';
        socket.join('admin-room');
        const users = [];
        io.sockets.sockets.forEach((aSocket) => {
            if (aSocket.role === 'user') {
                users.push({ id: aSocket.id, username: aSocket.username });
            }
        });
        socket.emit('init-admin', { users: users });
    } else {
        socket.emit('init-user');
    }

    socket.on('set username', (username) => {
        if (!socket.username) {
            socket.role = 'user';
            socket.username = username;
            socket.join(socket.id);
            io.to('admin-room').emit('new user', { id: socket.id, username: username });
        }
    });

    socket.on('disconnect', () => {
        if (socket.username && socket.role === 'user') {
            io.to('admin-room').emit('user left', socket.id);
        }
    });

    socket.on('load history', (roomId) => {
        try {
            const stmt = db.prepare('SELECT username, message, role FROM messages WHERE room_id = ? ORDER BY timestamp ASC');
            const history = stmt.all(roomId);
            socket.emit('history loaded', history);
        } catch (err) {
            console.error("Gagal mengambil riwayat chat:", err);
        }
    });

    socket.on('chat message', (data) => {
        if (socket.username) {
            const room_id = (socket.role === 'admin') ? data.room_id : socket.id;
            if (!room_id) return;

            const messageData = { user: socket.username, message: data.message, role: socket.role, room_id: room_id };
            
            const stmt = db.prepare("INSERT INTO messages (room_id, username, message, role) VALUES (?, ?, ?, ?)");
            stmt.run(room_id, socket.username, data.message, socket.role);

            io.to(room_id).emit('chat message', messageData);
            io.to('admin-room').emit('chat message', messageData);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
    console.log(`Server berjalan di http://localhost:${PORT}`); 
});