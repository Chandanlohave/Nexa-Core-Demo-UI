import { UserProfile, AppConfig, HUDState, ChatMessage, ActionType } from '../types';
import { generateTextResponse, generateImageContent, generateVideoContent } from '../services/geminiService';
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
import { planTaskDistribution, executeAgentTask, AgentSpec } from '../services/agentOrchestrator';

export interface NexaCoreCallbacks {
    onStateChange: (state: HUDState) => void;
    onMessageAdded: (msg: ChatMessage) => void;
    onSpeak: (text: string) => Promise<void>;
    onSpeakAgent?: (agent: AgentSpec, text: string) => Promise<void>;
    onAgentHighlight?: (agentId: string | null) => void;
    onAction: (action: ActionType, params: any) => void;
    onReloadRequested: () => void;
    onShowChat?: (show: boolean) => void;
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

    public async processUserInput(text: string, file: { name: string; type: 'image' | 'text' | 'pdf'; data: string; mimeType?: string } | null) {
        if (!this.user) return;
        this.callbacks.onStateChange(HUDState.THINKING);
        
        let displayImage = undefined;
        let pdfInfo = undefined;
        let fileInfo = undefined;

        if (file) {
            fileInfo = { name: file.name, type: file.type, size: file.data?.length };
            if (file.type === 'image') {
                displayImage = `data:${file.mimeType || 'image/jpeg'};base64,${file.data}`;
            } else if (file.type === 'pdf') {
                pdfInfo = { name: file.name, size: file.data?.length };
            }
        }
        
        let displayText = text;
        if (file && file.type === 'text') {
            displayText += `\n[Attached: ${file.name}]`;
        } else if (file && file.type === 'pdf') {
            displayText = displayText ? `${displayText}\n[Attached PDF: ${file.name}]` : `[Attached PDF: ${file.name}]`;
        }

        const userMsg: ChatMessage = { 
            role: 'user', 
            text: displayText, 
            timestamp: Date.now(), 
            image: displayImage, 
            pdf: pdfInfo,
            fileInfo: fileInfo
        };
        this.callbacks.onMessageAdded(userMsg);
        appendMessageToMemory(this.user, userMsg);
        
        const startTime = Date.now();
        try {
            // Check for Agent task distribution first (if no file is attached)
            if (!file) {
                const plan = planTaskDistribution(text);
                if (plan.type === 'SINGLE_AGENT' && plan.primaryAgent) {
                    this.callbacks.onShowChat?.(true);
                    this.callbacks.onAgentHighlight?.(plan.primaryAgent.id);
                    this.callbacks.onStateChange(HUDState.SPEAKING);
                    if (plan.announcement) {
                        await this.callbacks.onSpeak(plan.announcement);
                    }
                    this.callbacks.onStateChange(HUDState.THINKING);
                    const agentResult = await executeAgentTask(plan.primaryAgent, text, this.user);
                    
                    const agentMsg: ChatMessage = {
                        role: 'model',
                        text: agentResult.text,
                        timestamp: Date.now(),
                        image: agentResult.image,
                        video: agentResult.video,
                        isGenerated: agentResult.isGenerated,
                        agentId: plan.primaryAgent.id,
                        agentName: plan.primaryAgent.name,
                        agentRole: plan.primaryAgent.role,
                        agentColor: plan.primaryAgent.color
                    };
                    this.callbacks.onMessageAdded(agentMsg);
                    appendMessageToMemory(this.user, agentMsg);

                    if (agentResult.image || agentResult.video) {
                        this.callbacks.onAction(agentResult.video ? 'GENERATE_VIDEO' : 'GENERATE_IMAGE', {
                            prompt: text,
                            image: agentResult.image,
                            video: agentResult.video
                        });
                    }

                    this.callbacks.onStateChange(HUDState.SPEAKING);
                    const excerpt = agentResult.text.split('\n')[0]?.slice(0, 220) || `${plan.primaryAgent.name} execution complete.`;
                    if (this.callbacks.onSpeakAgent) {
                        await this.callbacks.onSpeakAgent(plan.primaryAgent, excerpt);
                    } else {
                        await this.callbacks.onSpeak(excerpt);
                    }
                    this.callbacks.onAgentHighlight?.(null);
                    this.callbacks.onStateChange(HUDState.IDLE);
                    return;
                } else if (plan.type === 'MULTI_AGENT_SWARM' && plan.swarmAgents) {
                    this.callbacks.onShowChat?.(true);
                    this.callbacks.onStateChange(HUDState.SPEAKING);
                    
                    const introMsg: ChatMessage = {
                        role: 'model',
                        text: plan.announcement,
                        timestamp: Date.now()
                    };
                    this.callbacks.onMessageAdded(introMsg);
                    appendMessageToMemory(this.user, introMsg);
                    await this.callbacks.onSpeak(plan.announcement);

                    for (const agent of plan.swarmAgents) {
                        this.callbacks.onAgentHighlight?.(agent.id);
                        this.callbacks.onStateChange(HUDState.THINKING);
                        const agentResult = await executeAgentTask(agent, text, this.user);

                        const agentMsg: ChatMessage = {
                            role: 'model',
                            text: agentResult.text,
                            timestamp: Date.now(),
                            image: agentResult.image,
                            video: agentResult.video,
                            isGenerated: agentResult.isGenerated,
                            agentId: agent.id,
                            agentName: agent.name,
                            agentRole: agent.role,
                            agentColor: agent.color
                        };
                        this.callbacks.onMessageAdded(agentMsg);
                        appendMessageToMemory(this.user, agentMsg);

                        if (agentResult.image || agentResult.video) {
                            this.callbacks.onAction(agentResult.video ? 'GENERATE_VIDEO' : 'GENERATE_IMAGE', {
                                prompt: text,
                                image: agentResult.image,
                                video: agentResult.video
                            });
                        }

                        this.callbacks.onStateChange(HUDState.SPEAKING);
                        const spokenExcerpt = agentResult.text.split('\n')[0]?.slice(0, 180) || `${agent.name} status report delivered.`;
                        if (this.callbacks.onSpeakAgent) {
                            await this.callbacks.onSpeakAgent(agent, spokenExcerpt);
                        } else {
                            await this.callbacks.onSpeak(spokenExcerpt);
                        }
                    }
                    this.callbacks.onAgentHighlight?.(null);
                    this.callbacks.onStateChange(HUDState.IDLE);
                    return;
                }
            }

            const response = await generateTextResponse(text, this.user, this.config.naughtyModeOverride, file || undefined);
            const latency = Date.now() - startTime;
            recordInteractionEvolution(true, latency);

            if (response.action === 'GENERATE_IMAGE') {
                this.callbacks.onShowChat?.(true);
                this.callbacks.onAgentHighlight?.('agent_aura');
                const prompt = response.actionParams?.prompt || text;
                
                // Immediately add a message to the chat
                const modelMsg: ChatMessage = { 
                    role: 'model', 
                    text: response.text || `Maine aapke liye "${prompt}" ki image generate kar di hai!`, 
                    timestamp: Date.now(), 
                    isGenerated: true,
                    agentId: 'agent_aura',
                    agentName: 'AURA',
                    agentRole: 'Multimodal Vision AI',
                    agentColor: '#A855F7'
                };
                this.callbacks.onMessageAdded(modelMsg);
                appendMessageToMemory(this.user, modelMsg);

                // Run generation in background
                this.executeAction('GENERATE_IMAGE', { prompt, messageId: modelMsg.timestamp });
                
                await this.callbacks.onSpeak("Main aapke liye image create kar rahi hoon, bas ek second...");
                return;
            }

            if (response.action === 'GENERATE_VIDEO') {
                this.callbacks.onShowChat?.(true);
                this.callbacks.onAgentHighlight?.('agent_aura');
                const prompt = response.actionParams?.prompt || text;
                
                const modelMsg: ChatMessage = { 
                    role: 'model', 
                    text: response.text || `Maine aapke liye "${prompt}" ka motion video generate kar diya hai!`, 
                    timestamp: Date.now(), 
                    isGenerated: true,
                    agentId: 'agent_aura',
                    agentName: 'AURA',
                    agentRole: 'Multimodal Vision AI',
                    agentColor: '#A855F7'
                };
                this.callbacks.onMessageAdded(modelMsg);
                appendMessageToMemory(this.user, modelMsg);

                this.executeAction('GENERATE_VIDEO', { prompt, messageId: modelMsg.timestamp });
                
                await this.callbacks.onSpeak("Main aapke liye motion video synthesize kar rahi hoon...");
                return;
            }

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

            case 'GENERATE_IMAGE':
                this.callbacks.onShowChat?.(true);
                this.callbacks.onAgentHighlight?.('agent_aura');
                this.callbacks.onStateChange(HUDState.GENERATING);
                setTimeout(async () => {
                    try {
                        const prompt = params?.prompt || 'creative digital artwork';
                        if (!params?.messageId) {
                            await this.callbacks.onSpeak("Main image generate kar rahi hoon, ek second...");
                        }
                        const img = params?.image || await generateImageContent(prompt);
                        if (img) {
                            const msg: ChatMessage = {
                                role: 'model',
                                text: params?.messageId ? `Here is your generated image:` : `Maine aapke liye "${prompt}" ki image generate kar di hai!`,
                                timestamp: Date.now(),
                                image: img,
                                isGenerated: true,
                                agentId: 'agent_aura',
                                agentName: 'AURA',
                                agentRole: 'Multimodal Vision AI',
                                agentColor: '#A855F7'
                            };
                            this.callbacks.onMessageAdded(msg);
                            const activeUser = this.user || (() => {
                                try {
                                    const u = localStorage.getItem('nexa_user');
                                    return u ? JSON.parse(u) : null;
                                } catch(e) { return null; }
                            })();
                            if (activeUser) {
                                appendMessageToMemory(activeUser, msg);
                            }
                            if (!params?.messageId) {
                                await this.callbacks.onSpeak("Aapki image screen par show ho gayi hai!");
                            } else {
                                await this.callbacks.onSpeak("Image screen par aa gayi hai, check karein.");
                            }
                        }
                    } catch (err) {
                        console.error("Image action error:", err);
                    } finally {
                        this.callbacks.onAgentHighlight?.(null);
                        this.callbacks.onStateChange(HUDState.IDLE);
                    }
                }, 50);
                break;

            case 'GENERATE_VIDEO':
                this.callbacks.onShowChat?.(true);
                this.callbacks.onAgentHighlight?.('agent_aura');
                this.callbacks.onStateChange(HUDState.GENERATING);
                setTimeout(async () => {
                    try {
                        const prompt = params?.prompt || 'cinematic motion visual';
                        if (!params?.messageId) {
                            await this.callbacks.onSpeak("Main aapke liye motion video create kar rahi hoon...");
                        }
                        const vid = params?.video || await generateVideoContent(prompt);
                        if (vid) {
                            const msg: ChatMessage = {
                                role: 'model',
                                text: params?.messageId ? `Here is your generated video:` : `Maine aapke liye "${prompt}" ka motion video generate kar diya hai!`,
                                timestamp: Date.now(),
                                video: vid,
                                isGenerated: true,
                                agentId: 'agent_aura',
                                agentName: 'AURA',
                                agentRole: 'Multimodal Vision AI',
                                agentColor: '#A855F7'
                            };
                            this.callbacks.onMessageAdded(msg);
                            const activeUser = this.user || (() => {
                                try {
                                    const u = localStorage.getItem('nexa_user');
                                    return u ? JSON.parse(u) : null;
                                } catch(e) { return null; }
                            })();
                            if (activeUser) {
                                appendMessageToMemory(activeUser, msg);
                            }
                            if (!params?.messageId) {
                                await this.callbacks.onSpeak("Aapka video ready ho gaya hai, screen par dekhiye!");
                            } else {
                                await this.callbacks.onSpeak("Aapka video screen par aa gaya hai.");
                            }
                        }
                    } catch (err) {
                        console.error("Video action error:", err);
                    } finally {
                        this.callbacks.onAgentHighlight?.(null);
                        this.callbacks.onStateChange(HUDState.IDLE);
                    }
                }, 50);
                break;

            default:
                this.callbacks.onAction(action, params);
                break;
        }
    }
}
