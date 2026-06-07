import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB2L3cLsuTr8qRLoisDlwYM8oqUM_LS9n4",
    authDomain: "desicribe-3cc39.firebaseapp.com",
    projectId: "desicribe-3cc39",
    storageBucket: "desicribe-3cc39.firebasestorage.app",
    messagingSenderId: "152252582038",
    appId: "1:152252582038:web:51d6fa0a7fe6beab981ab7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
