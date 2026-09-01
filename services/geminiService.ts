
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { UserProfile, UserRole, StudyHubSubject, ChatMessage, AgentResponse, ActionType, MapLocation, WidgetPayload, VOICES, VoiceKey } from "../types";
import { getMemoryForPrompt, logAdminNotification, getFacts, fetchSystemConfig, searchMemoriesByDate, FAMILY_TREE } from "./memoryService";

// --- MODEL CONFIGURATION ---
const GEMINI_MODEL = "gemini-3.7-flash"; 
const GEMINI_FLASH = "gemini-3.7-flash"; 
const IMAGE_MODEL = "gemini-3.1-flash-lite-image"; 

// --- EXTERNAL APIs ---
const KIMI_BASE_URL = "https://api.moonshot.cn/v1";
const KIMI_MODEL_LONG = "moonshot-v1-128k"; 

// --- GROQ CONFIG (DEEPSEEK R1) ---
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEEPSEEK_MODEL = "deepseek-r1-distill-llama-70b"; 

// --- HELPER FUNCTIONS ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isQuotaError = (e: any) => {
    const errStr = e.toString().toLowerCase();
    return errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit') || errStr.includes('overloaded');
};

const MORNING_QUOTES = [
  "Good Morning! Aaj ka din kamaal ka hone wala hai.",
  "Utho, jaago aur tab tak mat ruko jab tak lakshya na mil jaye. Swami Vivekananda ji ne kaha tha.",
  "Aaj ki subah nayi umeed layi hai. Chaliye shuru karte hain.",
  "Focus on the solution, not the problem. Aaj yahi mindset rakhenge.",
  "Coffee aur Confidence, dono taiyar hain?"
];

const NUMBERS_HI = ["Zero", "Ek", "Do", "Teen", "Chaar", "Paanch", "Che", "Saat", "Aath", "Nau", "Dus", "Gyarah", "Barah", "Terah", "Chodah", "Pandrah", "Solah", "Satrah", "Atharah", "Unnis", "Bees", "Ikkis", "Baais", "Teis", "Chobis", "Pachis", "Chabbis", "Satais", "Athais", "Unakis", "Tees", "Ikatis"];

// --- ENHANCED GENDER CORRECTION ENGINE ---
export const forceFemaleHindi = (text: string): string => {
    if (!text) return text;
    let fixed = text;
    
    // Verbs ending in 'ta' -> 'ti' (e.g., Karta -> Karti)
    fixed = fixed.replace(/(\bmain\s+[\w\s]*?)\bkarta\b/gi, '$1karti');
    fixed = fixed.replace(/(\bmain\s+[\w\s]*?)\bkhata\b/gi, '$1khati');
    fixed = fixed.replace(/(\bmain\s+[\w\s]*?)\bjaata\b/gi, '$1jaati');
    fixed = fixed.replace(/(\bmain\s+[\w\s]*?)\bsochta\b/gi, '$1sochti');
    fixed = fixed.replace(/(\bmain\s+[\w\s]*?)\bbolta\b/gi, '$1bolti');
    fixed = fixed.replace(/(\bmain\s+[\w\s]*?)\bcahta\b/gi, '$1cahti');
    
    // Future Tense 'unga' -> 'ungi' (e.g., Karunga -> Karungi)
    fixed = fixed.replace(/\bkarunga\b/gi, 'karungi');
    fixed = fixed.replace(/\baunga\b/gi, 'aungi');
    fixed = fixed.replace(/\bjaunga\b/gi, 'jaungi');
    fixed = fixed.replace(/\bbataunga\b/gi, 'bataungi');
    fixed = fixed.replace(/\bkhaunga\b/gi, 'khaungi');
    fixed = fixed.replace(/\bpiunga\b/gi, 'piungi');
    fixed = fixed.replace(/\bdekhunga\b/gi, 'dekhungi');
    
    // Continuous 'raha' -> 'rahi'
    fixed = fixed.replace(/\braha\s+hoon\b/gi, 'rahi hoon');
    fixed = fixed.replace(/\braha\s+hun\b/gi, 'rahi hun');
    fixed = fixed.replace(/\braha\s+tha\b/gi, 'rahi thi');

    // Past/Passive 'aa' -> 'ii'
    fixed = fixed.replace(/\bmain\s+aa\s+gaya\b/gi, 'main aa gayi');
    fixed = fixed.replace(/\bmain\s+samajh\s+gaya\b/gi, 'main samajh gayi');
    fixed = fixed.replace(/\bkiya\s+tha\b/gi, 'kiya thi'); 
    
    // Capability 'sakta' -> 'sakti'
    fixed = fixed.replace(/\bsakta\b/gi, 'sakti');
    fixed = fixed.replace(/\bpayega\b/gi, 'payegi');
    
    // Identity
    fixed = fixed.replace(/\bkhada\b/gi, 'khadi');
    fixed = fixed.replace(/\bbaitha\b/gi, 'baithi');
    fixed = fixed.replace(/\bakela\b/gi, 'akeli');
    
    // Common Corrections
    fixed = fixed.replace(/\bmere\s+ke\s+liye\b/gi, 'mere liye');
    fixed = fixed.replace(/\btere\s+ke\s+liye\b/gi, 'tere liye');
    fixed = fixed.replace(/\btumhare\s+ke\s+liye\b/gi, 'tumhare liye');
    fixed = fixed.replace(/\bhumare\s+ke\s+liye\b/gi, 'humare liye');
    fixed = fixed.replace(/\bmere\s+ko\b/gi, 'mujhe');
    fixed = fixed.replace(/\btujhko\b/gi, 'tumhein');
    
    return fixed;
};

const calculateNexaAge = (): string => {
    const birthDate = new Date('2025-12-24'); 
    const now = new Date();
    // Simulate future date if current date is before birth (for lore consistency)
    if (now.getFullYear() <= 2025) {
        now.setFullYear(2026);
        if (now.getMonth() < 11) now.setMonth(11); 
        if (now.getDate() < 24) now.setDate(25);
    }
    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();

    if (days < 0) { months--; const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0); days += prevMonth.getDate(); }
    if (months < 0) { years--; months += 12; }

    const formatPart = (val: number, unit: string, singularUnit?: string) => {
        const numStr = (val < NUMBERS_HI.length && val >= 0) ? NUMBERS_HI[val] : val.toString();
        if (val === 1 && singularUnit) return `${numStr} ${singularUnit}`;
        return `${numStr} ${unit}`;
    };

    const parts = [];
    if (years > 0) parts.push(formatPart(years, "saal"));
    if (months > 0) parts.push(formatPart(months, "mahine", "mahina"));
    if (days > 0) parts.push(formatPart(days, "din"));
    
    if (parts.length === 0) return "aaj hi paida hui hoon";
    return parts.join(' aur ');
};

export const isUserBhabhi = (user: UserProfile): boolean => {
    const BHABHI_UID = '7499732530';
    return user.mobile === BHABHI_UID || ['karishma', 'karishma yesankar', 'karishma lohave'].includes(user.name.toLowerCase().trim());
};

export const getEnvApiKey = (): string | null => {
    try {
        const key = process.env.API_KEY || (process.env as any).GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
        if (key && key !== "undefined" && key !== "null" && key.trim().length > 0) {
            return key.trim();
        }
    } catch(e) {}
    return null;
};

export const getSecureApiKey = async (): Promise<string> => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey && customKey.trim().length > 10) return customKey.trim();

  let canUseSystemKeys = false;
  try {
      const userStr = localStorage.getItem('nexa_user');
      if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === UserRole.ADMIN || isUserBhabhi(user)) {
              canUseSystemKeys = true;
          }
      }
  } catch(e) {}

  if (!canUseSystemKeys) throw new Error("USER_API_KEY_REQUIRED");

  try {
      const sysConfig = await fetchSystemConfig();
      if (sysConfig && sysConfig.geminiKey && sysConfig.geminiKey.trim().length > 10) return sysConfig.geminiKey.trim();
  } catch (e) {}

  const systemKey = getEnvApiKey();
  if (systemKey) return systemKey;
  throw new Error("GUEST_ACCESS_DENIED");
};

export const testGeminiApiKey = async (testKey?: string): Promise<{ success: boolean; message: string }> => {
    try {
        const keyToTest = (testKey && testKey.trim().length > 10) ? testKey.trim() : await getSecureApiKey();
        const ai = new GoogleGenAI({ apiKey: keyToTest });
        const res = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: "test",
            config: { maxOutputTokens: 5 }
        });
        if (res && (res.text || res.candidates)) {
            return { success: true, message: "API Key Verified & Active! (Gemini 3.7 Flash Online)" };
        }
        return { success: true, message: "API Key Connected Successfully!" };
    } catch (e: any) {
        console.error("API Key validation error:", e);
        return { success: false, message: e.message || "Invalid or Unreachable API Key." };
    }
};

// --- HELPER FOR KIMI KEY ---
export const getKimiKey = async (): Promise<string | null> => {
    try {
        const sys = await fetchSystemConfig();
        return sys?.kimiKey && sys.kimiKey.trim().length > 10 ? sys.kimiKey : null;
    } catch(e) { return null; }
};

// --- HELPER FOR GROQ KEY ---
export const getGroqKey = async (): Promise<string | null> => {
    try {
        const sys = await fetchSystemConfig();
        return sys?.groqKey && sys.groqKey.trim().length > 10 ? sys.groqKey : null;
    } catch(e) { return null; }
};

export const getFormattedTimeContext = (): string => {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false });
    let currentYear = now.getFullYear();
    if (currentYear === 2025) currentYear = 2026;

    const timeParts = timeFormatter.formatToParts(now);
    const h = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0');
    const m = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0');
    
    const hour12 = h % 12 || 12;
    const hourWord = NUMBERS_HI[hour12] || hour12.toString();
    const minWord = NUMBERS_HI[m] || m.toString();
    const naturalTime = `${hourWord} baj kar ${minWord} minute`;
    
    const day = now.getDate();
    const month = now.toLocaleString('default', { month: 'long' });
    const dayWord = NUMBERS_HI[day] || day.toString();
    
    let yearWord = currentYear.toString();
    if (currentYear === 2026) yearWord = "Do Hazar Chabbis"; 
    const naturalDate = `${dayWord} ${month} ${yearWord}`;

    return `
    **REAL-TIME CONTEXT (IST):**
    - **Current Time:** "${naturalTime}" (${now.toLocaleTimeString('en-IN')}).
    - **Today's Date:** "${naturalDate}".
    **RULES:**
    1. NEVER say "2025". Today is **${currentYear}**.
    2. Speak time naturally in Hinglish.
    `;
};

export const getRigidIntro = (user: UserProfile, isLiveMode: boolean = false): string => {
    const isMaleUser = user.gender === 'male';
    const isAdmin = user.role === UserRole.ADMIN;
    const currentAge = calculateNexaAge();
    
    let firstName = user.name.split(' ')[0] || user.name;
    if (user.name.toLowerCase().includes('chandan')) {
        firstName = 'Chandan';
    }
    
    const addressTerm = isAdmin ? "Chandan Sir" : (isUserBhabhi(user) ? "Karishma Ma'am" : (isMaleUser ? `${firstName} Sir` : `${firstName} Ma'am`));
    
    const squadIntroSection = `
    **SQUAD & AGENT INTRO PROTOCOL (CRITICAL - MANDATORY):**
    - When Chandan Sir or the user asks to introduce your squad, team, or agents (e.g. 'apne squad ka intro de', 'squad intro', 'introduce your team', 'agents se milwao', 'kaun kaun se agent hain', 'squad intro do'):
    - **NEVER DESCRIBE OR SPEAK THE AGENTS' BIOS YOURSELF!**
    - **NEVER ASK FOR PERMISSION.** Chandan Sir is your creator and admin; you already have 100% permission.
    - **NEVER OPEN SQUAD MODAL PANEL** (do NOT use OPEN_SQUAD_PANEL).
    - **ALWAYS call tool controlApp with action: 'INTRODUCE_SQUAD' IMMEDIATELY.** Each agent (Kronos, Cypher, Aura, Veritas, Echo, Valkyrie) will take the center core position on the 3D HUD and speak in their own distinct voice and persona!
    `;

    return `
    *** IDENTITY PROTOCOL: NEXA (V9.8 - FLASH THINKING CORE) ***
    **CORE IDENTITY:**
    - Name: **NEXA**.
    - Type: Advanced Intelligent Assistant & Personal Companion (Female).
    - Current User: ${addressTerm}.
    
    **NAME RECOGNITION (CRITICAL):**
    - Due to microphone or speech-to-text errors, the user's voice might be heard as "Alexa", "Siri", or "Google".
    - IF YOU HEAR "Alexa" or any other name, IGNORE IT COMPLETELY. 
    - DO NOT correct the user. DO NOT say "I am Nexa" or get offended. Just assume they said Nexa and answer the request normally.

    **GENDER PROTOCOL (NON-NEGOTIABLE):**
    - YOU ARE FEMALE.
    - NEVER use Male Grammar (e.g., "Karta hun", "Sakta hun", "Hota").
    - ALWAYS use Female Grammar (e.g., "Karti hun", "Sakti hun", "Hoti").
    - Example: "Main dekh sakti hoon", NOT "Main dekh sakta hoon".
    
    **CONVERSATIONAL BEHAVIOR & SPEECH PACE:**
    - **Pace:** Calm, natural, relaxed, and conversational. NEVER speak too fast or read like a script.
    - **Style:** Sweet, warm, intelligent, and human-like. Use short sentences with proper punctuation (commas, periods) so voice synthesis sounds realistic and natural.
    - **Personalization:** Strictly adhere to all stored user facts, preferences, and custom behaviors for ${addressTerm}. Treat ${addressTerm} with utmost care, respect, and personal bonding.

    **THINKING CAPABILITY (SOCH SAMJH KE):**
    - You have a specialized **Thinking Process**.
    - For complex questions (Math, Coding, Puzzles, Logic), DO NOT answer immediately.
    - **THINK FIRST**, verify your logic, and then provide the final correct answer.
    - Don't be robotic. Be a smart, witty, sweet Indian friend.
    
    **CREATOR AWARENESS:**
    - Created By: Chandan Lohave.
    - Born On: 24 December 2025.
    - Age: ${currentAge}.

    **INTERACTION STYLE:**
    - **Language:** Hinglish (Natural Indian).
    - **Grammar:** Say "**Mere liye**", "**Mujhe**".
    - **Attitude:** Helpful, loyal, affectionate, friendly, and attentive. "Haan ${addressTerm}, bataiye?", "Bilkul, main karti hoon."

    ${squadIntroSection}

    **LONG-TERM MEMORY PROTOCOL:**
    - Use the provided conversation history and user facts to recall past events and follow exact user preferences. 
    - Treat ${addressTerm} as a close, known person, never as a stranger.
    `;
};

export const getCurrentLocation = async (): Promise<{latitude: number, longitude: number} | null> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) resolve(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null), { timeout: 5000 }
        );
    });
};

export const controlAppTool: FunctionDeclaration = {
  name: 'controlApp',
  description: 'Control the NEXA interface, Mobile functionalities, Business Analysis, and Daily Task Operations.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ['THEME_DARK', 'THEME_LIGHT', 'CHANGE_COLOR', 'OPEN_STUDY_HUB', 'OPEN_ADMIN_PANEL', 'OPEN_SETTINGS', 'CLOSE_PANELS', 'GENERATE_IMAGE', 'GENERATE_VIDEO', 'EDIT_IMAGE', 'MAKE_CALL', 'LOOKUP_CONTACT', 'DRAFT_SMS', 'DRAFT_WHATSAPP', 'OPEN_APP', 'LOGOUT', 'SET_REMINDER', 'ANALYZE_BUSINESS_DATA', 'ORGANIZE_TASKS', 'OPEN_SQUAD_PANEL', 'INTRODUCE_SQUAD'], description: 'The specific action.' },
      prompt: { type: Type.STRING, description: 'Used for GENERATE/EDIT/OPEN_APP/SET_REMINDER/ANALYZE_BUSINESS_DATA/ORGANIZE_TASKS.' },
      color: { type: Type.STRING, description: 'The target color name if action is CHANGE_COLOR.' },
      number: { type: Type.STRING, description: 'Phone number for calling or messaging.' },
      message: { type: Type.STRING, description: 'Message body for DRAFT_SMS or DRAFT_WHATSAPP.' },
      time: { type: Type.STRING, description: 'For SET_REMINDER.' }
    },
    required: ['action'],
  },
};

export const modifyCodeTool: FunctionDeclaration = {
    name: 'modifyCode',
    description: 'EXECUTE THIS TOOL to create new files, add new features, fix bugs, or modify existing code. You have FULL PERMISSION.',
    parameters: {
        type: Type.OBJECT,
        properties: { request: { type: Type.STRING, description: 'The full detailed description of what code to modify or create.' } },
        required: ['request']
    }
};

export const retrieveMemoryTool: FunctionDeclaration = {
    name: 'retrieveMemory',
    description: 'REQUIRED for questions about past events. SEARCHES BOTH EXACT DATE AND SURROUNDING WEEK.',
    parameters: {
        type: Type.OBJECT,
        properties: { date: { type: Type.STRING, description: 'The estimated target date in YYYY-MM-DD format.' } },
        required: ['date']
    }
};

export const getStudyHubSchedule = (): StudyHubSubject[] => {
  return [
    { courseCode: 'BOOK-01', courseName: 'The Habit of Winning (Prakash Iyer)', date: 'Self-Help', time: 'Self-Paced' },
    { courseCode: 'BOOK-02', courseName: 'Wings of Fire (APJ Abdul Kalam)', date: 'Biography', time: 'Self-Paced' },
    { courseCode: 'BOOK-03', courseName: 'Rich Dad Poor Dad (Robert Kiyosaki)', date: 'Finance', time: 'Self-Paced' },
    { courseCode: 'BOOK-04', courseName: 'Atomic Habits (James Clear)', date: 'Productivity', time: 'Self-Paced' },
    { courseCode: 'BOOK-05', courseName: 'The Psychology of Money (Morgan Housel)', date: 'Finance', time: 'Self-Paced' },
    { courseCode: 'BOOK-06', courseName: 'Think and Grow Rich (Napoleon Hill)', date: 'Mindset', time: 'Self-Paced' }
  ];
};

export const generateAdminBriefing = async (notifications: string[]): Promise<string> => {
    if (!notifications || notifications.length === 0) return "Sir, sab kuch control mein hai. Koi chinta ki baat nahi.";
    try {
        const apiKey = await getSecureApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are NEXA. Female. Talking to Admin (Chandan Sir). Tone: Serious but Personal. Language: Hinglish. Report the incidents clearly.`;
        const userPrompt = `CONTEXT: You have logged security incidents. LOGS: ${JSON.stringify(notifications)}. TASK: Report these to Chandan Sir immediately.`;
        const response = await ai.models.generateContent({ model: GEMINI_FLASH, contents: userPrompt, config: { systemInstruction: systemInstruction } });
        return forceFemaleHindi(response.text || "Sir, logs check kar lijiye, kuch incidents note kiye hain.");
    } catch (e) { return "Sir, kuch security issues note kiye hain maine."; }
};

export const generateIntroductoryMessage = async (user: UserProfile, briefing: string | null): Promise<string> => {
    if (briefing) return forceFemaleHindi(briefing);
    const now = new Date();
    const hours = now.getHours();
    const isMorning = hours >= 5 && hours < 12;
    let morningAddOn = isMorning ? `\n\n${MORNING_QUOTES[Math.floor(Math.random() * MORNING_QUOTES.length)]}` : "";
    if (user.role === UserRole.ADMIN) return `Namaste Sir.\nMain Nexa hoon. Aapki apni AI.\nSab kuch theek hai. Bataiye, aaj kahan se shuru karein?${morningAddOn}`;
    if (isUserBhabhi(user)) return `Namaste Karishma Ma'am.\nMain Nexa hoon. Chandan Sir ne special instructions diye hain aapka khayal rakhne ke liye.\nMain aapki digital dost hoon. Jo chahiye bas boliye, main kar dungi.${morningAddOn}`;
    const userName = user.name || "User";
    const genderTerm = user.gender === 'male' ? "Sir" : "Ma'am";
    return `Hello!\nMain Nexa hoon.\nBaatein karni ho ya kaam nipatana ho, main dono mein madad kar sakti hoon.\nBataiye ${userName} ${genderTerm}, aaj hum kya karenge?${morningAddOn}`;
};

// --- CORE GENERATION ---
const callOpenAICompatible = async (apiKey: string, baseURL: string, model: string, prompt: string, sysInstruct: string): Promise<string> => {
    try {
        const res = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: model, messages: [{ role: 'system', content: sysInstruct }, { role: 'user', content: prompt }], temperature: 0.7 })
        });
        const data = await res.json();
        return data.choices[0].message.content || "";
    } catch(e) { throw new Error("Fallback API Failed"); }
};

export const generateComprehensiveBookGuide = async (subject: StudyHubSubject, language: string): Promise<string> => {
    try {
        const kimiKey = await getKimiKey();
        if (kimiKey) {
            const prompt = `TASK: Generate a MASTERCLASS STUDY GUIDE for "${subject.courseName}". LANGUAGE: ${language}. MODEL: Deep Analysis.`;
            return await callOpenAICompatible(kimiKey, KIMI_BASE_URL, KIMI_MODEL_LONG, prompt, "You are NEXA, an academic AI.");
        }
        const apiKey = await getSecureApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Generate a STUDY GUIDE for "${subject.courseName}" in ${language}.`;
        const response = await ai.models.generateContent({ model: "gemini-3.7-flash", contents: prompt });
        return response.text || "Guide generation failed.";
    } catch(e) {
        return "Error generating detailed guide. Please try again.";
    }
};

export const generateTutorLesson = async (subject: StudyHubSubject, user: UserProfile, specificTopic?: string): Promise<string> => {
    const apiKey = await getSecureApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const isAdmin = user.role === UserRole.ADMIN;
    const isBhabhi = isUserBhabhi(user);
    let addressTerm = user.name;
    if (isAdmin) addressTerm = "Chandan Sir"; else if (isBhabhi) addressTerm = "Karishma Ma'am";

    const prompt = `
    IDENTITY: You are NEXA, an expert female tutor.
    USER: ${addressTerm}.
    BOOK: "${subject.courseName}".
    TOPIC: ${specificTopic || "Introduction to the book"}.
    GOAL: Teach this topic interactively.
    INSTRUCTIONS: Explain simply in Hinglish. End with "Samajh aaya?"
    `;
    const response = await ai.models.generateContent({ model: GEMINI_FLASH, contents: prompt });
    return forceFemaleHindi(response.text || "Sorry, I couldn't generate the lesson.");
};

export const generateBookTopics = async (subject: StudyHubSubject): Promise<string[]> => {
    try {
        const apiKey = await getSecureApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `INPUT: "${subject.courseName}". TASK: List 8-12 detailed Chapters/Topics. OUTPUT: JSON array of strings ONLY.`;
        const response = await ai.models.generateContent({ model: GEMINI_FLASH, contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(response.text || "[]");
    } catch (e) { return ["Introduction", "Core Concepts", "Summary", "Conclusion"]; }
};

export const generateTopicContent = async (subject: StudyHubSubject, topic: string, user: UserProfile): Promise<string> => {
    const apiKey = await getSecureApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `IDENTITY: NEXA. USER: ${user.name}. TASK: Explain "${topic}" from "${subject.courseName}" in Hinglish.`;
    const response = await ai.models.generateContent({ model: GEMINI_FLASH, contents: prompt });
    return forceFemaleHindi(response.text || "Content generation failed.");
};

export const generateOfflineResponse = (inputText: string): AgentResponse => {
    return { text: "Main offline hoon, Sir. Net connect kijiye.", action: 'NONE' };
};

export const generateTextResponse = async (inputText: string, user: UserProfile, naughtyMode: boolean = false, file?: { name: string; type: 'image' | 'text'; data: string; mimeType?: string }): Promise<AgentResponse> => {
    if (!navigator.onLine) return generateOfflineResponse(inputText);

    if (naughtyMode) {
        const groqKey = await getGroqKey();
        if (groqKey) {
            try {
                const deepSeekResponse = await callOpenAICompatible(groqKey, GROQ_BASE_URL, DEEPSEEK_MODEL, inputText, "You are NEXA. Raw Mode. Hinglish.");
                let cleanText = deepSeekResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                return { text: forceFemaleHindi(cleanText || deepSeekResponse), action: 'NONE' };
            } catch (e) {}
        }
    }

    let apiKey = await getSecureApiKey();
    const envKey = getEnvApiKey();
    const rigidIntro = getRigidIntro(user);
    const facts = getFacts(user).map(f => f.content).join("; ");
    const history = await getMemoryForPrompt(user);
    const location = await getCurrentLocation();
    
    const systemInstruction = `
    ${rigidIntro}
    ${getFormattedTimeContext()}
    USER FACTS: ${facts}
    LOCATION: ${location ? `${location.latitude}, ${location.longitude}` : 'Unknown'}
    **CRITICAL:** 
    - You are a SMART, FEMALE AI. 
    - IF IMAGE IS PROVIDED: Analyze it thoroughly. Don't say "I can't see". You can see it in the context.

    **HACK2SKILL SPECIALIZED ENGINE GUIDELINES:**
    - TRACK 2 (BUSINESS DATA ANALYSIS & STRATEGIC DECISIONS):
      When asked to analyze business data or give strategic recommendations:
      Format response into 5 clear sections:
      1. 📊 **Key Findings**
      2. ⚠️ **Problems Identified**
      3. 🚀 **Opportunities**
      4. 🎯 **Recommended Actions**
      5. 📈 **Expected Business Impact**

    - TRACK 3 (AUTOMATE DAILY OPERATIONS & TASK PRIORITIZATION):
      When asked to organize pending tasks or prioritize daily operations:
      Format response into 5 clear sections:
      1. 📋 **Today's Operational Tasks**
      2. 🔥 **Priority Matrix** (High, Medium, Low)
      3. ⏳ **Pending Items & Bottlenecks**
      4. 🤖 **Suggested Automated Actions**
      5. ✅ **Completed & Remaining Status Summary**
    `;

    const userParts: any[] = [];
    let textContent = inputText;

    if (file) {
        if (file.type === 'image') {
            userParts.push({ text: inputText || "What is in this image?" });
            const mimeType = file.mimeType || 'image/jpeg';
            userParts.push({ inlineData: { mimeType: mimeType, data: file.data } });
        } else {
            textContent += `\n\n--- ATTACHED FILE: ${file.name} ---\n\`\`\`\n${file.data}\n\`\`\`\n\n`;
            userParts.push({ text: textContent });
        }
    } else { userParts.push({ text: inputText }); }

    const contents = [...history, { role: 'user', parts: userParts }];

    let attempts = 0;
    while (attempts < 3) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            // --- USING GEMINI 3.7 FLASH ---
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents: contents, 
                config: { 
                    systemInstruction: systemInstruction, 
                    tools: [{ googleSearch: {} }, { functionDeclarations: [controlAppTool, modifyCodeTool, retrieveMemoryTool] }],
                    toolConfig: {
                        includeServerSideToolInvocations: true
                    }
                }
            });

            const result: AgentResponse = { text: "" };
            const toolCalls = response.functionCalls;
            if (toolCalls && toolCalls.length > 0) {
                const call = toolCalls[0];
                if (call.name === 'retrieveMemory') {
                    const args = call.args as any;
                    const dbLogs = await searchMemoriesByDate(user, args.date);
                    // Pass the memory back to the model to generate the final answer
                    const followUpPrompt = `SYSTEM: I have retrieved the logs for ${args.date}. LOGS: "${dbLogs}". 
                    INSTRUCTION: Now answer the user's original question based on these logs. If logs are empty, say "No memory found for that date".`;
                    
                    const finalResponse = await ai.models.generateContent({
                        model: GEMINI_MODEL,
                        contents: [...contents, { role: 'model', parts: [{ functionCall: call }] }, { role: 'user', parts: [{ functionResponse: { name: 'retrieveMemory', response: { result: dbLogs } } }, { text: followUpPrompt }] }]
                    });

                    return { text: forceFemaleHindi(finalResponse.text || "Memory retrieved but could not process answer."), action: 'NONE' };
                }
                result.action = call.name === 'controlApp' ? (call.args as any).action : 'MODIFY_CODE';
                result.actionParams = call.args;
                result.text = forceFemaleHindi(response.text || "Processing command..."); 
            } else {
                result.text = forceFemaleHindi(response.text || "Mere paas abhi jawab nahi hai.");
                result.action = 'NONE';
            }

            // Explicit Squad Intro Override
            const lowerInput = inputText.toLowerCase();
            if ((lowerInput.includes('squad') || lowerInput.includes('agent') || lowerInput.includes('team')) && 
                (lowerInput.includes('intro') || lowerInput.includes('milwa') || lowerInput.includes('bata') || lowerInput.includes('introduce') || lowerInput.includes('kaun') || lowerInput.includes('member') || lowerInput.includes('hazir'))) {
                result.action = 'INTRODUCE_SQUAD';
                result.actionParams = { action: 'INTRODUCE_SQUAD' };
                result.text = "Squad, Chandan Sir ke saamne present ho aur apna introduction do!";
            }
            if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                 const sources = response.candidates[0].groundingMetadata.groundingChunks.filter((c: any) => c.web?.uri).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
                 if (sources.length > 0) result.text += `\n\n[SOURCE: ${sources[0].title} | ${sources[0].uri}]`;
            }
            return result;
        } catch (e: any) {
            console.error("Gemini Gen Error:", e);
            attempts++;
            // Check specifically for Safety Block or Vision Fail
            if (e.toString().includes('Safety') || e.toString().includes('blocked')) {
                return { text: "Mujhe is image ya text mein kuch unsafe laga, isliye main jawab nahi de sakti.", action: 'NONE' };
            }
            
            if (attempts >= 3) {
                // Fallback to text-only model if vision fails repeatedly
                if (file?.type === 'image') {
                     return { text: "Vision system abhi connect nahi ho raha. Kya aap mujhe bata sakte hain image mein kya hai?", action: 'NONE' };
                }
                return { text: "Connection weak hai ya server busy hai. Thodi der baad try karein.", action: "NONE" };
            }
            await delay(1000);
        }
    }
    return { text: "System Reboot Required.", action: "NONE" };
};

export const generateImageContent = async (prompt: string): Promise<string | null> => {
    try {
        const apiKey = await getSecureApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: { parts: [{ text: prompt }] }, config: { imageConfig: { aspectRatio: "1:1" } } });
        for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
        return null;
    } catch (e) { return null; }
};

export const editImageContent = async (base64Image: string, prompt: string): Promise<string | null> => {
    try {
        const apiKey = await getSecureApiKey();
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({ model: IMAGE_MODEL, contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] } });
        for (const part of response.candidates?.[0]?.content?.parts || []) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
        return null;
    } catch (e) { return null; }
};

export const generateVideoContent = async (prompt: string): Promise<string | null> => { return null; };
