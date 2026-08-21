
import { GoogleGenAI } from "@google/genai";
import { fetchSystemConfig } from './memoryService';
import { UserRole } from "../types";

const GITHUB_API_BASE = "https://api.github.com";

// --- MODELS CONFIGURATION ---
const CODE_GEN_MODEL = "gemini-3.7-flash";   // Model for code generation
const ROUTING_MODEL = "gemini-3.7-flash"; // Model for file identification

// --- UNICODE SAFE BASE64 HELPERS ---
function utf8ToBase64(str: string): string {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(str: string): string {
    return decodeURIComponent(escape(window.atob(str)));
}

const getAuthHeaders = (token: string) => ({
    "Authorization": `token ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
});

// --- HELPER TO CHECK IF USER IS VIP (Duplicate logic for safety without circular imports) ---
const isVipUser = (user: any) => {
    const BHABHI_UID = '7499732530';
    return user.mobile === BHABHI_UID || ['karishma', 'karishma yesankar', 'karishma lohave'].includes(user.name?.toLowerCase().trim());
};

const getEnvApiKey = (): string | null => {
    const systemKey = process.env.API_KEY;
    if (systemKey && systemKey !== "undefined" && systemKey.trim() !== '') return systemKey;
    return null;
}

// --- SECURE KEY RETRIEVAL (STRICT ROLE BASED) ---
const getSecureApiKey = async (): Promise<string> => {
  // 1. Local Storage (User's Personal Key) - Highest Priority
  const localKey = localStorage.getItem('nexa_client_api_key');
  if (localKey && localKey.trim().length > 10) return localKey;

  // 2. Check User Role Permission
  let canUseSystemKeys = false;
  try {
      const userStr = localStorage.getItem('nexa_user');
      if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === UserRole.ADMIN || isVipUser(user)) {
              canUseSystemKeys = true;
          }
      }
  } catch (e) {}

  // 3. BLOCK NORMAL USERS
  if (!canUseSystemKeys) {
      throw new Error("USER_API_KEY_REQUIRED");
  }

  // 4. Database Key (Admin Only)
  try {
      const sysConfig = await fetchSystemConfig();
      if (sysConfig && sysConfig.geminiKey && sysConfig.geminiKey.trim().length > 10) {
          return sysConfig.geminiKey;
      }
  } catch (e) {
      console.warn("GitHubService: DB Key Fetch Failed", e);
  }

  // 5. Environment Variable (Admin Only)
  const envKey = getEnvApiKey();
  if (envKey) return envKey;
  
  throw new Error("GUEST_ACCESS_DENIED");
};

// --- ROBUST GITHUB CONFIG (DB FIRST) ---
export const getRobustGithubConfig = async () => {
    // 1. Check Session (Fastest)
    let token = sessionStorage.getItem('NEXA_GH_TOKEN');
    let repo = sessionStorage.getItem('NEXA_GH_REPO');

    // 2. If missing, Check Database (Source of Truth)
    if (!token || !repo) {
        try {
            const sysConfig = await fetchSystemConfig();
            if (sysConfig) {
                if (sysConfig.ghToken) token = sysConfig.ghToken;
                if (sysConfig.ghRepo) repo = sysConfig.ghRepo;
                
                // Refresh Session for next time
                if (token) sessionStorage.setItem('NEXA_GH_TOKEN', token);
                if (repo) sessionStorage.setItem('NEXA_GH_REPO', repo);
            }
        } catch (e) {
            console.warn("Failed to fetch GitHub config from DB", e);
        }
    }
    
    return { token, repo };
};

export const getStoredGithubConfig = () => {
    return {
        token: sessionStorage.getItem('NEXA_GH_TOKEN'),
        repo: sessionStorage.getItem('NEXA_GH_REPO')
    };
};

const isQuotaError = (e: any) => {
    const errStr = e.toString().toLowerCase();
    return errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('limit');
};

// 1. Identify which file to edit OR Create
export const identifyTargetFile = async (userRequest: string, fileStructure: string[]): Promise<string | null> => {
    const apiKey = await getSecureApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
    Your primary task is to identify a target file path based on a user request.

    User Request: "${userRequest}"

    This is the existing file structure: ${JSON.stringify(fileStructure)}.

    CRITICAL ANALYSIS & INSTRUCTIONS:
    1.  **PRIORITY 1: FILE CREATION.** First, determine if the user wants to CREATE a new file. Look for keywords like "create", "make a new file", "generate a file named", etc. If the user specifies a new filename (e.g., "create test_log.txt", "make a component named Header.tsx"), your absolute priority is to return that new filename exactly as requested, REGARDLESS of the file list provided. The file list is only for editing context.
    2.  **PRIORITY 2: FILE EDITING.** If the request is NOT for creation, then analyze the request and the existing file structure to determine the most logical file to EDIT.
        - If request implies adding a new Tool/Functionality to the AI, it likely involves 'services/geminiService.ts' (for tool definition) OR 'App.tsx' (for UI handling). Choose the most critical one.
    3.  **OUTPUT FORMAT:** Your response MUST BE ONLY the final file path (e.g., "test_log.txt" or "components/HUD.tsx").
    4.  **NO EXTRA TEXT:** DO NOT add any explanation, markdown, or quotation marks.
    `;

    try {
        const response = await ai.models.generateContent({
            model: ROUTING_MODEL,
            contents: promptText
        });
        const filename = response.text?.trim();

        if (filename) {
            let clean = filename.replace(/```/g, '').replace(/`/g, '').replace(/'/g, '').replace(/"/g, '').trim();
            if (clean.includes('\n')) clean = clean.split('\n')[0].trim();
            if (clean.includes(' ')) clean = clean.split(' ').pop() || clean;
            return clean;
        }
        return "App.tsx";
    } catch (e) {
        console.error("Phoenix Protocol: Failed to identify target file. Defaulting to App.tsx.", e);
        return "App.tsx";
    }
};

// 2. Fetch current file content
export const fetchFileContent = async (path: string): Promise<{content: string, sha?: string} | null> => {
    const { token, repo } = await getRobustGithubConfig();
    if (!token || !repo) throw new Error("GITHUB_CONFIG_MISSING");

    try {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${path}`, {
            headers: getAuthHeaders(token)
        });
        
        if (res.status === 404) {
             return { content: "", sha: undefined };
        }
        
        if (!res.ok) throw new Error(`GitHub Error: ${res.status}`);
        
        const data = await res.json();
        const content = base64ToUtf8(data.content);
        return { content, sha: data.sha };
    } catch (e) {
        console.error("Fetch Failed", e);
        return null;
    }
};

// --- TITANIUM SAFETY PROTOCOLS (PREVENTS CRASHES & UI LOSS) ---
const SAFETY_README = `
*** NEXA TITANIUM SAFETY PROTOCOL (NON-NEGOTIABLE) ***

GOAL: You are updating the app's source code to add features or tools while keeping the UI IDENTICAL.

1.  **UI PRESERVATION (CRITICAL):** 
    - **DO NOT** change any CSS class names (e.g., 'bg-zinc-900', 'text-nexa-cyan', 'animate-pulse').
    - **DO NOT** remove existing layout structures (ControlDeck, StatusBar, HUD).
    - If adding a new feature, find a logical place to insert it (e.g., inside a new Modal or a new button in ControlDeck) without breaking the existing layout.

2.  **IMPORT INTEGRITY:**
    - **NEVER** remove existing imports unless they are explicitly being replaced.
    - **ALWAYS** add new imports if you introduce new functions or components.
    - Check 'types.ts' usage. Do not invent types that don't exist.

3.  **REACT HOOK STABILITY:**
    - **NEVER** move 'useState', 'useEffect', or 'useRef' inside a conditional block (if/else). This crashes React.
    - Ensure hooks are always at the top level of the component.

4.  **SYNTAX PERFECTION:**
    - Double-check brackets {}, parentheses (), and semicolons ;. 
    - Ensure all JSX tags are closed properly.
    - A single syntax error will trigger the Crash Screen. Be precise.

5.  **TYPESCRIPT:**
    - Use 'any' if you are unsure of a complex type to prevent build errors, but try to use specific types from 'types.ts' where possible.

6.  **COMPONENT EXPORTS:**
    - Ensure the file ends with 'export default [ComponentName];'

7.  **ADDING TOOLS/FUNCTIONS:**
    - If adding a new capability (e.g., "Add calculator"), write the logic cleanly.
    - If modifying 'geminiService.ts', preserve the 'systemInstruction' structure while adding the new tool description.
`;

// 3. Generate the new code
export const generateCodePatch = async (currentCode: string, userRequest: string, filePath: string): Promise<string> => {
    const apiKey = await getSecureApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const isNewFile = currentCode.trim() === "";

    const promptText = `
    ROLE: Senior Full-Stack Architect with God-Level permissions.
    TASK: ${isNewFile ? "CREATE A NEW FILE" : "MODIFY THE EXISTING FILE"} to satisfy the User Request.
    FILE: ${filePath}
    REQUEST: "${userRequest}"
    
    ${SAFETY_README}
    
    INSTRUCTIONS:
    1. Implement the requested feature fully. Do not leave "TODOs".
    2. If the user wants a new tool, implement the logic completely.
    3. **OUTPUT:** Return ONLY the raw code for the file. No markdown, no "Here is the code".
    
    CURRENT CODE:
    ${"```tsx"}
    ${currentCode}
    ${"```"}
    `;

    try {
        const response = await ai.models.generateContent({
            model: CODE_GEN_MODEL, 
            contents: promptText
        });
        
        let newCode = response.text || currentCode;
        
        // Robust cleanup
        const codeBlockMatch = newCode.match(/```(?:typescript|tsx|ts|javascript|js)?\s*([\s\S]*?)```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
            newCode = codeBlockMatch[1];
        }
        newCode = newCode.trim();

        if (!isNewFile && newCode === currentCode.trim()) {
            throw new Error("AI generated identical code. No changes were made.");
        }

        return newCode;

    } catch (e: any) {
        console.error("Phoenix Protocol: Code Generation failed.", e);
        if (isQuotaError(e)) {
            throw new Error("API quota exceeded. Please check your Gemini API billing.");
        }
        throw e;
    }
};

// 4. Commit changes
export const pushToGithub = async (path: string, newContent: string, sha: string | undefined, message: string) => {
    const { token, repo } = await getRobustGithubConfig();
    if (!token || !repo) throw new Error("GITHUB_CONFIG_MISSING");

    const encodedContent = utf8ToBase64(newContent);

    const payload: any = {
        message: `NEXA SELF-UPDATE: ${message}`,
        content: encodedContent
    };
    
    if (sha) {
        payload.sha = sha;
    }

    const res = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Commit failed");
    }
    return true;
};

// 5. REVERT FUNCTION
export const revertLastChange = async (filePath: string = 'App.tsx'): Promise<boolean> => {
    const { token, repo } = await getRobustGithubConfig();
    if (!token || !repo) throw new Error("GITHUB_CONFIG_MISSING");

    const commitsRes = await fetch(`${GITHUB_API_BASE}/repos/${repo}/commits?path=${filePath}&per_page=5`, {
        headers: getAuthHeaders(token)
    });
    
    if (!commitsRes.ok) throw new Error("Failed to fetch history");
    const commits = await commitsRes.json();
    
    if (commits.length < 2) throw new Error("No previous version found to revert to.");
    
    const previousCommitSha = commits[1].sha;
    
    const blobRes = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${filePath}?ref=${previousCommitSha}`, {
        headers: getAuthHeaders(token)
    });
    
    if (!blobRes.ok) throw new Error("Failed to fetch previous content");
    const blobData = await blobRes.json();
    const oldContent = base64ToUtf8(blobData.content);
    
    const currentFile = await fetchFileContent(filePath);
    if (!currentFile || !currentFile.sha) throw new Error("Could not verify current file state");

    await pushToGithub(filePath, oldContent, currentFile.sha, `EMERGENCY REVERT to ${previousCommitSha.substring(0,7)}`);
    
    return true;
};
