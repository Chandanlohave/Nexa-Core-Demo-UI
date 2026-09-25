import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import { XMLHttpRequest } from "xmlhttprequest";
global.XMLHttpRequest = XMLHttpRequest;

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
// Specifically check (default) database
const defaultDb = getFirestore(app, "(default)");

async function check(col) {
  try {
    const snap = await getDocs(collection(defaultDb, col));
    console.log(`[(default) ${col}] -> count: ${snap.size}`);
    snap.forEach(d => console.log(`   doc ID: "${d.id}" ->`, JSON.stringify(d.data())));
  } catch (err) {
    console.log(`[(default) ${col}] -> Error: ${err.message}`);
  }
}

async function run() {
  console.log("=== CHECKING (DEFAULT) DATABASE IN NEXA-AI-V-9-3-0 ===");
  await check("users");
  await check("chats");
  await check("memories");
  await check("users/admin_001/chats");
  await check("users/admin/chats");
  await check("users/7499732530/chats");
  await check("users/user_001/chats");
  process.exit(0);
}

run();
