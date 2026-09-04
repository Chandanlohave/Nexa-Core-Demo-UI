
import { UserProfile, UserRole, ChatMessage, StudyHubSubject, UserFact, AccessKeyDefinition } from '../types';
import { db, storage } from './firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, orderBy, limit, serverTimestamp, Timestamp, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI } from "@google/genai";

// New Folder Structure Logic
const ADMIN_ROOT = 'NEXA_ADMIN_DATA';
const USER_ROOT_PREFIX = 'NEXA_USER_DATA_';

// --- FAMILY TREE DATABASE STRUCTURE (ABSOLUTE TRUTH) ---
export const FAMILY_TREE = {
    creator: "Chandan Lohave (Admin)",
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
        });
    } catch (e) {
        // Silent fail
    }
};

// --- SYSTEM CONFIG SYNC (KEYS & TOKENS) ---
export const saveSystemConfig = async (config: { 
    geminiKey?: string, 
    ghToken?: string, 
    ghRepo?: string, 
    adminPin?: string, 
    accessKey?: string, 
    openaiKey?: string, 
    kimiKey?: string, 
    groqKey?: string 
}) => {
    const cleanConfig: Record<string, string> = {};

    // 1. Immediately store in localStorage & sessionStorage for instantaneous zero-latency access
    if (config.geminiKey !== undefined) {
        const cleanKey = config.geminiKey.trim();
        cleanConfig.geminiKey = cleanKey;
        if (cleanKey) {
            localStorage.setItem('nexa_client_api_key', cleanKey);
        } else {
            localStorage.removeItem('nexa_client_api_key');
        }
    }
    
    if (config.ghToken !== undefined) {
        const cleanToken = config.ghToken.trim();
        cleanConfig.ghToken = cleanToken;
        if (cleanToken) {
            localStorage.setItem('NEXA_GH_TOKEN', cleanToken);
            sessionStorage.setItem('NEXA_GH_TOKEN', cleanToken);
        } else {
            localStorage.removeItem('NEXA_GH_TOKEN');
            sessionStorage.removeItem('NEXA_GH_TOKEN');
        }
    }

    if (config.ghRepo !== undefined) {
        let cleanRepo = config.ghRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '').replace(/\.git$/, '');
        cleanConfig.ghRepo = cleanRepo;
        if (cleanRepo) {
            localStorage.setItem('NEXA_GH_REPO', cleanRepo);
            sessionStorage.setItem('NEXA_GH_REPO', cleanRepo);
        } else {
            localStorage.removeItem('NEXA_GH_REPO');
            sessionStorage.removeItem('NEXA_GH_REPO');
        }
    }

    if (config.adminPin !== undefined) {
        const pin = config.adminPin.trim();
        cleanConfig.adminPin = pin;
        if (pin) localStorage.setItem('nexa_admin_pin', pin);
        else localStorage.removeItem('nexa_admin_pin');
    }

    if (config.accessKey !== undefined) {
        const accKey = config.accessKey.trim();
        cleanConfig.accessKey = accKey;
        if (accKey) localStorage.setItem('nexa_access_key', accKey);
        else localStorage.removeItem('nexa_access_key');
    }

    if (config.openaiKey !== undefined) cleanConfig.openaiKey = config.openaiKey.trim();
    if (config.kimiKey !== undefined) cleanConfig.kimiKey = config.kimiKey.trim();
    if (config.groqKey !== undefined) cleanConfig.groqKey = config.groqKey.trim();

    // 2. Persist to Firestore DB with merge
    try {
        await setDoc(doc(db, "system", "config"), {
            ...cleanConfig,
            updatedAt: serverTimestamp(),
            lastUpdated: formatStdDate(new Date())
        }, { merge: true });
        
        syncFamilyTree();
        return { success: true };
    } catch (e: any) {
        console.warn("Notice: Firestore write warning (local persistence active):", e);
        return { success: true, warning: e?.message };
    }
};

export const fetchSystemConfig = async () => {
    try {
        syncFamilyTree();

        const docRef = doc(db, "system", "config");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (typeof window !== 'undefined') {
                if (data.geminiKey && data.geminiKey.trim()) {
                    localStorage.setItem('nexa_client_api_key', data.geminiKey.trim());
                }
                if (data.ghToken && data.ghToken.trim()) {
                    localStorage.setItem('NEXA_GH_TOKEN', data.ghToken.trim());
                    sessionStorage.setItem('NEXA_GH_TOKEN', data.ghToken.trim());
                }
                if (data.ghRepo && data.ghRepo.trim()) {
                    const cleanRepo = data.ghRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '').replace(/\.git$/, '');
                    localStorage.setItem('NEXA_GH_REPO', cleanRepo);
                    sessionStorage.setItem('NEXA_GH_REPO', cleanRepo);
                }
                if (data.adminPin && data.adminPin.trim()) {
                    localStorage.setItem('nexa_admin_pin', data.adminPin.trim());
                }
                if (data.accessKey && data.accessKey.trim()) {
                    localStorage.setItem('nexa_access_key', data.accessKey.trim());
                }
            }
            
            return data;
        }
    } catch (e) {
        console.warn("Could not fetch system config from Firestore, reading local fallback:", e);
    }

    const localKey = localStorage.getItem('nexa_client_api_key');
    const localGhToken = localStorage.getItem('NEXA_GH_TOKEN') || sessionStorage.getItem('NEXA_GH_TOKEN');
    const localGhRepo = localStorage.getItem('NEXA_GH_REPO') || sessionStorage.getItem('NEXA_GH_REPO');
    const localPin = localStorage.getItem('nexa_admin_pin');
    const localAccess = localStorage.getItem('nexa_access_key');

    return {
        geminiKey: localKey || undefined,
        ghToken: localGhToken || undefined,
        ghRepo: localGhRepo || undefined,
        adminPin: localPin || undefined,
        accessKey: localAccess || undefined
    };
};

// --- ACCESS KEY MANAGEMENT ---
export interface PresetKeyMapping {
    key: string;
    assignedMobile: string;
    userName: string;
}

export const SYSTEM_PRESET_MAPPINGS: PresetKeyMapping[] = [
    { key: 'ACHAL', assignedMobile: '9529736887', userName: 'Achal Lohave' },
    { key: 'AKASH', assignedMobile: '8080810834', userName: 'Akash Dhande' },
    { key: 'AKMT', assignedMobile: '7778822102', userName: 'Arjun Soni' },
    { key: 'BIJAY', assignedMobile: '7558482092', userName: 'Vijay Budhathoki' },
    { key: 'BIKAL', assignedMobile: '7385493842', userName: 'Bikal Sunar unar' },
    { key: 'DEVA', assignedMobile: '8980941230', userName: 'Debendar Soni' },
    { key: 'NEXA001', assignedMobile: '7350702228', userName: 'Pavan' },
    { key: 'NEXA002', assignedMobile: '9011304170', userName: 'Ram Dhande' },
    { key: 'NEXA2127', assignedMobile: '7499732530', userName: 'Karishma Yesankar' },
    { key: 'PAWAN', assignedMobile: '7499261176', userName: 'Pavan Rathod' },
    { key: 'NEXA2025', assignedMobile: '0992', userName: 'Chandan Lohave' }
];

export const SYSTEM_PRESET_KEYS = SYSTEM_PRESET_MAPPINGS.map(m => m.key);

export const createCustomAccessKey = async (key: string, assignedMobile?: string) => {
    if (!key || !key.trim()) return false;
    const cleanKey = key.trim().toUpperCase();
    const cleanMobile = assignedMobile?.trim() || null;
    const formattedDate = formatStdDate(new Date());

    // 1. Immediate LocalStorage backup so keys are never lost even offline
    try {
        const localStr = localStorage.getItem('nexa_custom_access_keys');
        const localList: AccessKeyDefinition[] = localStr ? JSON.parse(localStr) : [];
        const filtered = localList.filter(k => k.key.toUpperCase() !== cleanKey);
        filtered.unshift({
            key: cleanKey,
            assignedMobile: cleanMobile || undefined,
            createdBy: "Admin",
            createdAt: Date.now() as any,
            createdDate: formattedDate
        });
        localStorage.setItem('nexa_custom_access_keys', JSON.stringify(filtered));
    } catch(e) {}

    // 2. Persist to Firestore cloud database
    try {
        await setDoc(doc(db, "access_keys", cleanKey), {
            key: cleanKey,
            assignedMobile: cleanMobile,
            createdBy: "Admin",
            createdAt: serverTimestamp(),
            createdDate: formattedDate
        }, { merge: true });

        // If assigned to a registered mobile user, also update their user document
        if (cleanMobile) {
            try {
                await updateDoc(doc(db, "users", cleanMobile), {
                    accessKey: cleanKey
                });
            } catch(e) {
                // If updateDoc fails (e.g. user doc doesn't exist yet), set with merge
                await setDoc(doc(db, "users", cleanMobile), {
                    accessKey: cleanKey
                }, { merge: true }).catch(() => {});
            }
        }
        return true;
    } catch (e) {
        console.error("Failed to write access key to cloud database:", e);
        return true;
    }
};

export const getAccessKeys = async (): Promise<AccessKeyDefinition[]> => {
    let cloudKeys: AccessKeyDefinition[] = [];
    try {
        const snapshot = await getDocs(collection(db, "access_keys"));
        cloudKeys = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                key: data.key || docSnap.id,
                assignedMobile: data.assignedMobile || undefined,
                createdBy: data.createdBy || "Admin",
                createdAt: data.createdAt,
                createdDate: data.createdDate || ""
            } as AccessKeyDefinition;
        });
    } catch (e) {
        console.warn("Could not fetch access keys from cloud, checking local storage", e);
    }

    // Auto-sync: Cross-check registered users in Firestore to ensure all user access keys are indexed
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.docs.forEach(uDoc => {
            const uData = uDoc.data();
            if (uData.role !== 'ADMIN' && uData.accessKey && typeof uData.accessKey === 'string' && uData.accessKey.trim()) {
                const uKey = uData.accessKey.trim().toUpperCase();
                const existingKey = cloudKeys.find(k => k.key.toUpperCase() === uKey);
                if (!existingKey) {
                    const newDef: AccessKeyDefinition = {
                        key: uKey,
                        assignedMobile: uData.mobile || uDoc.id,
                        createdBy: "UserSync",
                        createdAt: uData.updatedAt || Date.now(),
                        createdDate: uData.lastLoginDate || formatStdDate(new Date())
                    };
                    cloudKeys.push(newDef);
                    setDoc(doc(db, "access_keys", uKey), {
                        key: uKey,
                        assignedMobile: uData.mobile || uDoc.id,
                        createdBy: "UserSync",
                        createdAt: serverTimestamp(),
                        createdDate: uData.lastLoginDate || formatStdDate(new Date())
                    }, { merge: true }).catch(() => {});
                } else if (!existingKey.assignedMobile && (uData.mobile || uDoc.id)) {
                    existingKey.assignedMobile = uData.mobile || uDoc.id;
                }
            }
        });
    } catch(e) {}

    // Auto-sync: Ensure all system preset keys are included with their bounded users & mobiles
    SYSTEM_PRESET_MAPPINGS.forEach(pm => {
        const existing = cloudKeys.find(ck => ck.key.toUpperCase() === pm.key.toUpperCase());
        if (!existing) {
            cloudKeys.push({
                key: pm.key,
                assignedMobile: pm.assignedMobile,
                assignedName: pm.userName,
                createdBy: "Admin",
                createdAt: Date.now() as any,
                createdDate: formatStdDate(new Date())
            });
            setDoc(doc(db, "access_keys", pm.key), {
                key: pm.key,
                assignedMobile: pm.assignedMobile,
                createdBy: "Admin",
                createdAt: serverTimestamp(),
                createdDate: formatStdDate(new Date())
            }, { merge: true }).catch(() => {});
        } else {
            if (!existing.assignedMobile) {
                existing.assignedMobile = pm.assignedMobile;
            }
            if (!existing.assignedName) {
                existing.assignedName = pm.userName;
            }
        }
    });

    // Enrich any existing keys with preset names
    cloudKeys.forEach(ck => {
        const pm = SYSTEM_PRESET_MAPPINGS.find(p => p.key.toUpperCase() === ck.key.toUpperCase());
        if (pm) {
            if (!ck.assignedMobile) ck.assignedMobile = pm.assignedMobile;
            if (!ck.assignedName) ck.assignedName = pm.userName;
        }
    });

    // Merge with LocalStorage keys so offline/cached keys are recovered
    try {
        const localStr = localStorage.getItem('nexa_custom_access_keys');
        if (localStr) {
            const localKeys: AccessKeyDefinition[] = JSON.parse(localStr);
            localKeys.forEach(lk => {
                const pm = SYSTEM_PRESET_MAPPINGS.find(p => p.key.toUpperCase() === lk.key.toUpperCase());
                if (pm && !lk.assignedMobile) {
                    lk.assignedMobile = pm.assignedMobile;
                    lk.assignedName = pm.userName;
                }
                if (!cloudKeys.some(ck => ck.key.toUpperCase() === lk.key.toUpperCase())) {
                    cloudKeys.push(lk);
                    setDoc(doc(db, "access_keys", lk.key.toUpperCase()), {
                        key: lk.key.toUpperCase(),
                        assignedMobile: lk.assignedMobile || null,
                        createdBy: lk.createdBy || "Admin",
                        createdAt: serverTimestamp(),
                        createdDate: lk.createdDate || formatStdDate(new Date())
                    }, { merge: true }).catch(() => {});
                }
            });
        }
        localStorage.setItem('nexa_custom_access_keys', JSON.stringify(cloudKeys));
    } catch(e) {}

    return cloudKeys;
};

export const subscribeToAccessKeys = (callback: (keys: AccessKeyDefinition[]) => void) => {
    // Immediate callback from LocalStorage or Presets if available
    try {
        const local = localStorage.getItem('nexa_custom_access_keys');
        if (local) {
            const parsed: AccessKeyDefinition[] = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Ensure preset bindings are accurate
                parsed.forEach(pk => {
                    const pm = SYSTEM_PRESET_MAPPINGS.find(p => p.key.toUpperCase() === pk.key.toUpperCase());
                    if (pm) {
                        pk.assignedMobile = pk.assignedMobile || pm.assignedMobile;
                        pk.assignedName = pk.assignedName || pm.userName;
                    }
                });
                callback(parsed);
            }
        }
    } catch(e) {}

    try {
        const unsub = onSnapshot(collection(db, "access_keys"), (snapshot) => {
            const cloudKeys: AccessKeyDefinition[] = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const key = data.key || docSnap.id;
                const pm = SYSTEM_PRESET_MAPPINGS.find(p => p.key.toUpperCase() === key.toUpperCase());
                return {
                    key: key,
                    assignedMobile: data.assignedMobile || pm?.assignedMobile || undefined,
                    assignedName: pm?.userName,
                    createdBy: data.createdBy || "Admin",
                    createdAt: data.createdAt,
                    createdDate: data.createdDate || ""
                } as AccessKeyDefinition;
            });

            // Ensure all presets are present
            SYSTEM_PRESET_MAPPINGS.forEach(pm => {
                if (!cloudKeys.some(ck => ck.key.toUpperCase() === pm.key.toUpperCase())) {
                    cloudKeys.push({
                        key: pm.key,
                        assignedMobile: pm.assignedMobile,
                        assignedName: pm.userName,
                        createdBy: "Admin",
                        createdAt: Date.now() as any,
                        createdDate: formatStdDate(new Date())
                    });
                }
            });

            // Deduplicate keys
            const uniqueKeys: AccessKeyDefinition[] = [];
            const seenKeys = new Set<string>();
            cloudKeys.forEach(k => {
                const upper = (k.key || '').trim().toUpperCase();
                if (upper && !seenKeys.has(upper)) {
                    seenKeys.add(upper);
                    uniqueKeys.push(k);
                }
            });

            // Update local storage
            try {
                localStorage.setItem('nexa_custom_access_keys', JSON.stringify(uniqueKeys));
            } catch(e) {}

            callback(uniqueKeys);
        }, (err) => {
            console.warn("Realtime access_keys snapshot warning:", err);
            getAccessKeys().then(callback);
        });

        return unsub;
    } catch (e) {
        getAccessKeys().then(callback);
        return () => {};
    }
};

export const subscribeToRegisteredUsers = (callback: (users: UserProfile[]) => void) => {
    try {
        const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const seen = new Set<string>();
            const users: UserProfile[] = [];
            snapshot.docs.forEach(d => {
                const data = d.data();
                const mobile = (data.mobile || d.id || '').trim();
                const cleanKey = mobile ? mobile.replace(/\D/g, '') || mobile : d.id;
                if (!seen.has(cleanKey)) {
                    seen.add(cleanKey);
                    users.push({
                        id: d.id,
                        ...data
                    } as unknown as UserProfile);
                }
            });
            callback(users);
        }, (err) => {
            console.warn("Registered users snapshot warning:", err);
        });
        return unsub;
    } catch (e) {
        return () => {};
    }
};

export const deleteAccessKey = async (key: string) => {
    if (!key || !key.trim()) return false;
    const cleanKey = key.trim().toUpperCase();

    try {
        const localStr = localStorage.getItem('nexa_custom_access_keys');
        if (localStr) {
            const localKeys: AccessKeyDefinition[] = JSON.parse(localStr);
            const filtered = localKeys.filter(k => k.key.toUpperCase() !== cleanKey);
            localStorage.setItem('nexa_custom_access_keys', JSON.stringify(filtered));
        }
    } catch(e) {}

    try {
        await deleteDoc(doc(db, "access_keys", cleanKey));
        return true;
    } catch (e) {
        console.error("Failed to delete key from Firestore:", e);
        return false;
    }
};

// --- SECURE MASTER ACCESS VERIFICATION ---
export const verifyMasterAccessKey = async (inputKey: string, userMobile?: string): Promise<boolean> => {
    if (!inputKey || !inputKey.trim()) return false;
    const cleanKey = inputKey.trim().toUpperCase();
    const cleanUserDigits = userMobile ? userMobile.replace(/\D/g, '') : '';

    // 1. Check system preset mappings (ACHAL, AKASH, AKMT, BIJAY, BIKAL, DEVA, NEXA001, NEXA002, NEXA2127, PAWAN, NEXA2025)
    const preset = SYSTEM_PRESET_MAPPINGS.find(p => p.key.toUpperCase() === cleanKey);

    // 2. Fetch doc from Firestore access_keys collection
    let firestoreKeyData: AccessKeyDefinition | null = null;
    try {
        const docRef = doc(db, "access_keys", cleanKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            firestoreKeyData = docSnap.data() as AccessKeyDefinition;
        }
    } catch (e) {
        console.warn("Error fetching access_keys doc from Firestore:", e);
    }

    // Determine the assigned mobile for this key (Firestore takes precedence, fallback to preset mapping)
    const assignedMobile = firestoreKeyData?.assignedMobile || preset?.assignedMobile;
    const cleanAssignedDigits = assignedMobile ? assignedMobile.replace(/\D/g, '') : '';

    // 3. If the key is bounded to a mobile number:
    if (cleanAssignedDigits.length > 0) {
        // STRICT MOBILE VALIDATION:
        // Must provide userMobile and it must match the bound mobile
        if (!cleanUserDigits) {
            return false;
        }
        const isMatch = (cleanUserDigits === cleanAssignedDigits) || 
                        (cleanUserDigits.endsWith(cleanAssignedDigits)) || 
                        (cleanAssignedDigits.endsWith(cleanUserDigits));
        
        if (isMatch) {
            // Update Firestore with the user's mobile and timestamp
            try {
                await setDoc(doc(db, "access_keys", cleanKey), {
                    key: cleanKey,
                    assignedMobile: userMobile,
                    assignedName: preset?.userName,
                    lastUsedAt: serverTimestamp(),
                    lastUsedMobile: userMobile
                }, { merge: true });
            } catch (e) {}
            return true;
        } else {
            // Key is strictly bounded to a DIFFERENT mobile! User is not authorized to use this key!
            console.warn(`Access Key ${cleanKey} is bounded to ${assignedMobile}, but attempted by ${userMobile}`);
            return false;
        }
    }

    // 4. If key exists in Firestore but has no assignedMobile yet (an unbounded key created by Admin):
    if (firestoreKeyData) {
        if (userMobile) {
            // Bind it to the user who activates it
            try {
                await setDoc(doc(db, "access_keys", cleanKey), {
                    assignedMobile: userMobile,
                    lastUsedAt: serverTimestamp()
                }, { merge: true });
            } catch (e) {}
        }
        return true;
    }

    // 5. Check if it's the general system master key or invite code (e.g., NEXA2025)
    try {
        const sys = await fetchSystemConfig();
        const validMasterKey = (sys?.accessKey && sys.accessKey.length > 0) ? sys.accessKey.toUpperCase() : null;
        const inviteCode = (sys?.inviteCode && sys.inviteCode.length > 0) ? sys.inviteCode.toUpperCase() : 'NEXA2025';
        
        if (cleanKey === validMasterKey || cleanKey === inviteCode) {
            return true;
        }
    } catch (e) {}

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
        const seen = new Set<string>();
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as UserProfile;
            const mobile = (data.mobile || doc.id || '').trim();
            const cleanKey = mobile ? mobile.replace(/\D/g, '') || mobile : doc.id;
            if (!seen.has(cleanKey)) {
                seen.add(cleanKey);
                users.push(data);
            }
        });
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
