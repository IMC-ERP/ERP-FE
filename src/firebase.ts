/**
 * Firebase Configuration
 * Google 로그인을 위한 Firebase 초기화
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDnW3PGlTpROhdZyI0dyw7lIrD77YMATA4",
    authDomain: "coffee-erp-dashboard.firebaseapp.com",
    projectId: "coffee-erp-dashboard",
    storageBucket: "coffee-erp-dashboard.firebasestorage.app",
    messagingSenderId: "427178764915",
    appId: "1:427178764915:web:486e2a0f8c3d20714c5806"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
