```javascript
import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";


// ============================================================
// AUTH PERSISTENCE
// ============================================================

// Explicitly keep users logged in across page refreshes/browser restarts.
export const authPersistenceReady = setPersistence(
    auth,
    browserLocalPersistence
).catch((error) => {
    console.error("Firebase persistence error:", error);
});


// ============================================================
// AUTH STATE READY
// ============================================================

// Firebase needs a moment after page load to restore the previous
// logged-in user from browser storage.
//
// This promise resolves ONCE after Firebase has determined whether
// the user is logged in or logged out.
export const authReady = new Promise((resolve) => {

    let resolved = false;

    onAuthStateChanged(auth, (user) => {

        if (!resolved) {
            resolved = true;
            resolve(user);
        }

    });

});


// Export auth so script.js can access auth.currentUser
export { auth };


// ============================================================
// AUTH STATE OBSERVER
// ============================================================

export const observeAuth = (callback) => {
    return onAuthStateChanged(auth, callback);
};


// ============================================================
// EMAIL/PASSWORD SIGNUP
// ============================================================

export const signup = async (name, email, password) => {

    // Make sure persistence is configured before signing in.
    await authPersistenceReady;

    const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );

    // Save user profile.
    // If Firestore has a temporary problem, don't prevent the
    // user from entering the application.
    try {

        await setDoc(
            doc(db, "users", cred.user.uid),
            {
                name: name,
                email: email,
                provider: "email",
                createdAt: serverTimestamp()
            }
        );

    } catch (error) {

        console.error(
            "User created, but Firestore profile save failed:",
            error
        );

    }

    return cred.user;
};


// ============================================================
// EMAIL/PASSWORD LOGIN
// ============================================================

export const login = async (email, password) => {

    await authPersistenceReady;

    const cred = await signInWithEmailAndPassword(
        auth,
        email,
        password
    );

    return cred.user;
};


// ============================================================
// GOOGLE LOGIN
// ============================================================

export const googleAuth = async () => {

    await authPersistenceReady;

    const provider = new GoogleAuthProvider();

    // Google authentication
    const res = await signInWithPopup(auth, provider);

    const user = res.user;

    // Authentication is already successful at this point.
    // Firestore profile saving should NOT prevent the user
    // from entering the application.
    try {

        await setDoc(
            doc(db, "users", user.uid),
            {
                name: user.displayName || "",
                email: user.email || "",
                provider: "google",
                createdAt: serverTimestamp()
            },
            {
                merge: true
            }
        );

    } catch (error) {

        console.error(
            "Google login successful, but Firestore profile save failed:",
            error
        );

    }

    return user;
};


// ============================================================
// LOGOUT
// ============================================================

export const logout = () => {
    return signOut(auth);
};
```
