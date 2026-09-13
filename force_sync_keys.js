import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  try {
    const docRef = doc(db, "system", "config");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log("system/config DATA:", JSON.stringify(snap.data(), null, 2));
    } else {
      console.log("No system/config found");
    }
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
