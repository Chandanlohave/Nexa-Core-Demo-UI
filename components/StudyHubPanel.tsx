
import React, { useState, useEffect } from 'react';
import { getStudyHubSchedule, generateBookTopics, isUserBhabhi, generateComprehensiveBookGuide } from '../services/geminiService';
import { getUserSchedule, saveUserSchedule, fetchSystemConfig } from '../services/memoryService';
import { UserProfile, UserRole, StudyHubSubject } from '../types';

interface StudyHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onStartLesson: (subject: StudyHubSubject, topic?: string, mode?: 'text' | 'live') => void;
}

const StudyHubPanel: React.FC<StudyHubPanelProps> = ({ isOpen, onClose, user, onStartLesson }) => {
  const [schedule, setSchedule] = useState<StudyHubSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<StudyHubSubject | null>(null);
  const [generatingTopics, setGeneratingTopics] = useState(false);
  
  // Download Logic States
  const [downloadLang, setDownloadLang] = useState<'english' | 'hindi' | 'hinglish' | null>(null);
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [isKimiEnabled, setIsKimiEnabled] = useState(false); // NEW
  
  // Form state for adding new subject
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // LOGIC: Admin and Bhabhi see defaults. Users start empty. Everyone can add.
  const hasDefaultAccess = user.role === UserRole.ADMIN || isUserBhabhi(user);

  useEffect(() => {
    if (isOpen) {
        loadSchedule();
        checkKimiAvailability(); // Check on open
        setSelectedSubject(null);
    }
  }, [isOpen, user]);

  const checkKimiAvailability = async () => {
      try {
          const sys = await fetchSystemConfig();
          if (sys?.kimiKey && sys.kimiKey.trim().length > 10) {
              setIsKimiEnabled(true);
          }
      } catch(e) {}
  };

  const loadSchedule = async () => {
    setLoading(true);
    let finalSchedule: StudyHubSubject[] = [];

    // 1. Get User's Custom Books from DB
    const userCustomBooks = await getUserSchedule(user.mobile);

    // 2. If Admin/Bhabhi, merge with Defaults. If User, just Custom.
    if (hasDefaultAccess) {
        const defaults = getStudyHubSchedule();
        // Avoid duplicates
        const customCodes = new Set(userCustomBooks.map(b => b.courseCode));
        const uniqueDefaults = defaults.filter(d => !customCodes.has(d.courseCode));
        finalSchedule = [...uniqueDefaults, ...userCustomBooks];
    } else {
        finalSchedule = userCustomBooks;
    }

    setSchedule(finalSchedule);
    setLoading(false);
  };

  const handleAddSubject = async () => {
    if (!newCode || !newName) return;
    const newSubject: StudyHubSubject = {
        courseCode: newCode.toUpperCase(),
        courseName: newName,
        date: 'Self-Paced',
        time: 'Flexible',
        topics: [] // Initialize empty
    };
    
    const currentCustom = await getUserSchedule(user.mobile);
    const updatedCustom = [...currentCustom, newSubject];
    
    await saveUserSchedule(user.mobile, updatedCustom);
    loadSchedule();
    
    setNewCode('');
    setNewName('');
    setIsAdding(false);
  };

  const handleDeleteSubject = async (subjectToDelete: StudyHubSubject) => {
    if (!confirm(`Remove "${subjectToDelete.courseName}" from your library?`)) return;

    const currentCustom = await getUserSchedule(user.mobile);
    const updatedCustom = currentCustom.filter(s => s.courseCode !== subjectToDelete.courseCode);
    
    await saveUserSchedule(user.mobile, updatedCustom);
    loadSchedule();
  };

  const handleSelectSubject = async (subject: StudyHubSubject) => {
      setSelectedSubject(subject);
      setDownloadLang(null); 
      
      if (!subject.topics || subject.topics.length === 0) {
          setGeneratingTopics(true);
          const topics = await generateBookTopics(subject);
          
          const updatedSubject = { ...subject, topics: topics };
          
          setSelectedSubject(updatedSubject);
          setSchedule(prev => prev.map(s => s.courseCode === subject.courseCode ? updatedSubject : s));
          
          const currentCustom = await getUserSchedule(user.mobile);
          const isCustom = currentCustom.some(s => s.courseCode === subject.courseCode);
          
          if (isCustom) {
              const updatedCustom = currentCustom.map(s => s.courseCode === subject.courseCode ? updatedSubject : s);
              await saveUserSchedule(user.mobile, updatedCustom);
          }
          
          setGeneratingTopics(false);
      }
  };

  const handleTopicClick = (topic: string) => {
      if (selectedSubject) {
          onStartLesson(selectedSubject, topic, 'text');
      }
  };

  const handleGenerateDownload = async (lang: string) => {
      if (!selectedSubject) return;
      setIsGeneratingDownload(true);
      setDownloadLang(null);

      const content = await generateComprehensiveBookGuide(selectedSubject, lang);
      
      const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSubject.courseCode}_${lang.toUpperCase()}_GUIDE_${isKimiEnabled ? 'KIMI_PRO' : 'STANDARD'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      setIsGeneratingDownload(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl bg-black border border-nexa-blue/30 shadow-[0_0_50px_rgba(0,119,255,0.2)] h-[90vh] flex flex-col rounded-lg overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-nexa-blue/20 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                  <h2 className="text-nexa-blue text-lg font-bold tracking-widest font-mono flex items-center gap-2">
                     {selectedSubject ? selectedSubject.courseName.toUpperCase() : "STUDY HUB: LIBRARY"}
                     {isKimiEnabled && <span className="px-1.5 py-0.5 bg-purple-900 border border-purple-500 text-purple-400 text-[9px] rounded font-bold animate-pulse">KIMI ENGINE ACTIVE</span>}
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-mono">
                      {hasDefaultAccess ? "PREMIUM ACCESS ENABLED" : "STUDENT ACCOUNT ACTIVE"}
                  </p>
              </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-xs font-mono tracking-widest uppercase transition-all">CLOSE</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
            
            {/* LEFT: BOOK SHELF */}
            <div className={`flex-1 overflow-y-auto no-scrollbar p-4 bg-zinc-950/50 ${selectedSubject ? 'hidden md:block md:w-1/3 md:flex-none border-r border-zinc-800' : 'w-full'}`}>
                
                {/* ADD BOOK BUTTON */}
                {!isAdding ? (
                    <button 
                        onClick={() => setIsAdding(true)} 
                        className="w-full py-4 mb-4 border border-dashed border-zinc-700 text-zinc-500 hover:text-nexa-cyan hover:border-nexa-cyan/50 hover:bg-nexa-cyan/5 transition-all text-xs font-mono tracking-widest uppercase flex flex-col items-center gap-2"
                    >
                        <span className="text-2xl">+</span>
                        ADD NEW SUBJECT / BOOK
                    </button>
                ) : (
                    <div className="mb-6 p-4 bg-zinc-900 border border-nexa-cyan/30 rounded-lg animate-slide-up space-y-3">
                        <div className="text-nexa-cyan text-[10px] font-mono uppercase">Add to Library</div>
                        <input 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Book Name (e.g. Physics HC Verma)" 
                            className="w-full bg-black border border-zinc-700 text-white px-3 py-2 text-sm focus:border-nexa-cyan outline-none"
                        />
                        <input 
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            placeholder="Short Code (e.g. PHY01)" 
                            className="w-full bg-black border border-zinc-700 text-white px-3 py-2 text-sm focus:border-nexa-cyan outline-none uppercase"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-zinc-500 hover:text-white text-xs border border-zinc-700">CANCEL</button>
                            <button onClick={handleAddSubject} className="flex-1 py-2 bg-nexa-cyan text-black font-bold text-xs hover:bg-white transition-colors">SAVE</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-10 text-nexa-blue animate-pulse font-mono text-xs">LOADING LIBRARY...</div>
                ) : schedule.length === 0 ? (
                    <div className="text-center py-20 text-zinc-600 font-mono text-xs">
                        LIBRARY EMPTY.<br/>ADD BOOKS TO START STUDYING.
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {schedule.map((subject, index) => (
                        <div 
                            key={index} 
                            onClick={() => handleSelectSubject(subject)}
                            className={`relative p-4 border cursor-pointer transition-all rounded group ${selectedSubject?.courseCode === subject.courseCode ? 'bg-nexa-blue/10 border-nexa-blue' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-zinc-500 font-mono text-[10px] mb-1">{subject.courseCode}</div>
                                    <div className={`font-bold ${selectedSubject?.courseCode === subject.courseCode ? 'text-nexa-cyan' : 'text-zinc-300'} text-sm leading-tight`}>{subject.courseName}</div>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-between items-end">
                                <div className="text-[10px] text-zinc-600 font-mono">
                                    {subject.topics ? `${subject.topics.length} TOPICS` : 'SCANNING...'}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject); }}
                                    className="text-zinc-700 hover:text-red-500 transition-colors px-2"
                                    title="Delete Book"
                                >
                                    &times;
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT: CONTENT AREA */}
            {selectedSubject ? (
                <div className="flex-[2] flex flex-col bg-zinc-900/30 p-6 animate-fade-in relative h-full min-h-0 overflow-hidden">
                    <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4 shrink-0">
                        <div>
                            <div className="text-nexa-cyan font-mono text-xs tracking-widest uppercase mb-1">CURRENT SELECTION</div>
                            <h1 className="text-2xl font-bold text-white">{selectedSubject.courseName}</h1>
                        </div>
                        <div className="flex gap-2 relative">
                            <button onClick={() => setSelectedSubject(null)} className="md:hidden px-3 py-1 border border-zinc-700 text-zinc-400 text-xs">BACK</button>
                            
                            {/* DOWNLOAD DROPDOWN AREA */}
                            <div className="relative">
                                {isGeneratingDownload ? (
                                    <button disabled className="px-4 py-2 bg-zinc-900 text-nexa-cyan border border-nexa-cyan/30 text-xs font-mono tracking-wider animate-pulse flex items-center gap-2">
                                        <div className="w-2 h-2 bg-nexa-cyan rounded-full animate-bounce"></div>
                                        {isKimiEnabled ? "DEEP ANALYSIS (KIMI)..." : "GENERATING..."}
                                    </button>
                                ) : downloadLang ? (
                                    <div className="absolute top-0 right-0 bg-black border border-nexa-cyan/50 z-50 flex flex-col w-48 shadow-2xl animate-fade-in">
                                        <div className={`text-[10px] font-mono text-center py-1 border-b ${isKimiEnabled ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' : 'bg-nexa-cyan/10 text-nexa-cyan border-nexa-cyan/20'}`}>
                                            {isKimiEnabled ? 'KIMI 128K MODE' : 'SELECT LANGUAGE'}
                                        </div>
                                        <button onClick={() => handleGenerateDownload('english')} className="text-xs text-white hover:bg-nexa-cyan hover:text-black py-2 border-b border-zinc-800 transition-colors">ENGLISH</button>
                                        <button onClick={() => handleGenerateDownload('hindi')} className="text-xs text-white hover:bg-nexa-cyan hover:text-black py-2 border-b border-zinc-800 transition-colors">HINDI (हिंदी)</button>
                                        <button onClick={() => handleGenerateDownload('hinglish')} className="text-xs text-white hover:bg-nexa-cyan hover:text-black py-2 border-b border-zinc-800 transition-colors">HINGLISH</button>
                                        <button onClick={() => setDownloadLang(null)} className="text-[10px] text-red-500 py-1 hover:bg-red-900/20">CANCEL</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setDownloadLang('english')} className={`px-4 py-2 text-xs font-mono tracking-wider transition-all flex items-center gap-2 ${isKimiEnabled ? 'bg-purple-900/30 text-purple-400 border border-purple-500 hover:bg-purple-900/50' : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700 hover:text-white'}`}>
                                        <span className="text-lg">⬇</span> 
                                        {isKimiEnabled ? "GENERATE DEEP GUIDE (KIMI)" : "DOWNLOAD BOOK"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                         {generatingTopics ? (
                             <div className="flex flex-col items-center justify-center h-full gap-4">
                                 <div className="w-12 h-12 border-2 border-nexa-blue border-t-transparent rounded-full animate-spin"></div>
                                 <div className="text-nexa-blue text-xs font-mono animate-pulse tracking-widest">ANALYZING BOOK STRUCTURE...</div>
                             </div>
                         ) : (
                             <div className="space-y-2 pb-4">
                                <div className="text-zinc-500 text-xs font-mono uppercase mb-2 ml-1">Table of Contents</div>
                                {selectedSubject.topics && selectedSubject.topics.length > 0 ? (
                                    selectedSubject.topics.map((topic, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleTopicClick(topic)}
                                            className="w-full text-left p-4 bg-black border border-zinc-800 hover:border-nexa-cyan/50 hover:bg-nexa-cyan/5 text-zinc-300 text-sm transition-all rounded flex items-center justify-between group"
                                        >
                                            <span className="group-hover:text-white"><span className="text-zinc-600 mr-3 font-mono">{(i+1).toString().padStart(2, '0')}</span> {topic}</span>
                                            <span className="text-nexa-cyan opacity-0 group-hover:opacity-100 text-[10px] font-mono tracking-widest">READ NOW &rarr;</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center text-zinc-500 py-10">
                                        No topics found.
                                        <button onClick={() => handleSelectSubject(selectedSubject)} className="block mx-auto mt-2 text-nexa-blue underline">Retry Scan</button>
                                    </div>
                                )}
                             </div>
                         )}
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800 shrink-0">
                        <button 
                            onClick={() => onStartLesson(selectedSubject, undefined, 'text')}
                            className="py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-transparent font-bold text-xs tracking-[0.2em] uppercase transition-colors"
                        >
                            READ SUMMARY (TEXT)
                        </button>
                        <button 
                            onClick={() => onStartLesson(selectedSubject, undefined, 'live')}
                            className="py-4 bg-nexa-blue text-black font-bold text-xs tracking-[0.2em] uppercase hover:bg-white transition-colors relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                                START LIVE READING
                            </span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-[2] items-center justify-center bg-zinc-900/20 text-zinc-700 font-mono text-xs tracking-widest">
                    SELECT A BOOK TO BEGIN
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StudyHubPanel;
