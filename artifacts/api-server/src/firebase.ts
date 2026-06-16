// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBGf781UAK81OwgFV6tVKLPix8QjtsJ6NA",
  authDomain: "servimach-fdb7a.firebaseapp.com",
  databaseURL: "https://servimach-fdb7a-default-rtdb.firebaseio.com",
  projectId: "servimach-fdb7a",
  storageBucket: "servimach-fdb7a.firebasestorage.app",
  messagingSenderId: "36079257040",
  appId: "1:36079257040:web:acfe6edd4ebcc422b1e5d5",
  measurementId: "G-J1XYYNWD8B",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;
