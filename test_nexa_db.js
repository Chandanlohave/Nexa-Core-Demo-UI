import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import { XMLHttpRequest } from "xmlhttprequest";
global.XMLHttpRequest = XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || "(default)");

async function checkCollection(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    console.log(`[Collection: ${colName}] -> count: ${snap.size}`);
    snap.forEach(d => console.log(`   doc ID: "${d.id}" ->`, JSON.stringify(d.data())));
  } catch (err) {
    console.log(`[Collection: ${colName}] -> Error: ${err.message}`);
  }
}

async function run() {
  console.log("=== CHECKING NEXA-AI-V-9-3-0 FIRESTORE ===");
  console.log("Project:", config.projectId, "DatabaseId:", config.firestoreDatabaseId);

  const topCollections = ["users", "chats", "memories", "system", "access_keys", "admin_001"];
  for (const c of topCollections) {
    await checkCollection(c);
  }

  // Also check candidate subcollections under users/admin_001/chats or users/chats
  const subPaths = [
    "users/admin_001/chats",
    "users/admin/chats",
    "users/7499732530/chats",
    "users/user_001/chats"
  ];
  for (const sp of subPaths) {
    try {
      const snap = await getDocs(collection(db, sp));
      console.log(`[Subcollection: ${sp}] -> count: ${snap.size}`);
      snap.forEach(d => console.log(`   doc ID: "${d.id}" ->`, JSON.stringify(d.data())));
    } catch (err) {
      console.log(`[Subcollection: ${sp}] -> Error: ${err.message}`);
    }
  }

  process.exit(0);
}

run();
