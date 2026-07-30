import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfRmcn7fD20OPHxFOO82HEJ5CZ7xaHwZo",
  authDomain: "vit-ap-match.firebaseapp.com",
  projectId: "vit-ap-match",
  storageBucket: "vit-ap-match.firebasestorage.app",
  messagingSenderId: "754921121234",
  appId: "1:754921121234:web:6876751907668ed405540b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
