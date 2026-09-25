import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import { XMLHttpRequest } from "xmlhttprequest";
global.XMLHttpRequest = XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function run() {
  console.log("=== FIRESTORE INVESTIGATION ===");
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    console.log(`FOUND ${usersSnap.size} DOCUMENTS IN 'users' COLLECTION:`);
    for (const docSnap of usersSnap.docs) {
      console.log(`\n[Document ID: "${docSnap.id}"]`);
      console.log("Data keys:", Object.keys(docSnap.data()));
      console.log("Sample Data:", JSON.stringify(docSnap.data()).substring(0, 300));

      // Check subcollection "chats"
      try {
        const chatsSnap = await getDocs(collection(db, "users", docSnap.id, "chats"));
        console.log(` -> Subcollection "chats" count: ${chatsSnap.size}`);
        for (const chatDoc of chatsSnap.docs) {
          console.log(`    Chat ID "${chatDoc.id}":`, JSON.stringify(chatDoc.data()).substring(0, 200));
        }
      } catch (e) {
        console.log(` -> Error fetching "chats" subcollection: ${e.message}`);
      }

      // Check subcollection "data"
      try {
        const dataSubSnap = await getDocs(collection(db, "users", docSnap.id, "data"));
        console.log(` -> Subcollection "data" count: ${dataSubSnap.size}`);
        for (const dDoc of dataSubSnap.docs) {
          console.log(`    Data ID "${dDoc.id}":`, JSON.stringify(dDoc.data()).substring(0, 200));
        }
      } catch (e) {
        console.log(` -> Error fetching "data" subcollection: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error querying users collection:", err);
  }
  process.exit(0);
}

run();
