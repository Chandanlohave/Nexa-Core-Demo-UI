
import { GoogleGenAI } from "@google/genai";
import { UserRole } from "../types";

const checkApiKey = () => {
  // 1. Local Storage (Priority for Users)
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey && customKey.trim().length > 10) return customKey;

  // 2. Check Permissions (Simple Check)
  let canUseSystem = false;
  try {
      const userStr = localStorage.getItem('nexa_user');
      if (userStr) {
          const user = JSON.parse(userStr);
          const isVip = user.mobile === '7499732530' || ['karishma', 'karishma yesankar', 'karishma lohave'].includes(user.name?.toLowerCase().trim());
          
          if (user.role === 'ADMIN' || isVip) {
              canUseSystem = true;
          }
      }
  } catch(e) {}

  // 3. Block Normal Users
  if (!canUseSystem) {
      throw new Error("USER_API_KEY_REQUIRED");
  }

  // 4. Fallback to Env (Admin Only)
  const systemKey = process.env.API_KEY;
  if (systemKey && systemKey !== "undefined" && systemKey.trim() !== '') return systemKey;
  
  throw new Error("GUEST_ACCESS_DENIED");
};

export interface RepairPlan {
    diagnosis: string;
    suggestedAction: 'RETRY' | 'CLEAR_MEMORY' | 'ABORT';
    technicalExplanation: string;
}

export const analyzeSystemError = async (errorLog: string, context: string): Promise<RepairPlan> => {
    // --- SECURITY CHECK: ADMIN ONLY ---
    let isAdminOrVip = false;
    try {
        const userStr = localStorage.getItem('nexa_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const isVip = user.mobile === '7499732530' || ['karishma', 'karishma yesankar', 'karishma lohave'].includes(user.name?.toLowerCase().trim());
            if (user.role === 'ADMIN' || isVip) {
                isAdminOrVip = true;
            }
        }
    } catch (e) {}

    if (!isAdminOrVip) {
        // Return dummy response for normal users to save tokens and restrict access
        return {
            diagnosis: "System hiccup. Please try again.",
            suggestedAction: "ABORT",
            technicalExplanation: "User does not have clearance for Deep System Diagnostics."
        };
    }

    try {
        const apiKey = checkApiKey();
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        SYSTEM DIAGNOSTIC MODE.
        I am NEXA. I encountered an internal runtime error.
        
        ERROR LOG: "${errorLog}"
        CONTEXT: User was trying to "${context}"
        
        TASK: Analyze this error. Can I fix it by retrying with different parameters or clearing local memory?
        
        OUTPUT JSON ONLY:
        {
            "diagnosis": "Brief explanation of what went wrong",
            "suggestedAction": "RETRY" (if transient) or "CLEAR_MEMORY" (if corrupt data) or "ABORT" (if fatal),
            "technicalExplanation": "Technical jargon for the Admin"
        }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text || "";
        return JSON.parse(text) as RepairPlan;
    } catch (e) {
        // Fallback if the diagnosis itself fails
        return {
            diagnosis: "Diagnosis sub-routine failed.",
            suggestedAction: "ABORT",
            technicalExplanation: "API Connectivity or Key Issue during diagnostics."
        };
    }
};
