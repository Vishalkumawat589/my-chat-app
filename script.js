document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const loginContainer = document.getElementById('login-container');
    const chatContainer = document.getElementById('chat-container');
    const loginForm = document.getElementById('login-form');
    const nameInput = document.getElementById('name');
    const question1Input = document.getElementById('question1');
    const question2Input = document.getElementById('question2');
    const errorMessage = document.getElementById('error-message');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const submitButton = document.getElementById('submit-button');
    const registerTab = document.getElementById('register-tab');
    const recoverTab = document.getElementById('recover-tab');
    const formTitle = document.getElementById('form-title');
    const formDescription = document.getElementById('form-description');
    const adminView = document.getElementById('admin-view');
    const userView = document.getElementById('user-view');
    const userList = document.getElementById('user-list');
    const adminMessages = document.getElementById('admin-messages');
    const userMessages = document.getElementById('user-messages');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const recipientNameSpan = document.getElementById('recipient-name');

    // --- Configuration ---
    const API_URL = 'https://our-chat-web.onrender.com';
    const ADMIN_NAME = 'vishal';
    let currentMode = 'register';
    let socket;
    let currentRecipient = null;
    let allUsers = [];
    let onlineUsers = [];

    // --- Initial Check ---
    function initialize() {
        const currentUserName = localStorage.getItem('currentUserName');
        if (currentUserName) {
            showChat(currentUserName);
        } else {
            showLogin();
        }
    }

    // --- UI Update Functions ---
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

    function showLogin() {
        chatContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        updateFormUI();
        if (socket) socket.disconnect();
    }
    
    function updateFormUI() {
        if (currentMode === 'register') {
            registerTab.classList.add('active');
            recoverTab.classList.remove('active');
            formTitle.textContent = 'Register a New Account';
            formDescription.textContent = 'Please enter your details to create an account.';
            submitButton.textContent = 'Register';
        } else {
            recoverTab.classList.add('active');
            registerTab.classList.remove('active');
            formTitle.textContent = 'Log In / Recover Session';
            formDescription.textContent = 'Enter your details to log in.';
            submitButton.textContent = 'Log In';
        }
    }

    // --- Login/Registration Logic ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        errorMessage.textContent = '';
        const name = nameInput.value.trim();
        const answer1 = question1Input.value.trim();
        const answer2 = question2Input.value.trim();

        if (!/^[a-z]+$/.test(name) || !/^[a-z]+$/.test(answer1) || !/^[a-z]+$/.test(answer2)) {
            errorMessage.textContent = 'Please use lowercase letters only for all fields.';
            return;
        }

        const endpoint = (currentMode === 'register') ? `${API_URL}/register` : `${API_URL}/recover`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, answer1, answer2 }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                localStorage.setItem('currentUserName', name);
                showChat(name);
            } else {
                errorMessage.textContent = data.message || 'An unexpected error occurred.';
            }
        } catch (error) {
            errorMessage.textContent = 'Cannot connect to the server.';
        }
    }
    
    function handleLogout() {
        localStorage.removeItem('currentUserName');
        loginForm.reset();
        showLogin();
    }

    // --- Real-Time Private Chat Functions ---
    function connectToChat(name) {
        socket = io(API_URL);
        socket.emit('user connected', name);

        // --- THIS IS THE CORRECTED FUNCTION ---
        socket.on('private message', (msg) => {
            const messageList = (name === ADMIN_NAME) ? adminMessages : userMessages;
            const type = (msg.from === name) ? 'sent' : 'received';
            
            // For admin, the sender is the user. For a user, the sender is always the admin.
            const senderName = (name === ADMIN_NAME) ? msg.from : ADMIN_NAME;
            
            // The bug was here: I was using 'text' instead of 'msg.text'
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
        const item = document.createElement('li');
        item.classList.add(type);
        const sender = document.createElement('span');
        sender.classList.add('sender');
        sender.textContent = senderName;
        item.appendChild(sender);
        item.appendChild(document.createTextNode(text));
        listElement.appendChild(item);
        listElement.scrollTop = listElement.scrollHeight;
    }

    // --- Event Listeners ---
    loginForm.addEventListener('submit', handleFormSubmit);
    logoutButton.addEventListener('click', handleLogout);
    registerTab.addEventListener('click', () => { currentMode = 'register'; updateFormUI(); });
    recoverTab.addEventListener('click', () => { currentMode = 'recover'; updateFormUI(); });
    chatForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    userList.addEventListener('click', (e) => {
        // Use e.target.closest('li') to make sure we get the list item
        const listItem = e.target.closest('li');
        if (listItem) {
            const selectedUser = listItem.dataset.username;
            currentRecipient = selectedUser;
            recipientNameSpan.textContent = selectedUser;
            renderUserList();
        }
    });

    // --- Run the app ---
    initialize();
});
    
