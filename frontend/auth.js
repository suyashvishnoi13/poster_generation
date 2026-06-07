import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Export the auth instance so script.js can monitor current user state
export { auth };

/**
 * Monitors the authentication state (Logged in vs Logged out)
 * This is used in script.js to change button text automatically.
 */
export const observeAuth = (callback) => {
    onAuthStateChanged(auth, callback);
};

/**
 * Standard Email/Password Signup
 * Creates a user and saves their profile to the "users" collection.
 */
export const signup = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
        name: name,
        email: email,
        provider: "email",
        createdAt: serverTimestamp()
    });
    return cred.user;
};

/**
 * Standard Email/Password Login
 */
export const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Google Popup Authentication
 * Saves or updates the user profile in Firestore after successful login.
 */
export const googleAuth = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    
    // merge: true ensures we don't overwrite existing data if they log in again
    await setDoc(doc(db, "users", res.user.uid), {
        name: res.user.displayName,
        email: res.user.email,
        provider: "google",
        createdAt: serverTimestamp()
    }, { merge: true });
    
    return res.user;
};

/**
 * Sign Out
 */
export const logout = () => {
    return signOut(auth);
};