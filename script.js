document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const loginContainer = document.getElementById('login-container');
    const chatContainer = document.getElementById('chat-container');
    const loginForm = document.getElementById('login-form');
    
    // Form elements
    const nameInput = document.getElementById('name');
    const question1Input = document.getElementById('question1');
    const question2Input = document.getElementById('question2');
    const errorMessage = document.getElementById('error-message');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const submitButton = document.getElementById('submit-button');
    
    // Tab elements
    const registerTab = document.getElementById('register-tab');
    const recoverTab = document.getElementById('recover-tab');
    const formTitle = document.getElementById('form-title');
    const formDescription = document.getElementById('form-description');

    // --- Configuration ---
    // This now points to your live server on Render
    const API_URL = 'https://our-chat-web.onrender.com';
    let currentMode = 'register'; // Can be 'register' or 'recover'

    // --- Initial Check on Page Load ---
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
    }

    function showLogin() {
        chatContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        updateFormUI(); // Set the default form view
    }
    
    function updateFormUI() {
        if (currentMode === 'register') {
            registerTab.classList.add('active');
            recoverTab.classList.remove('active');
            formTitle.textContent = 'Register a New Account';
            formDescription.textContent = 'Please enter your details to create an account.';
            submitButton.textContent = 'Register';
        } else { // recover mode
            recoverTab.classList.add('active');
            registerTab.classList.remove('active');
            formTitle.textContent = 'Log In / Recover Session';
            formDescription.textContent = 'Enter your details to log in.';
            submitButton.textContent = 'Log In';
        }
    }

    // --- Core Logic ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        errorMessage.textContent = '';

        const name = nameInput.value.trim();
        const answer1 = question1Input.value.trim();
        const answer2 = question2Input.value.trim();

        // Client-side validation
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
                // Save session locally and show the chat interface
                localStorage.setItem('currentUserName', name);
                showChat(name);
            } else {
                errorMessage.textContent = data.message || 'An unexpected error occurred.';
            }
        } catch (error) {
            console.error('Network or server error:', error);
            errorMessage.textContent = 'Cannot connect to the server. Is it running?';
        }
    }
    
    function handleLogout() {
        localStorage.removeItem('currentUserName');
        loginForm.reset();
        showLogin();
    }

    // --- Event Listeners ---
    loginForm.addEventListener('submit', handleFormSubmit);
    logoutButton.addEventListener('click', handleLogout);

    registerTab.addEventListener('click', () => {
        currentMode = 'register';
        updateFormUI();
    });

    recoverTab.addEventListener('click', () => {
        currentMode = 'recover';
        updateFormUI();
    });

    // --- Run the app ---
    initialize();
});
