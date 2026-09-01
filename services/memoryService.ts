
import { UserProfile, UserRole, ChatMessage, StudyHubSubject, UserFact, AccessKeyDefinition } from '../types';
import { db, storage } from './firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, orderBy, limit, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI } from "@google/genai";

// New Folder Structure Logic
const ADMIN_ROOT = 'NEXA_ADMIN_DATA';
const USER_ROOT_PREFIX = 'NEXA_USER_DATA_';

// --- FAMILY TREE DATABASE STRUCTURE (ABSOLUTE TRUTH) ---
export const FAMILY_TREE = {
    creator_father: "Chandan Lohave (Admin)",
    mother: "Darshana Lohave",
    bhabhi: "Karishma Yesankar",
    sister: "Achal Lohave",
    younger_sister: "Ashwini Ramteke (Ashu)",
    brother: "Nayan Ramteke (Nanu)",
    maavshi: "Archana Ramteke",
    kakaji: "Pradip Ramteke",
    security_level: "FIREWALL_LEVEL_8",
    encryption: "AES-256"
};

// --- HELPER TO GET STORAGE KEY ---
const getStorageKey = (user: UserProfile, type: string) => {
    if (user.role === UserRole.ADMIN) {
        return `${ADMIN_ROOT}_${type}`;
    }
    return `${USER_ROOT_PREFIX}${user.mobile}_${type}`;
};

// --- HELPER: SYSTEM ACCESS ---
const checkApiKey = () => {
  const sessionKey = localStorage.getItem('nexa_client_api_key');
  if (sessionKey && sessionKey.trim().length > 10) return sessionKey;
  
  try {
      const userStr = localStorage.getItem('nexa_user');
      if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'USER') {
               throw new Error("USER_API_KEY_REQUIRED");
          }
      }
  } catch(e: any) {
      if(e.message === "USER_API_KEY_REQUIRED") throw e;
  }
  
  const systemKey = process.env.API_KEY;
  if (systemKey && systemKey !== "undefined" && systemKey.trim() !== '') return systemKey;
  
  return null;
};

// --- HELPER: CLEAN DATE FORMATTING ---
const formatStdDate = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// --- HELPER: READABLE DOCUMENT IDs ---
const generateReadableId = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}_${ms}`;
};

// --- DEEP SMART MEMORY SEARCH (FAIL-PROOF) ---
// This function queries the DB for a specific date, AND expands range if needed.
export const searchMemoriesByDate = async (user: UserProfile, dateString: string): Promise<string> => {
    try {
        const targetDate = new Date(dateString);
        if (isNaN(targetDate.getTime())) return "INVALID DATE FORMAT";

        const chatsRef = collection(db, "users", user.mobile, "chats");

        // Helper to run query
        const runQuery = async (start: Date, end: Date) => {
            const q = query(
                chatsRef, 
                where("timestamp", ">=", start.getTime()),
                where("timestamp", "<=", end.getTime()),
                orderBy("timestamp", "asc")
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data() as ChatMessage;
                const dateStr = new Date(data.timestamp).toLocaleString();
                return `[${dateStr}] ${data.role.toUpperCase()}: ${data.text}`;
            });
        };

        // 1. First Attempt: Exact Date (00:00 to 23:59)
        const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);
        
        let logs = await runQuery(startOfDay, endOfDay);

        // 2. Fail-Safe: If no logs found, expand to +/- 7 DAYS (Smart Expand)
        if (logs.length === 0) {
            const startWeek = new Date(startOfDay); 
            startWeek.setDate(startWeek.getDate() - 7);
            
            const endWeek = new Date(endOfDay);
            endWeek.setDate(endWeek.getDate() + 7);
            
            logs = await runQuery(startWeek, endWeek);
            
            if (logs.length > 0) {
                return `NOTE: No data found exactly on ${dateString}. Showing data from surrounding week (${startWeek.toLocaleDateString()} - ${endWeek.toLocaleDateString()}):\n\n${logs.join("\n")}`;
            }
        } else {
             return logs.join("\n");
        }

        return "No records found for this date or the surrounding week. Memory is empty for this period.";

    } catch (e) {
        console.error("Memory Retrieval Error:", e);
        return "Error accessing memory banks. Please check connection.";
    }
};

// --- FAMILY TREE SYNC ---
export const syncFamilyTree = async () => {
    try {
        await setDoc(doc(db, "system", "family_tree"), {
            ...FAMILY_TREE,
            lastSynced: serverTimestamp(),
            syncedDate: formatStdDate(new Date())
        }, { merge: true });
    } catch (e) {
        // Silent fail
    }
};

// --- SYSTEM CONFIG SYNC (KEYS & TOKENS) ---
export const saveSystemConfig = async (config: { geminiKey?: string, ghToken?: string, ghRepo?: string, adminPin?: string, accessKey?: string, openaiKey?: string, kimiKey?: string, groqKey?: string }) => {
    // 1. Immediately store in localStorage/sessionStorage for instant zero-latency access
    if (config.geminiKey !== undefined) {
        const cleanKey = config.geminiKey.trim();
        if (cleanKey) {
            localStorage.setItem('nexa_client_api_key', cleanKey);
        } else {
            localStorage.removeItem('nexa_client_api_key');
        }
    }
    
    if (config.ghToken !== undefined) {
        const cleanToken = config.ghToken.trim();
        if (cleanToken) sessionStorage.setItem('NEXA_GH_TOKEN', cleanToken);
        else sessionStorage.removeItem('NEXA_GH_TOKEN');
    }
    if (config.ghRepo !== undefined) {
        const cleanRepo = config.ghRepo.trim();
        if (cleanRepo) sessionStorage.setItem('NEXA_GH_REPO', cleanRepo);
        else sessionStorage.removeItem('NEXA_GH_REPO');
    }

    // 2. Persist to Firestore DB with merge
    try {
        await setDoc(doc(db, "system", "config"), {
            ...config,
            updatedAt: serverTimestamp(),
            lastUpdated: formatStdDate(new Date())
        }, { merge: true });
        
        syncFamilyTree();
    } catch (e) {
        console.warn("Notice: Failed to write system config to Firestore (using local persistence):", e);
    }
};

export const fetchSystemConfig = async () => {
    try {
        syncFamilyTree();

        const docRef = doc(db, "system", "config");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (data.geminiKey && data.geminiKey.trim()) {
                localStorage.setItem('nexa_client_api_key', data.geminiKey.trim());
            }
            if (data.ghToken && data.ghToken.trim()) sessionStorage.setItem('NEXA_GH_TOKEN', data.ghToken.trim());
            if (data.ghRepo && data.ghRepo.trim()) sessionStorage.setItem('NEXA_GH_REPO', data.ghRepo.trim());
            
            return data;
        }
    } catch (e) {
        // Fallback to locally stored key
    }

    const localKey = localStorage.getItem('nexa_client_api_key');
    if (localKey) {
        return { geminiKey: localKey };
    }
    return null;
};

// --- ACCESS KEY MANAGEMENT ---
export const createCustomAccessKey = async (key: string, assignedMobile?: string) => {
    if (!key || !key.trim()) return false;
    try {
        await setDoc(doc(db, "access_keys", key.trim()), {
            key: key.trim(),
            assignedMobile: assignedMobile || null,
            createdBy: "Admin",
            createdAt: serverTimestamp(),
            createdDate: formatStdDate(new Date())
        });
        return true;
    } catch (e) {
        return false;
    }
};

export const getAccessKeys = async (): Promise<AccessKeyDefinition[]> => {
    try {
        const snapshot = await getDocs(collection(db, "access_keys"));
        return snapshot.docs.map(doc => doc.data() as AccessKeyDefinition);
    } catch (e) {
        return [];
    }
};

export const deleteAccessKey = async (key: string) => {
    if (!key || !key.trim()) return false;
    try {
        await deleteDoc(doc(db, "access_keys", key.trim()));
        return true;
    } catch (e) {
        return false;
    }
};

// --- SECURE MASTER ACCESS VERIFICATION ---
export const verifyMasterAccessKey = async (inputKey: string, userMobile?: string): Promise<boolean> => {
    if (!inputKey || !inputKey.trim()) return false;
    try {
        const sys = await fetchSystemConfig();
        const validMasterKey = (sys?.accessKey && sys.accessKey.length > 0) ? sys.accessKey : 'NEXA2025';
        if (inputKey === validMasterKey) return true;
    } catch (e) {
        if (inputKey === 'NEXA2025') return true;
    }

    try {
        const docRef = doc(db, "access_keys", inputKey.trim());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data() as AccessKeyDefinition;
            if (data.assignedMobile && data.assignedMobile.length > 0) {
                if (!userMobile) return false;
                return data.assignedMobile === userMobile;
            } else {
                if (userMobile) {
                    await setDoc(docRef, { assignedMobile: userMobile }, { merge: true });
                    return true;
                }
                return true;
            }
        }
    } catch (e) {
        console.error("Error verifying custom access key", e);
    }

    return false;
};

export const verifyAdminPassword = async (input: string): Promise<boolean> => {
    try {
        const sys = await fetchSystemConfig();
        if (sys && sys.adminPin && sys.adminPin.length > 0) {
             return input === sys.adminPin;
        }
    } catch (e) {
        // Silent
    }
    const normalized = input.trim();
    return normalized === 'NEXA' || normalized === 'Nexa' || normalized === '2127 Admin' || normalized === '2127'; 
}

// --- User Profile ---
export const syncUserProfile = async (user: UserProfile): Promise<void> => {
    localStorage.setItem(getStorageKey(user, 'profile'), JSON.stringify(user));

    if (user.role === UserRole.USER) {
        try {
            const registryData = localStorage.getItem('NEXA_GLOBAL_USER_REGISTRY');
            const registry = registryData ? JSON.parse(registryData) : [];
            if (!registry.includes(user.mobile)) {
                registry.push(user.mobile);
                localStorage.setItem('NEXA_GLOBAL_USER_REGISTRY', JSON.stringify(registry));
            }
        } catch (e) {
            localStorage.setItem('NEXA_GLOBAL_USER_REGISTRY', JSON.stringify([user.mobile]));
        }
    }

    try {
        const userPayload = {
            ...user,
            lastLogin: serverTimestamp(),
            lastLoginDate: formatStdDate(new Date()),
            updatedAt: serverTimestamp()
        };
        Object.keys(userPayload).forEach(key => (userPayload as any)[key] === undefined && delete (userPayload as any)[key]);

        await setDoc(doc(db, "users", user.mobile), userPayload, { merge: true });
    } catch (e) {
        // Silent
    }
};

export const getUserProfile = async (mobile: string): Promise<UserProfile | null> => {
    try {
        const docRef = doc(db, "users", mobile);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            localStorage.setItem(`${USER_ROOT_PREFIX}${mobile}_profile`, JSON.stringify(userData));
            return userData;
        }
    } catch (e) {}
    try {
        const data = localStorage.getItem(`${USER_ROOT_PREFIX}${mobile}_profile`);
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
};

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => { users.push(doc.data() as UserProfile); });
        return users;
    } catch (e) { return []; }
};

export const getUserSchedule = async (userId: string): Promise<StudyHubSubject[]> => {
    const data = localStorage.getItem(`${USER_ROOT_PREFIX}${userId}_schedule`);
    return data ? JSON.parse(data) : [];
};

export const saveUserSchedule = async (userId: string, subjects: StudyHubSubject[]): Promise<void> => {
    localStorage.setItem(`${USER_ROOT_PREFIX}${userId}_schedule`, JSON.stringify(subjects));
};

export const getFacts = (user: UserProfile): UserFact[] => {
    const key = getStorageKey(user, 'facts');
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
};

export const saveFacts = (user: UserProfile, facts: UserFact[]) => {
    const key = getStorageKey(user, 'facts');
    localStorage.setItem(key, JSON.stringify(facts));
};

export const deleteFact = (user: UserProfile, factId: string) => {
    const facts = getFacts(user);
    const updated = facts.filter(f => f.id !== factId);
    saveFacts(user, updated);
};

export const getLocalMessages = (user: UserProfile): ChatMessage[] => {
    const key = getStorageKey(user, 'history');
    try {
        const data = localStorage.getItem(key);
        if (!data) return [];
        const parsedData = JSON.parse(data);
        return Array.isArray(parsedData) ? parsedData : [];
    } catch (e) { return []; }
};

export const syncMemoryWithCloud = async (user: UserProfile): Promise<ChatMessage[]> => {
    if (!navigator.onLine) {
        return getLocalMessages(user);
    }
    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
        try {
            const chatsRef = collection(db, "users", user.mobile, "chats");
            // --- CRITICAL UPDATE: INCREASED LIMIT TO 5000 FOR "INFINITE" MEMORY ---
            // This ensures NEXA retrieves chats from months/years ago.
            const q = query(chatsRef, orderBy("timestamp", "desc"), limit(5000));
            const querySnapshot = await getDocs(q);
            const messages: ChatMessage[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if(data.text && data.role) {
                    const msg = data as ChatMessage;
                    messages.push(msg);
                }
            });
            const sortedMessages = messages.reverse();
            if (sortedMessages.length > 0) {
                const key = getStorageKey(user, 'history');
                localStorage.setItem(key, JSON.stringify(sortedMessages));
                return sortedMessages;
            } else {
                 const local = getLocalMessages(user);
                 if (local.length > 0) {
                     for (const msg of local) { await appendMessageToMemory(user, msg); }
                     return local;
                 }
                 return [];
            }
        } catch (e) {
            retries++;
            if (retries > maxRetries) break;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return getLocalMessages(user);
};

export const restoreMemoryFromCloud = syncMemoryWithCloud;

export const appendMessageToMemory = async (user: UserProfile, message: ChatMessage): Promise<void> => {
    const key = getStorageKey(user, 'history');
    const currentMessages = getLocalMessages(user);
    currentMessages.push(message);
    try {
        localStorage.setItem(key, JSON.stringify(currentMessages));
    } catch (e) { console.warn("Local storage limit reached", e); }

    if (!navigator.onLine) return;

    try {
        const readableId = generateReadableId();
        const docRef = doc(db, "users", user.mobile, "chats", readableId);
        
        let cloudMessage = { ...message };

        if (cloudMessage.image && cloudMessage.image.length > 1000 && cloudMessage.image.startsWith('data:image')) {
            try {
                const imageRef = ref(storage, `users/${user.mobile}/chat_media/${readableId}_img`);
                await uploadString(imageRef, cloudMessage.image, 'data_url');
                const downloadURL = await getDownloadURL(imageRef);
                cloudMessage.image = downloadURL;
            } catch (storageError) {
                delete cloudMessage.image;
            }
        }
        
        const sanitizeForFirestore = (obj: any): any => {
            if (typeof obj !== 'object' || obj === null) return obj;
            if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
            return Object.fromEntries(
                Object.entries(obj)
                    .filter(([_, v]) => v !== undefined)
                    .map(([k, v]) => [k, sanitizeForFirestore(v)])
            );
        };
        
        const sanitizedMessage = sanitizeForFirestore(cloudMessage);

        await setDoc(docRef, {
            ...sanitizedMessage,
            timestamp: message.timestamp, 
            dateTime: formatStdDate(new Date(message.timestamp)), 
            serverTime: serverTimestamp() 
        });

    } catch (error) { console.error("FATAL: Memory Save Error", error); }
};

export const getMemoryForPrompt = async (user: UserProfile): Promise<{role: 'user' | 'model', parts: {text: string}[]}[]> => {
    // This now fetches up to 5000 messages via syncMemoryWithCloud
    let history = await syncMemoryWithCloud(user);
    return history.map(msg => {
        let content = msg.text || "";
        if (msg.image) content += " [VISUAL CONTEXT: User sent an image in previous message. I can see it in memory.]";
        if (msg.video) content += " [VIDEO CONTEXT: User generated/sent a video.]";
        return {
            role: msg.role,
            parts: [{ text: content }]
        };
    });
};

export const clearAllMemory = async (user: UserProfile) => {
    localStorage.removeItem(getStorageKey(user, 'history'));
    localStorage.removeItem(getStorageKey(user, 'facts'));
    try {
         const chatsRef = collection(db, "users", user.mobile, "chats");
         const snapshot = await getDocs(chatsRef);
         snapshot.forEach(doc => deleteDoc(doc.ref));
    } catch(e) {}
};

export const getAdminNotifications = async (): Promise<string[]> => {
    const stored = localStorage.getItem(`${ADMIN_ROOT}_notifications`);
    return stored ? JSON.parse(stored) : [];
};

export const logAdminNotification = (text: string) => {
    const current = localStorage.getItem(`${ADMIN_ROOT}_notifications`);
    const list = current ? JSON.parse(current) : [];
    list.push(text);
    localStorage.setItem(`${ADMIN_ROOT}_notifications`, JSON.stringify(list));
};

export const clearAdminNotifications = () => {
    localStorage.removeItem(`${ADMIN_ROOT}_notifications`);
};
