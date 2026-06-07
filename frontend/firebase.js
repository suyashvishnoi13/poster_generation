import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBlR-bcFs-p20Nt2acl21dQVLDx8dLE2VA",
    authDomain: "desi-scribe.firebaseapp.com",
    projectId: "desi-scribe",
    storageBucket: "desi-scribe.firebasestorage.app",
    messagingSenderId: "628324349374",
    appId: "1:628324349374:web:4ce4790b36a85bf2d175ef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Database for use in other files
export const auth = getAuth(app);
export const db = getFirestore(app);