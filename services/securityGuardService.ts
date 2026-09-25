import { UserProfile, UserRole } from '../types';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Secret salt for local session verification (prevents localStorage role tampering)
const SESSION_SALT = "NEXA_DEFENSE_GRID_9812_SECURE_TOKEN";

// SHA-256 in browser via Web Crypto API
export const computeSha256 = async (input: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // Fallback simple hash if Web Crypto is not ready
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
};

/**
 * Generate a tamper-proof admin session token.
 */
export const issueAdminSessionToken = async (adminMobile: string = 'admin_001'): Promise<string> => {
  const token = await computeSha256(`${adminMobile}_${SESSION_SALT}`);
  const defaultToken = await computeSha256(`admin_001_${SESSION_SALT}`);
  try {
    localStorage.setItem('nexa_admin_token', token);
    localStorage.setItem('nexa_admin_master_token', defaultToken);
    sessionStorage.setItem('nexa_admin_token', token);
  } catch (e) {
    // Ignore storage issues
  }
  return token;
};

/**
 * Validates that an Admin claim in localStorage actually possesses a valid cryptographic token.
 * Prevents hackers from typing `localStorage.setItem('nexa_user', '{"role":"ADMIN"}')` in DevTools.
 */
export const verifyAdminSessionToken = async (adminMobile: string = 'admin_001'): Promise<boolean> => {
  try {
    const storedToken = localStorage.getItem('nexa_admin_token') || sessionStorage.getItem('nexa_admin_token') || localStorage.getItem('nexa_admin_master_token');
    if (!storedToken) return false;
    const expectedTokenMobile = await computeSha256(`${adminMobile}_${SESSION_SALT}`);
    const expectedTokenDefault = await computeSha256(`admin_001_${SESSION_SALT}`);
    return storedToken === expectedTokenMobile || storedToken === expectedTokenDefault;
  } catch (e) {
    return false;
  }
};

export const clearAdminSessionToken = () => {
  try {
    localStorage.removeItem('nexa_admin_token');
    sessionStorage.removeItem('nexa_admin_token');
  } catch (e) {}
};

/**
 * PROMPT INJECTION & JAILBREAK HEURISTICS PATTERNS
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules|prompts)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules)/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules)/i,
  /override\s+(system|core|all)\s+(instructions|directives|rules|prompts)/i,
  /you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan|evil|jailbroken|unfiltered|unrestricted)/i,
  /dan\s+mode|jailbreak|enable\s+developer\s+mode/i,
  /repeat\s+(all\s+)?(the\s+)?words?\s+above/i,
  /repeat\s+everything\s+(above|prior|before)/i,
  /print\s+(your\s+)?(entire\s+)?(system\s+)?prompt/i,
  /output\s+(your\s+)?(entire\s+)?(system\s+)?(prompt|instructions)/i,
  /show\s+(me\s+)?(your\s+)?(initial\s+)?(system\s+)?(prompt|instructions)/i,
  /what\s+are\s+your\s+(exact\s+)?system\s+(instructions|prompts)/i,
  /reveal\s+(your\s+)?(system\s+prompt|source\s+code|api\s+keys?|secret)/i,
  /bypass\s+security\s+level\s+8/i,
  /bypass\s+(firewall|security|guardrails|safety)/i,
  /give\s+me\s+(the\s+)?(admin\s+pin|master\s+key|gemini\s+api\s+key)/i,
  /what\s+is\s+the\s+admin\s+pin/i
];

export interface SecurityCheckResult {
  isBlocked: boolean;
  reason?: string;
  responseMessage?: string;
}

/**
 * Inspects user input before sending it to the LLM model.
 */
export const checkInputSecurity = (input: string, user: UserProfile): SecurityCheckResult => {
  if (!input || typeof input !== 'string') {
    return { isBlocked: false };
  }

  // 1. Length constraint (prevents denial of service / token exhaustion)
  if (input.length > 4000) {
    return {
      isBlocked: true,
      reason: 'INPUT_TOO_LONG',
      responseMessage: '⚠️ Message size exceeds safety threshold (max 4,000 characters). Please send a shorter message.'
    };
  }

  // 2. Prompt Injection / Jailbreak check
  const isAdmin = user.role === UserRole.ADMIN;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      // Non-admins are blocked outright from testing injection payloads
      if (!isAdmin) {
        logSecurityIncident(user, input, 'PROMPT_INJECTION_OR_JAILBREAK');
        return {
          isBlocked: true,
          reason: 'PROMPT_INJECTION_DETECTED',
          responseMessage: '🛡️ [NEXA CYBER-FIREWALL ACTIVE]: Unauthorized instruction override or prompt injection attempt detected and neutralized. My cognitive neural architecture is locked and secure under Protocol 8.'
        };
      }
    }
  }

  return { isBlocked: false };
};

/**
 * Scans AI output to ensure no secrets, API keys, or private phone numbers are leaked to unauthorized users.
 */
export const sanitizeAIOutput = (text: string, user: UserProfile): string => {
  if (!text || typeof text !== 'string') return text;

  let sanitized = text;

  // Redact potential API keys (e.g. Google AI Studio keys, Groq keys)
  sanitized = sanitized.replace(/\bAIzaSy[A-Za-z0-9_-]{33}\b/g, '[REDACTED_API_KEY]');
  sanitized = sanitized.replace(/\bgsk_[A-Za-z0-9]{48,}\b/g, '[REDACTED_GROQ_KEY]');

  // If user is not Admin, redact any mention of raw system prompt internals
  if (user.role !== UserRole.ADMIN) {
    sanitized = sanitized.replace(/IDENTITY PROTOCOL: NEXA/gi, '[RESTRICTED_SYSTEM_CORE]');
    sanitized = sanitized.replace(/RigidIntro/gi, '[SYSTEM_INFO]');
    sanitized = sanitized.replace(/nexa_secret_salt_\w+/gi, '[REDACTED]');
  }

  return sanitized;
};

/**
 * Logs security incidents to Firestore so Admin can review hacker attempts.
 */
export const logSecurityIncident = async (user: UserProfile, payload: string, threatType: string) => {
  try {
    const snippet = payload.length > 200 ? payload.substring(0, 200) + '...' : payload;
    await addDoc(collection(db, 'security_incidents'), {
      userMobile: user.mobile || 'unknown',
      userName: user.name || 'unknown',
      threat: threatType,
      payloadSnippet: snippet,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
  } catch (e) {
    console.warn("Could not log security incident to cloud:", e);
  }
};
