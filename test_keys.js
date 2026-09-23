import fs from "fs";

// Just manually parsing what we can see from env or known files
console.log("Checking ENV vars:");
console.log("- GROQ_API_KEY:", process.env.GROQ_API_KEY ? "Present" : "Missing");
console.log("- OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Present" : "Missing");
console.log("- MOONSHOT_API_KEY:", process.env.MOONSHOT_API_KEY ? "Present" : "Missing");
console.log("- GITHUB_TOKEN:", process.env.GITHUB_TOKEN ? "Present" : "Missing");

