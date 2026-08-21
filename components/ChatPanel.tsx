
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ChatMessage, UserRole, HUDState } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  userName?: string;
  userRole?: UserRole;
  hudState?: HUDState;
  onTypingComplete: () => void;
  inputTranscription?: string;
  outputTranscription?: string;
  onClose: () => void; 
}

interface TypewriterProps {
  text: string;
  onComplete: () => void;
  onUpdate: () => void;
}

const TypewriterText: React.FC<TypewriterProps> = ({ text, onComplete, onUpdate }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!text) {
        onComplete();
        return;
    }
    let index = 0;
    const type = () => {
      if (index < text.length) {
        if (spanRef.current) spanRef.current.textContent = text.substring(0, index + 1);
        index++;
        onUpdate();
        timeoutRef.current = window.setTimeout(type, 30 + (Math.random() * 25 - 10));
      } else {
        onComplete();
      }
    };
    if (spanRef.current) spanRef.current.textContent = "";
    type();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [text, onComplete, onUpdate]);
  
  return <span ref={spanRef}></span>;
};

// --- WIDGET COMPONENTS ---
const WeatherWidget: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    const isHot = parseInt(data.temp || '30') > 25;
    return (
        <div className={`mt-3 p-4 rounded-xl border backdrop-blur-md relative overflow-hidden transition-all animate-fade-in ${isHot ? 'bg-orange-500/10 border-orange-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
            <div className={`absolute top-0 right-0 p-12 blur-2xl rounded-full opacity-30 ${isHot ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-mono tracking-widest uppercase opacity-70 mb-1">{data.location || 'LOCATION'}</h3>
                    <div className="text-4xl font-bold font-sans tracking-tight">{data.temp || '--°C'}</div>
                    <div className="text-sm mt-1 font-medium">{data.condition || 'Unknown'}</div>
                </div>
                <div className="text-right">
                    {isHot ? <span className="text-2xl">☀️</span> : <span className="text-2xl">🌧️</span>}
                </div>
            </div>
        </div>
    )
}

const FinanceWidget: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    const isUp = (data.change || '').includes('+');
    return (
        <div className="mt-3 p-4 rounded-xl border border-zinc-700 bg-zinc-900/80 backdrop-blur-md relative overflow-hidden animate-fade-in">
            <div className={`absolute bottom-0 left-0 w-full h-1 ${isUp ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <span className="text-xs font-mono text-zinc-400">SYMBOL</span>
                    <span className="text-xl font-bold font-mono tracking-widest text-white">{data.symbol || 'ASSET'}</span>
                </div>
                <div className={`text-right ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="text-lg font-bold">{data.price || '0.00'}</div>
                    <div className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded inline-block mt-1">{data.change || '0%'}</div>
                </div>
            </div>
        </div>
    )
}

const NewsWidget: React.FC<{ data: any }> = ({ data }) => {
    if (!data || !Array.isArray(data.headlines)) return null;
    return (
        <div className="mt-3 rounded-xl border border-nexa-cyan/30 bg-black/60 backdrop-blur-md overflow-hidden animate-fade-in">
            <div className="px-4 py-2 bg-nexa-cyan/10 border-b border-nexa-cyan/30 flex justify-between items-center">
                <span className="text-xs font-mono text-nexa-cyan tracking-widest">LATEST INTEL</span>
            </div>
            <div className="p-4 space-y-3">
                {data.headlines.map((headline: string, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                        <span className="text-nexa-cyan font-mono text-xs mt-1">{'>>'}</span>
                        <p className="text-sm text-zinc-300 leading-snug cursor-default">{headline}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

const CodeTerminal: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const safeCode = code || ''; // Safety check to prevent crash
    const handleCopy = () => {
        if (!safeCode) return;
        navigator.clipboard.writeText(safeCode).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="mt-4 rounded-lg overflow-hidden border border-zinc-700 bg-[#0d1117] font-mono shadow-lg animate-fade-in group">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="text-[10px] text-zinc-400 tracking-widest uppercase ml-2">CODE SNIPPET</div>
                </div>
                <button 
                    onClick={handleCopy} 
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white'}`}
                >
                    {copied ? (
                        <><span>✓</span> COPIED</>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            COPY CODE
                        </>
                    )}
                </button>
            </div>
            <div className="p-4 overflow-x-auto relative">
                <pre className="text-xs sm:text-sm text-green-400 leading-relaxed whitespace-pre-wrap select-text font-mono">{safeCode}</pre>
            </div>
        </div>
    );
}

const AppLaunchWidget: React.FC<{ data: any }> = ({ data }) => {
    if (!data || !data.code || !data.url) return null;
    return (
        <a 
            href={data.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-3 w-full py-3 bg-zinc-800 border border-nexa-cyan/50 text-nexa-cyan font-bold tracking-widest uppercase rounded hover:bg-nexa-cyan hover:text-black transition-all group animate-fade-in"
        >
            <span>{data.code.replace('TAP TO OPEN ', '')}</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </a>
    );
}

// --- NEW: COPY ICON BUTTON COMPONENT ---
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if (!text) return;
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button onClick={handleCopy} className={`ml-2 transition-colors ${copied ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`} title="Copy Text">
            {copied ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            )}
        </button>
    );
};

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, userName, userRole = UserRole.USER, hudState, onTypingComplete, inputTranscription, outputTranscription, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLive = hudState === HUDState.LIVE;
  const showLiveTranscription = isLive && (inputTranscription || outputTranscription);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, inputTranscription, outputTranscription]);

  useEffect(() => {
    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, hudState, scrollToBottom, inputTranscription, outputTranscription]);

  return (
    <div className="w-full h-full flex flex-col bg-white/50 dark:bg-black/60 border-t border-x border-zinc-200 dark:border-nexa-cyan/20 rounded-t-2xl backdrop-blur-xl overflow-hidden shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
      
      {/* HEADER */}
      <div className="w-full h-12 bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-nexa-cyan/20 flex items-center justify-between px-4 shrink-0 z-10">
         <div className="text-[9px] text-zinc-500 dark:text-nexa-cyan/70 font-mono tracking-widest uppercase flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${isLive ? 'bg-green-500 text-green-500' : 'bg-red-600 text-red-600'}`}></span>
            /// {isLive ? 'LIVE_FEED' : 'CHAT_LOG'} ///
         </div>
         
         <button onClick={onClose} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 group transition-all" aria-label="Minimize Chat">
             <span className="text-[9px] text-zinc-500 group-hover:text-white font-mono tracking-wider hidden sm:block">MINIMIZE</span>
             <svg className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
             </svg>
         </button>
      </div>

      {/* MESSAGES AREA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 scroll-smooth">
        {Array.isArray(messages) && messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLastMessage = idx === messages.length - 1;
          const isModelLastMessage = isLastMessage && !isUser;

          if (isModelLastMessage && hudState === HUDState.THINKING) return null;

          let label = 'NEXA';
          if (isUser) label = userRole === UserRole.ADMIN ? 'ADMIN' : (userName || 'USER').toUpperCase();
          
          const shouldAnimate = isModelLastMessage && (hudState === HUDState.SPEAKING || hudState === HUDState.WARNING);
          
          // SAFETY: Ensure displayContent is a string
          let displayContent = (typeof msg.text === 'string' ? msg.text : '') || '';
          
          const sourceRegex = /\[SOURCE: (.*?) \| (.*?)\]/g;
          const sources: {title: string, url: string}[] = [];
          let match;
          while ((match = sourceRegex.exec(displayContent)) !== null) {
              sources.push({ title: match[1], url: match[2] });
          }
          displayContent = displayContent.replace(sourceRegex, '').trim();

          const parts = [];
          
          if (displayContent) {
              const codeBlockRegex = /```([\s\S]*?)```/g;
              let lastIndex = 0;
              let codeMatch;
              
              if (typeof displayContent === 'string') {
                  while ((codeMatch = codeBlockRegex.exec(displayContent)) !== null) {
                      if (codeMatch.index > lastIndex) {
                          parts.push({ type: 'text', content: displayContent.substring(lastIndex, codeMatch.index) });
                      }
                      let codeContent = codeMatch[1];
                      const firstLineBreak = codeContent.indexOf('\n');
                      if (firstLineBreak > -1 && firstLineBreak < 20) {
                          const firstLine = codeContent.substring(0, firstLineBreak).trim();
                          if (/^[a-zA-Z0-9+#]+$/.test(firstLine)) {
                              codeContent = codeContent.substring(firstLineBreak + 1);
                          }
                      }
                      parts.push({ type: 'code', content: codeContent.trim() });
                      lastIndex = codeBlockRegex.lastIndex;
                  }
                  if (lastIndex < displayContent.length) { parts.push({ type: 'text', content: displayContent.substring(lastIndex) }); }
              } else {
                  parts.push({ type: 'text', content: '' });
              }
          }

          return (
            <div key={msg.timestamp + idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-slide-up`}>
              <div className={`relative max-w-[90%] sm:max-w-[85%] px-4 py-3 rounded-lg ${isUser ? 'bg-nexa-blue/10 border-r-2 border-nexa-blue/50' : 'bg-zinc-800/30 border-l-2 border-nexa-cyan/50'}`}>
                
                {msg.video && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-purple-500/50 shadow-md">
                        <video src={msg.video} autoPlay loop muted playsInline className="w-full object-cover" />
                    </div>
                )}

                {msg.image && (
                    <div className="mb-3 rounded-lg overflow-hidden border border-nexa-cyan/30 shadow-md">
                        <img src={msg.image} alt="Content" className="w-full object-cover" />
                    </div>
                )}

                <div className="text-zinc-800 dark:text-zinc-100 font-sans text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap select-text">
                      {isUser ? displayContent : (
                        <>
                          {shouldAnimate && !isLive ? (
                             <TypewriterText text={displayContent} onComplete={onTypingComplete} onUpdate={scrollToBottom} />
                          ) : (
                             parts.map((part, i) => part.type === 'code' ? <CodeTerminal key={i} code={part.content} /> : <span key={i}>{part.content}</span>)
                          )}
                        </>
                      )}
                </div>
                
                {msg.widget && msg.widget.data && (
                    <div className="my-2 w-full">
                        {msg.widget.type === 'WEATHER' && <WeatherWidget data={msg.widget.data} />}
                        {msg.widget.type === 'FINANCE' && <FinanceWidget data={msg.widget.data} />}
                        {msg.widget.type === 'NEWS' && <NewsWidget data={msg.widget.data} />}
                        
                        {msg.widget.type === 'CODE' && (
                            msg.widget.data.type === 'link' ? (
                                <AppLaunchWidget data={msg.widget.data} />
                            ) : (
                                <CodeTerminal code={msg.widget.data.code || msg.widget.data.content || ''} />
                            )
                        )}
                    </div>
                )}

                {msg.mapLocations && msg.mapLocations.length > 0 && (
                    <div className="mt-3 grid gap-2 w-full">
                        {msg.mapLocations.map((loc, i) => (
                            <div key={i} className="p-2 bg-zinc-900 border border-nexa-cyan/30 rounded flex justify-between items-center">
                                <div><h3 className="text-nexa-cyan font-bold text-xs">{loc.title}</h3><p className="text-[10px] text-zinc-400 truncate w-32">{loc.address}</p></div>
                                <a href={loc.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] bg-nexa-cyan text-black px-2 py-1 rounded font-bold">GO</a>
                            </div>
                        ))}
                    </div>
                )}

                {!isUser && sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-zinc-700/50">
                        {sources.map((src, i) => (
                            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-nexa-cyan hover:underline truncate max-w-[150px] block">
                                🔗 {src.title}
                            </a>
                        ))}
                    </div>
                )}

                <div className={`flex items-center justify-between text-[8px] font-mono uppercase tracking-widest mt-1 opacity-60 ${isUser ? 'text-nexa-blue' : 'text-nexa-cyan'}`}>
                   <span>{label}</span>
                   {/* COPY BUTTON FOR TEXT MESSAGES */}
                   {!isUser && displayContent && <CopyButton text={displayContent} />}
                </div>
              </div>
            </div>
          );
        })}
        
        {hudState === HUDState.LISTENING && (
          <div className="flex justify-end animate-fade-in"><div className="text-xs text-nexa-red font-mono animate-pulse">LISTENING...</div></div>
        )}
        {hudState === HUDState.THINKING && (
          <div className="flex justify-start animate-fade-in"><div className="text-xs text-nexa-yellow font-mono animate-pulse">PROCESSING...</div></div>
        )}
        {hudState === HUDState.GENERATING && (
          <div className="flex justify-start animate-fade-in"><div className="text-xs text-pink-500 font-mono animate-pulse">CREATING VISUALS...</div></div>
        )}
        
        {showLiveTranscription && (
            <div className="sticky bottom-0 left-0 right-0 p-3 bg-black/80 backdrop-blur-sm border-t border-nexa-cyan/20 animate-fade-in rounded-t-lg">
                <div className="space-y-1">
                    {inputTranscription && <p className="text-xs text-zinc-400 font-mono">YOU: {inputTranscription}</p>}
                    {outputTranscription && <p className="text-xs text-nexa-cyan font-mono">NEXA: {outputTranscription}</p>}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
