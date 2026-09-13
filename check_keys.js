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
      const data = snap.data();
      console.log("Keys in system/config:");
      console.log("geminiKey:", data.geminiKey ? "Present" : "MISSING");
      console.log("openaiKey:", data.openaiKey ? "Present" : "MISSING");
      console.log("groqKey:", data.groqKey ? "Present" : "MISSING");
      console.log("kimiKey:", data.kimiKey ? "Present" : "MISSING");
      console.log("ghToken:", data.ghToken ? "Present" : "MISSING");
    } else {
      console.log("system/config document DOES NOT EXIST.");
    }
    
    // Check admin user for keys too
    const adminRef = doc(db, "users", "admin_001");
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
       const data = adminSnap.data();
       console.log("\nKeys in users/admin_001:");
       console.log("groqKey:", data.groqKey ? "Present" : "MISSING");
       console.log("customApiKey (often openai):", data.customApiKey ? "Present" : "MISSING");
       console.log("ghToken:", data.ghToken ? "Present" : "MISSING");
    }
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
