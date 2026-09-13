import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const adminDoc = await db.collection("users").doc("admin_001").get();
  console.log("Admin config keys:");
  if (adminDoc.exists) {
    const data = adminDoc.data();
    console.log("- groqKey:", data.groqKey ? "Present" : "Missing");
    console.log("- customApiKey:", data.customApiKey ? "Present" : "Missing");
    console.log("- ghToken:", data.ghToken ? "Present" : "Missing");
    console.log("- kimiKey:", data.kimiKey ? "Present" : "Missing");
    console.log("- pollinations:", "No key needed (free API)");
  }
  
  const sysDoc = await db.collection("system").doc("config").get();
  console.log("\nSystem config keys:");
  if (sysDoc.exists) {
    const data = sysDoc.data();
    console.log("- groqKey:", data.groqKey ? "Present" : "Missing");
    console.log("- openaiKey:", data.openaiKey ? "Present" : "Missing");
    console.log("- ghToken:", data.ghToken ? "Present" : "Missing");
  }
}

run().catch(console.error).finally(() => process.exit(0));
