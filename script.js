document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const chatContainer = document.getElementById('chat-container');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const welcomeMessage = document.getElementById('welcome-message');
    const adminView = document.getElementById('admin-view');
    const userView = document.getElementById('user-view');
    const adminMessages = document.getElementById('admin-messages');
    const userMessages = document.getElementById('user-messages');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const recipientNameSpan = document.getElementById('recipient-name');
    const userList = document.getElementById('user-list');
    const errorMessage = document.getElementById('error-message');

    const API_URL = 'https://our-chat-web.onrender.com'; // Your Render server
    const ADMIN_NAME = 'vishal';
    let currentMode = 'register';
    let socket;
    let currentRecipient = null;
    let allUsers = [];
    let onlineUsers = [];

    function initialize() {
        document.getElementById('register-tab').addEventListener('click', () => {
            currentMode = 'register';
            document.getElementById('form-title').textContent = 'Register a New Account';
            document.getElementById('form-description').textContent = 'Please enter your details to create an account.';
            document.getElementById('submit-button').textContent = 'Register';
        });

        document.getElementById('recover-tab').addEventListener('click', () => {
            currentMode = 'recover';
            document.getElementById('form-title').textContent = 'Recover Account';
            document.getElementById('form-description').textContent = 'Enter your name and answers to log back in.';
            document.getElementById('submit-button').textContent = 'Recover';
        });

        loginForm.addEventListener('submit', handleFormSubmit);
        logoutButton.addEventListener('click', handleLogout);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const answer1 = document.getElementById('question1').value.trim();
        const answer2 = document.getElementById('question2').value.trim();

        try {
            const response = await fetch(`${API_URL}/${currentMode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, answer1, answer2 })
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('currentUserName', data.name);
                showChat(data.name);
            } else {
                errorMessage.textContent = data.message || 'Something went wrong';
            }
        } catch (err) {
            errorMessage.textContent = 'Server error';
        }
    }

    function handleLogout() {
        localStorage.removeItem('currentUserName');
        socket.disconnect();
        chatContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    }

    function showChat(name) {
        loginContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        welcomeMessage.textContent = `Welcome, ${name}!`;

        if (name === ADMIN_NAME) {
            adminView.classList.remove('hidden');
            userView.classList.add('hidden');
            fetchAllUsers();
        } else {
            userView.classList.remove('hidden');
            adminView.classList.add('hidden');
        }
        connectToChat(name);
    }

    function connectToChat(name) {
        socket = io(API_URL);
        socket.emit('user connected', name);

        socket.on('private message', (msg) => {
            const messageList = (name === ADMIN_NAME) ? adminMessages : userMessages;
            const type = (msg.from === name || (name === ADMIN_NAME && msg.to === currentRecipient)) ? 'sent' : 'received';
            const senderName = (name === ADMIN_NAME) ? msg.from : ADMIN_NAME;
            appendMessage(messageList, senderName, msg.text, type);
        });

        if (name === ADMIN_NAME) {
            socket.on('user list update', (users) => {
                onlineUsers = users;
                renderUserList();
            });
        }
    }

    async function fetchAllUsers() {
        try {
            const response = await fetch(`${API_URL}/users`);
            const data = await response.json();
            if (data.success) {
                allUsers = data.users;
                renderUserList();
            }
        } catch (error) {
            console.error('Failed to fetch all users:', error);
        }
    }

    function renderUserList() {
        userList.innerHTML = '';
        const combined = allUsers.map(user => ({
            name: user,
            isOnline: onlineUsers.includes(user)
        }));

        combined.sort((a, b) => {
            if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name);
            return a.isOnline ? -1 : 1;
        });

        combined.forEach(user => {
            if (user.name === ADMIN_NAME) return;
            const item = document.createElement('li');
            item.dataset.username = user.name;
            if (user.isOnline) {
                const onlineIndicator = document.createElement('span');
                onlineIndicator.className = 'online-indicator';
                item.appendChild(onlineIndicator);
            }
            item.appendChild(document.createTextNode(user.name));
            if (user.name === currentRecipient) {
                item.classList.add('selected-user');
            }
            userList.appendChild(item);
        });
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        const from = localStorage.getItem('currentUserName');
        if (!text || !from) return;

        let to;
        if (from === ADMIN_NAME) {
            if (currentRecipient) {
                to = currentRecipient;
                socket.emit('private message', { from, to, text });
                appendMessage(adminMessages, `You to ${to}`, text, 'sent');
            } else {
                appendMessage(adminMessages, 'System', 'Please select a user to reply to.', 'received');
                return;
            }
        } else {
            to = ADMIN_NAME;
            socket.emit('private message', { from, to, text });
            appendMessage(userMessages, 'You', text, 'sent');
        }
        messageInput.value = '';
    }

    function appendMessage(listElement, senderName, text, type) {
        const li = document.createElement('li');
        li.classList.add(type);

        const senderSpan = document.createElement('span');
        senderSpan.classList.add('sender');
        senderSpan.textContent = senderName;

        const textSpan = document.createElement('span');
        textSpan.textContent = text;

        li.appendChild(senderSpan);
        li.appendChild(textSpan);
        listElement.appendChild(li);

        listElement.scrollTop = listElement.scrollHeight;
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    userList.addEventListener('click', (e) => {
        if (e.target && e.target.nodeName === 'LI') {
            currentRecipient = e.target.dataset.username;
            recipientNameSpan.textContent = currentRecipient;
            renderUserList();
        }
    });

    initialize();
});
