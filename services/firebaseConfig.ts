// @ts-ignore
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeiAByaCb_ceV-4c6v0vhHA76pQtC2WXo",
  authDomain: "nexa-ai-v-9-3-0.firebaseapp.com",
  projectId: "nexa-ai-v-9-3-0",
  storageBucket: "nexa-ai-v-9-3-0.firebasestorage.app",
  messagingSenderId: "734675712520",
  appId: "1:734675712520:web:d23cca89ae43a0a5292fbd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache settings
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };