const socket = io();
const appContainer = document.getElementById('app-container');
const currentUser = {
    username: '',
    role: '',
    activeRoom: null
};

function buildUserUI() {
    appContainer.innerHTML = `
        <div id="chat-view">
            <div id="messages-container">
                <ul id="messages"></ul>
            </div>
            <div id="form-container">
                <form id="form">
                    <input id="input" autocomplete="off" placeholder="Ketik pesan..." /><button>Kirim</button>
                </form>
            </div>
        </div>
    `;
    attachCommonListeners();
}

function buildAdminUI() {
    appContainer.innerHTML = `
        <div id="user-list-container">
            <div class="admin-header">
                <h2>Active Chats</h2>
                <a href="/admin/history">Riwayat Chat</a>
            </div>
            <ul id="user-list"></ul>
        </div>
        <div id="chat-view">
             <div id="chat-header">
                <h3 id="chat-with-name">Pilih Pengguna dari daftar</h3>
            </div>
            <div id="messages-container">
                <ul id="messages"></ul>
            </div>
            <div id="form-container">
                <form id="form">
                    <input id="input" autocomplete="off" placeholder="Pilih user untuk memulai chat..." disabled /><button>Kirim</button>
                </form>
            </div>
        </div>
    `;
    attachCommonListeners();
    attachAdminListeners();
}

socket.on('init-admin', (initialData) => {
    currentUser.username = 'Admin';
    currentUser.role = 'admin';
    buildAdminUI();
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';
    initialData.users.forEach(user => addUserToList(user));
});

socket.on('init-user', () => {
    let username = prompt("Silakan masukkan nama Anda:");
    if (!username || username.trim() === "") {
        username = "Tamu" + Math.floor(Math.random() * 1000);
    }
    currentUser.username = username;
    currentUser.role = 'user';
    buildUserUI();
    socket.emit('set username', username);
});

function attachCommonListeners() {
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value && (currentUser.role === 'user' || (currentUser.role === 'admin' && currentUser.activeRoom))) {
            socket.emit('chat message', {
                message: input.value,
                room_id: currentUser.activeRoom
            });
            input.value = '';
        }
    });
    socket.on('chat message', (data) => {
        if (currentUser.role === 'user' || (currentUser.role === 'admin' && data.room_id === currentUser.activeRoom)) {
            addMessageToList(data);
        }
    });
    socket.on('history loaded', (history) => {
        const messages = document.getElementById('messages');
        messages.innerHTML = '';
        history.forEach(data => addMessageToList(data, true));
    });
}

function attachAdminListeners() {
    const userList = document.getElementById('user-list');
    socket.on('user list', (users) => {
        userList.innerHTML = '';
        users.forEach(user => addUserToList(user));
    });
   socket.on('new user', (user) => {
    // TAMBAHKAN CONSOLE.LOG INI
    console.log('ADMIN CLIENT: Menerima event "new user"', user);
    addUserToList(user);
});
    socket.on('user left', (userId) => {
        const userItem = document.getElementById(`user-${userId}`);
        if (userItem) userItem.remove();
        if (currentUser.activeRoom === userId) {
            document.getElementById('messages').innerHTML = '';
            document.getElementById('chat-with-name').textContent = 'Pilih Pengguna dari daftar';
            const input = document.getElementById('input');
            input.placeholder = 'User telah keluar. Pilih user lain.';
            input.disabled = true;
            currentUser.activeRoom = null;
        }
    });
}

function addUserToList(user) {
    const userList = document.getElementById('user-list');
    const item = document.createElement('li');
    item.className = 'user-list-item';
    item.id = `user-${user.id}`;
    item.textContent = user.username;
    item.onclick = () => selectUserChat(user.id, user.username);
    userList.appendChild(item);
}

function selectUserChat(userId, username) {
    currentUser.activeRoom = userId;
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    const chatHeader = document.getElementById('chat-with-name');
    input.disabled = false;
    input.placeholder = `Ketik balasan untuk ${username}...`;
    messages.innerHTML = '';
    chatHeader.textContent = `Chat dengan ${username}`;
    document.querySelectorAll('.user-list-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`user-${userId}`).classList.add('active');
    socket.emit('load history', userId);
}

function addMessageToList(data, isHistory = false) {
    const messages = document.getElementById('messages');
    const item = document.createElement('li');
    const sender = isHistory ? data.username : data.user;
    const messageType = (sender === currentUser.username) ? 'message-sent' : 'message-received';
    item.classList.add(messageType);
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.innerHTML = data.message;
    item.appendChild(bubble);
    messages.appendChild(item);
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}