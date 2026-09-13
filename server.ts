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

// Security Headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Simple IP Rate Limiter
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = ipRequestCounts.get(ip);
    if (!record || now > record.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
    }
    record.count++;
    next();
  };
};

const escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health Check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", secured: true, timestamp: new Date().toISOString() });
});

// API route for generating images and proxying to avoid CORS and canvas tainting
app.post("/api/generate-image", createRateLimiter(20, 60 * 1000), async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Valid prompt is required" });
    }
    if (prompt.length > 500) {
      return res.status(400).json({ error: "Prompt is too long (max 500 characters)" });
    }
    // Inject quality modifiers behind the scenes to avoid weird AI hallucinations
    const enhancedPrompt = prompt.trim() + ", highly detailed, cinematic lighting, masterpiece, 8k resolution, photorealistic, official marvel style";
    const cleanPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    
    // Parse prompt for requested orientation or resolution hints
    const lowercasePrompt = prompt.toLowerCase();
    // Default to square 1024x1024 as it guarantees perfect geometry without AI stretching artifacts
    let width = 1024;
    let height = 1024;
    
    if (lowercasePrompt.includes('wide') || lowercasePrompt.includes('landscape') || lowercasePrompt.includes('16:9') || lowercasePrompt.includes('desktop wallpaper')) {
        width = 1280; 
        height = 768; 
    } else if (lowercasePrompt.includes('portrait') || lowercasePrompt.includes('vertical') || lowercasePrompt.includes('mobile wallpaper') || lowercasePrompt.includes('9:16')) {
        width = 768;
        height = 1280;
    }

    // Force high-quality flux-realism model
    const primaryUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux-realism`;
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    };

    let response: Response | null = null;
    try {
      const controller = new AbortController();
      // Increase timeout to 35 seconds! High-res Flux-Realism models take 15-25 seconds to render.
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      response = await fetch(primaryUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (e) {
      // Retry with alternative model if timed out
      const fallbackUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      response = await fetch(fallbackUrl, { headers, signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);
    }

    if (response && response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mime = response.headers.get('content-type') || 'image/jpeg';
      const dataUrl = `data:${mime};base64,${base64}`;
      return res.json({ success: true, image: dataUrl });
    }

    // High quality procedural SVG fallback if network blocks external AI image hosts
    const rawWords = prompt.trim().split(' ').slice(0, 6).join(' ');
    const safeWords = escapeXml(rawWords.toUpperCase());
    const svgArt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#050714"/>
          <stop offset="50%" stop-color="#0b1329"/>
          <stop offset="100%" stop-color="#1b002c"/>
        </linearGradient>
        <radialGradient id="neonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.8"/>
          <stop offset="60%" stop-color="#a855f7" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="1024" height="1024" fill="url(#bgGrad)"/>
      <circle cx="512" cy="512" r="380" fill="url(#neonGlow)"/>
      <g stroke="#00e5ff" stroke-width="1.5" opacity="0.35">
        <line x1="100" y1="512" x2="924" y2="512"/>
        <line x1="512" y1="100" x2="512" y2="924"/>
        <circle cx="512" cy="512" r="280" fill="none"/>
        <circle cx="512" cy="512" r="180" fill="none" stroke="#a855f7"/>
      </g>
      <g filter="url(#glow)">
        <polygon points="512,320 660,600 364,600" fill="none" stroke="#00e5ff" stroke-width="4"/>
        <polygon points="512,680 364,400 660,400" fill="none" stroke="#a855f7" stroke-width="4"/>
      </g>
      <text x="512" y="740" fill="#ffffff" font-size="28" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="4">NEXA AI SYNTHESIS</text>
      <text x="512" y="785" fill="#00e5ff" font-size="20" font-family="sans-serif" text-anchor="middle" opacity="0.9">${safeWords}</text>
    </svg>`;
    const svgBase64 = Buffer.from(svgArt).toString('base64');
    return res.json({ success: true, image: `data:image/svg+xml;base64,${svgBase64}` });

  } catch (err: any) {
    console.error("Server image gen error:", err);
    const cleanPrompt = encodeURIComponent(req.body?.prompt?.trim() || 'futuristic artwork');
    return res.json({ 
      success: true, 
      image: `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true` 
    });
  }
});

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
