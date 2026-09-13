import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";
import { XMLHttpRequest } from "xmlhttprequest";
global.XMLHttpRequest = XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function run() {
  const docRef = doc(db, "users", "admin_001");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("Keys:", Object.keys(data));
    if (data.photoUrl) console.log("photoUrl size:", data.photoUrl.length);
    if (data.voiceprintId) console.log("voiceprintId:", data.voiceprintId);
  } else {
    console.log("No such document!");
  }
  process.exit(0);
}
run();
