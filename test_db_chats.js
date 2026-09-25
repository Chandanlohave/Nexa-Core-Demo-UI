import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import { XMLHttpRequest } from "xmlhttprequest";
global.XMLHttpRequest = XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function run() {
  console.log("--- Checking Users Collection ---");
  const usersSnap = await getDocs(collection(db, "users"));
  console.log("Total user docs found:", usersSnap.size);
  for (const userDoc of usersSnap.docs) {
    console.log("User doc ID:", userDoc.id, "data:", JSON.stringify(userDoc.data()).substring(0, 100));
    try {
      const chatsSnap = await getDocs(collection(db, "users", userDoc.id, "chats"));
      console.log(` -> User ${userDoc.id} chats count:`, chatsSnap.size);
      for (const chatDoc of chatsSnap.docs.slice(0, 3)) {
        console.log(`    Chat ${chatDoc.id}:`, JSON.stringify(chatDoc.data()).substring(0, 100));
      }
    } catch (e) {
      console.error(`Error checking chats for ${userDoc.id}:`, e.message);
    }
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
