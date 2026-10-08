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


// Export auth
export { auth };


// Wait for Firebase to restore the existing login session
export const authReady = new Promise((resolve) => {

    let resolved = false;

    onAuthStateChanged(auth, (user) => {

        if (!resolved) {
            resolved = true;
            resolve(user);
        }

    });

});


// Monitor auth state
export const observeAuth = (callback) => {
    return onAuthStateChanged(auth, callback);
};


// Email signup
export const signup = async (name, email, password) => {

    const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
    );

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
            "Firestore profile error:",
            error
        );

    }

    return cred.user;
};


// Email login
export const login = async (email, password) => {

    const cred = await signInWithEmailAndPassword(
        auth,
        email,
        password
    );

    return cred.user;
};


// Google login
export const googleAuth = async () => {

    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(
        auth,
        provider
    );

    const user = result.user;

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
            "Firestore profile error:",
            error
        );

    }

    return user;
};


// Logout
export const logout = () => {
    return signOut(auth);
};
