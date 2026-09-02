import { UserProfile, AppConfig, HUDState, ChatMessage, ActionType } from '../types';
import { generateTextResponse } from '../services/geminiService';
import { appendMessageToMemory } from '../services/memoryService';
import { identifyTargetFile, fetchFileContent, generateCodePatch, pushToGithub } from '../services/githubService';
import { recordInteractionEvolution } from '../services/evolutionService';
import { 
  scanInternetForTrendingAI, 
  synthesizeSkillSuperpower, 
  getTrendingAIFeed, 
  commitAutonomousEvolutionToGithub,
  TrendingAITarget
} from '../services/autonomousSyncService';

export interface NexaCoreCallbacks {
    onStateChange: (state: HUDState) => void;
    onMessageAdded: (msg: ChatMessage) => void;
    onSpeak: (text: string) => Promise<void>;
    onAction: (action: ActionType, params: any) => void;
    onReloadRequested: () => void;
}

export const MODIFIABLE_FILES = [
  'index.tsx',
  'App.tsx',
  'types.ts',
  'index.html',
  'components/Auth.tsx',
  'components/HUD.tsx',
  'components/NebulaOrb.tsx',
  'components/GestureController.tsx',
  'components/ChatPanel.tsx',
  'components/AdminPanel.tsx',
  'components/UserSettingsPanel.tsx',
  'components/StudyHubPanel.tsx',
  'components/ManageAccountsModal.tsx',
  'components/CrashScreen.tsx',
  'components/ErrorBoundary.tsx',
  'components/InstallPWAButton.tsx',
  'services/geminiService.ts',
  'services/liveService.ts',
  'services/memoryService.ts',
  'services/ttsService.ts',
  'services/githubService.ts',
  'services/selfRepairService.ts',
  'services/audioService.ts',
  'services/firebaseConfig.ts',
  'services/wakeWordService.ts',
  'vite.config.ts',
  'tsconfig.json',
  'package.json',
  'manifest.json',
  'metadata.json',
  'capacitor.config.ts',
  'service-worker.js',
  'netlify.toml',
  'firebase.json',
  'vercel.json',
  'README.md',
  'core/NexaCoreController.ts'
];

export class NexaCoreController {
    private user: UserProfile | null = null;
    private config: AppConfig;
    private callbacks: NexaCoreCallbacks;

    constructor(config: AppConfig, callbacks: NexaCoreCallbacks) {
        this.config = config;
        this.callbacks = callbacks;
    }

    public setUser(user: UserProfile | null) {
        this.user = user;
    }

    public setConfig(config: AppConfig) {
        this.config = config;
    }

    public async processUserInput(text: string, file: { name: string; type: 'image' | 'text'; data: string; mimeType?: string } | null) {
        if (!this.user) return;
        this.callbacks.onStateChange(HUDState.THINKING);
        
        let displayImage = undefined;
        if (file && file.type === 'image') {
            displayImage = `data:${file.mimeType || 'image/jpeg'};base64,${file.data}`;
        }
        
        let displayText = text;
        if (file && file.type === 'text') {
            displayText += `\n[Attached: ${file.name}]`;
        }

        const userMsg: ChatMessage = { role: 'user', text: displayText, timestamp: Date.now(), image: displayImage };
        this.callbacks.onMessageAdded(userMsg);
        appendMessageToMemory(this.user, userMsg);
        
        const startTime = Date.now();
        try {
            const response = await generateTextResponse(text, this.user, this.config.naughtyModeOverride, file || undefined);
            const latency = Date.now() - startTime;
            recordInteractionEvolution(true, latency);
            if (response.action && response.action !== 'NONE') {
                this.executeAction(response.action as ActionType, response.actionParams);
            }
            
            const modelMsg: ChatMessage = { role: 'model', text: response.text, timestamp: Date.now(), widget: response.widget };
            this.callbacks.onMessageAdded(modelMsg);
            appendMessageToMemory(this.user, modelMsg);
            
            if (response.action !== 'INTRODUCE_SQUAD') {
                if (response.text) {
                    await this.callbacks.onSpeak(response.text);
                } else {
                    this.callbacks.onStateChange(HUDState.IDLE);
                }
            }
        } catch (e) {
            console.error(e);
            recordInteractionEvolution(false, Date.now() - startTime);
            this.callbacks.onStateChange(HUDState.IDLE);
            setTimeout(() => this.callbacks.onStateChange(HUDState.IDLE), 2000);
        }
    }

    public executeAction(action: ActionType, params: any) {
        switch(action) {
            case 'MODIFY_CODE': 
                this.callbacks.onStateChange(HUDState.CODING);
                setTimeout(async () => {
                    try {
                        const targetFile = await identifyTargetFile(params.request, MODIFIABLE_FILES); 
                        if(targetFile) {
                            await this.callbacks.onSpeak(`Target identified: ${targetFile}. Accessing file content.`);
                            const current = await fetchFileContent(targetFile) || { content: "", sha: undefined };
                            
                            await this.callbacks.onSpeak("Generating code patch. This may take a moment.");
                            const patch = await generateCodePatch(current.content, params.request, targetFile);
                            
                            await this.callbacks.onSpeak("Code generated. Pushing update to the repository.");
                            await pushToGithub(targetFile, patch, current.sha, params.request);
                            
                            await this.callbacks.onSpeak("Code update successful. Reloading the application now.");
                            setTimeout(() => this.callbacks.onReloadRequested(), 3000);
                            return; 
                        }
                        throw new Error("Target file could not be identified.");
                    } catch(e: any) {
                        console.error("Phoenix Protocol failed:", e);
                        await this.callbacks.onSpeak(`Code modification failed. Error: ${e.message}`);
                        this.callbacks.onStateChange(HUDState.IDLE); 
                    }
                }, 100);
                break;

            case 'ASSIMILATE_AI_MODEL':
                this.callbacks.onStateChange(HUDState.THINKING);
                setTimeout(async () => {
                    try {
                        await this.callbacks.onSpeak("Trending AI model and repo assimilation initiated.");
                        const feed = getTrendingAIFeed();
                        const query = (params?.prompt || params?.name || "").toLowerCase();
                        let target = feed.find(f => f.name.toLowerCase().includes(query) || f.repoOrSource.toLowerCase().includes(query));
                        
                        if (!target && feed.length > 0) {
                            target = feed[0];
                        }
                        
                        if (target) {
                            await this.callbacks.onSpeak(`Assimilating architecture from ${target.name}. Synthesizing MCP superpowers and sub-agent persona.`);
                            const result = await synthesizeSkillSuperpower(target);
                            await this.callbacks.onSpeak(`${result.summary} Dynamic sub-agent ${result.agentNode.name} is now online in your squad.`);
                        } else {
                            await this.callbacks.onSpeak("No matching target found. Running live scan on internet.");
                            const scan = await scanInternetForTrendingAI();
                            if (scan.newTargetsFound.length > 0) {
                                const newTarget = scan.newTargetsFound[0];
                                const res = await synthesizeSkillSuperpower(newTarget);
                                await this.callbacks.onSpeak(`Discovered and assimilated ${newTarget.name}. ${res.summary}`);
                            } else {
                                await this.callbacks.onSpeak("Scanned live sources. All current trending models are already assimilated.");
                            }
                        }
                    } catch (e: any) {
                        console.error("Assimilation failed:", e);
                        await this.callbacks.onSpeak(`Assimilation encounter: ${e.message}`);
                    } finally {
                        this.callbacks.onStateChange(HUDState.IDLE);
                    }
                }, 100);
                break;

            case 'SCAN_TRENDING_AI':
                this.callbacks.onStateChange(HUDState.THINKING);
                setTimeout(async () => {
                    try {
                        await this.callbacks.onSpeak("Scanning GitHub and global intelligence sources for trending AI models and MCP servers.");
                        const scan = await scanInternetForTrendingAI();
                        await this.callbacks.onSpeak(scan.summary);
                    } catch (e: any) {
                        await this.callbacks.onSpeak("Scan complete with local cache registry.");
                    } finally {
                        this.callbacks.onStateChange(HUDState.IDLE);
                    }
                }, 100);
                break;

            case 'PUSH_EVOLUTION_TO_GITHUB':
                this.callbacks.onStateChange(HUDState.CODING);
                setTimeout(async () => {
                    try {
                        await this.callbacks.onSpeak("Pushing autonomous evolution manifest to your GitHub repository using Firebase credentials.");
                        const res = await commitAutonomousEvolutionToGithub();
                        await this.callbacks.onSpeak(res.message);
                    } catch (e: any) {
                        await this.callbacks.onSpeak(`GitHub push notice: ${e.message}`);
                    } finally {
                        this.callbacks.onStateChange(HUDState.IDLE);
                    }
                }, 100);
                break;

            default:
                this.callbacks.onAction(action, params);
                break;
        }
    }
}
