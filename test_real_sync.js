import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import { XMLHttpRequest } from "xmlhttprequest";
global.XMLHttpRequest = XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function testSync() {
  console.log("=== TESTING REAL SYNC AGAINST (DEFAULT) DATABASE ===");
  const chatsRef = collection(db, "users", "admin_001", "chats");
  const snap = await getDocs(chatsRef);
  console.log(`Successfully fetched ${snap.size} chat documents from /users/admin_001/chats!`);
  let idx = 1;
  snap.forEach(d => {
    const data = d.data();
    const text = data.text || data.content || data.message;
    console.log(` ${idx++}. [${data.role || 'user'}] ${text ? text.substring(0, 70) : '(no text)'}`);
  });
  process.exit(0);
}

testSync().catch(err => {
  console.error("Sync test failed:", err);
  process.exit(1);
});
