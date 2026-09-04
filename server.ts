import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";
import { checkAndSendBirthdayWishes } from "./services/autoWisherService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Setup Vite Middleware for Dev, or Static for Prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Schedule daily cron job for 12:00 AM (Midnight)
  cron.schedule("0 0 * * *", () => {
    console.log("Running Daily Cron: checkAndSendBirthdayWishes()");
    checkAndSendBirthdayWishes().catch(console.error);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
