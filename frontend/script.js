```javascript
import {
    signup,
    login,
    googleAuth,
    logout,
    auth,
    authReady
} from "./auth.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";


document.addEventListener("DOMContentLoaded", () => {

    const API_BASE_URL = "https://poster-generation.onrender.com";


    // ─────────────────────────────────────────────
    // DOM REFS
    // ─────────────────────────────────────────────

    const landingPage   = document.getElementById("landingPage");
    const studioModal   = document.getElementById("studioModal");
    const loginModal    = document.getElementById("loginModal");
    const signupModal   = document.getElementById("signupModal");
    const feed          = document.getElementById("chatMessages");
    const welcomeState  = document.getElementById("welcomeState");
    const canvasStatus  = document.getElementById("canvasStatus");
    const fileInput     = document.getElementById("imageUploadInput");

    let uploadedFile = null;


    // ─────────────────────────────────────────────
    // AUTH STATE
    // ─────────────────────────────────────────────

    onAuthStateChanged(auth, (user) => {

        const btn = document.getElementById("desiDescribeBtn");

        if (btn) {
            btn.textContent = user
                ? "Enter Studio →"
                : "Launch Studio →";
        }

    });


    // ─────────────────────────────────────────────
    // AUTH MODALS
    // ─────────────────────────────────────────────

    window.openLogin = () => {

        signupModal.classList.remove("active");
        loginModal.classList.add("active");

    };


    window.closeLogin = () => {
        loginModal.classList.remove("active");
    };


    window.openSignup = () => {

        loginModal.classList.remove("active");
        signupModal.classList.add("active");

    };


    window.closeSignup = () => {
        signupModal.classList.remove("active");
    };


    // ─────────────────────────────────────────────
    // SIGNUP
    // ─────────────────────────────────────────────

    window.signupUser = async () => {

        const name =
            document.getElementById("signupName").value.trim();

        const email =
            document.getElementById("signupEmail").value.trim();

        const pass =
            document.getElementById("signupPassword").value;


        if (!name || !email || !pass) {
            return alert("Please fill all fields.");
        }


        try {

            await signup(name, email, pass);

            window.closeSignup();

            openStudio();

        } catch (err) {

            alert("Signup error: " + err.message);

        }

    };


    // ─────────────────────────────────────────────
    // EMAIL LOGIN
    // ─────────────────────────────────────────────

    window.loginUser = async () => {

        const email =
            document.getElementById("loginEmail").value.trim();

        const pass =
            document.getElementById("loginPassword").value;


        if (!email || !pass) {
            return alert("Enter email and password.");
        }


        try {

            await login(email, pass);

            window.closeLogin();

            openStudio();

        } catch (err) {

            alert("Login error: " + err.message);

        }

    };


    // ─────────────────────────────────────────────
    // GOOGLE LOGIN
    // ─────────────────────────────────────────────

    window.googleLogin = async () => {

        try {

            await googleAuth();

            window.closeLogin();
            window.closeSignup();

            openStudio();

        } catch (err) {

            console.error("Google login error:", err);

            alert("Google login error: " + err.message);

        }

    };


    // ─────────────────────────────────────────────
    // LOGOUT
    // ─────────────────────────────────────────────

    window.handleLogout = async () => {

        try {

            await logout();

            studioModal.classList.remove("active");
            landingPage.style.display = "";

        } catch (err) {

            alert("Logout error: " + err.message);

        }

    };


    // ─────────────────────────────────────────────
    // OPEN / CLOSE STUDIO
    // ─────────────────────────────────────────────

    function openStudio() {

        landingPage.style.display = "none";
        studioModal.classList.add("active");

    }


    // ⭐ IMPORTANT FIX ⭐
    // Wait for Firebase to finish restoring the saved
    // authentication state before checking auth.currentUser.

    async function handleLaunch() {

        const user = await authReady;


        if (!user) {

            window.openLogin();

        } else {

            openStudio();

        }

    }


    document
        .getElementById("desiDescribeBtn")
        ?.addEventListener("click", handleLaunch);


    document
        .getElementById("heroLaunchBtn")
        ?.addEventListener("click", handleLaunch);


    document
        .getElementById("closeStudio")
        ?.addEventListener("click", () => {

            studioModal.classList.remove("active");
            landingPage.style.display = "";

        });


    // ─────────────────────────────────────────────
    // KEEP THE REST OF YOUR EXISTING script.js
    // BELOW THIS POINT UNCHANGED
    // ─────────────────────────────────────────────
```
