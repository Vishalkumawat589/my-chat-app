document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const loginContainer = document.getElementById('login-container');
    const chatContainer = document.getElementById('chat-container');
    // ... (all other DOM element selections remain the same) ...
    const recipientNameSpan = document.getElementById('recipient-name');
    const userList = document.getElementById('user-list');

    // --- Configuration ---
    const API_URL = 'https://our-chat-web.onrender.com';
    const ADMIN_NAME = 'vishal';
    let currentMode = 'register';
    let socket;
    let currentRecipient = null; // NEW: Tracks who the admin is replying to
    let allUsers = []; // NEW: Stores all registered users
    let onlineUsers = []; // NEW: Stores all online users

    // (initialize, showLogin, handleFormSubmit, and handleLogout functions remain the same)

    // --- UI Update Functions ---
    function showChat(name) {
        loginContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        chatContainer.style.display = 'flex';
        welcomeMessage.textContent = `Welcome, ${name}!`;

        if (name === ADMIN_NAME) {
            adminView.classList.remove('hidden');
            userView.classList.add('hidden');
            fetchAllUsers(); // Fetch all users when admin logs in
        } else {
            userView.classList.remove('hidden');
            adminView.classList.add('hidden');
        }
        connectToChat(name);
    }

    // --- Real-Time Chat & User List Functions ---
    function connectToChat(name) {
        socket = io(API_URL);
        socket.emit('user connected', name);

        socket.on('private message', (msg) => {
            const messageList = (name === ADMIN_NAME) ? adminMessages : userMessages;
            const type = (msg.from === name || (name === ADMIN_NAME && msg.to === currentRecipient)) ? 'sent' : 'received';
            
            // For admin, show who the message is from. For user, it's always from admin.
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
                renderUserList(); // Render the list once all users are fetched
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
            if (user.name === ADMIN_NAME) return; // Don't show admin in the list
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
                return; // Stop here if no user is selected
            }
        } else {
            to = ADMIN_NAME;
            socket.emit('private message', { from, to, text });
            appendMessage(userMessages, 'You', text, 'sent');
        }
        messageInput.value = '';
    }

    function appendMessage(listElement, senderName, text, type) {
        // ... (This function remains the same as the last version) ...
    }


    // --- Event Listeners ---
    // (loginForm, logoutButton, tabs listeners remain the same)
    chatForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });

    // NEW: Click listener for the user list
    userList.addEventListener('click', (e) => {
        if (e.target && e.target.nodeName === 'LI') {
            const selectedUser = e.target.dataset.username;
            currentRecipient = selectedUser;
            recipientNameSpan.textContent = selectedUser;
            renderUserList(); // Re-render to highlight the new selection
        }
    });

    // --- Run the app ---
    initialize();

    // Note: To keep this block concise, some identical functions from the previous version have been commented out.
    // You should use the full code provided here, as some of those functions now have small but important updates.
});
                    
