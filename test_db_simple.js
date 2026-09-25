import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import { XMLHttpRequest } from "xmlhttprequest";
global.XMLHttpRequest = XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  console.log("=== FIRESTORE TEST WITH GETFIRESTORE(APP) ===");
  try {
    // Write a test document to confirm write capability
    const testRef = doc(db, "users", "admin_001");
    await setDoc(testRef, { testField: "hello", updatedAt: new Date().toISOString() }, { merge: true });
    console.log("SUCCESSFULLY SET DOC ON 'users/admin_001'!");

    const usersSnap = await getDocs(collection(db, "users"));
    console.log(`FOUND ${usersSnap.size} DOCUMENTS IN 'users' COLLECTION:`);
    for (const docSnap of usersSnap.docs) {
      console.log(` -> ID: "${docSnap.id}", data:`, JSON.stringify(docSnap.data()));
    }
  } catch (err) {
    console.error("FIRESTORE TEST ERROR:", err);
  }
  process.exit(0);
}

run();
