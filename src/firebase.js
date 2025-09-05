// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLB-zt2n9e-ysUKK1PLOXj9wWQEDUaDpg",
  authDomain: "scentorini-3562b.firebaseapp.com",
  projectId: "scentorini-3562b",
  storageBucket: "scentorini-3562b.firebasestorage.app",
  messagingSenderId: "92443235262",
  appId: "1:92443235262:web:96a3233f3a7b592c4b9fef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export it
export const db = getFirestore(app);
