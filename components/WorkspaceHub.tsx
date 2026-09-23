import React, { useState, useEffect } from 'react';
import { Mail, FileText, LayoutList, Plus, Send, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { 
  fetchRecentEmails, 
  sendEmail, 
  fetchTasks, 
  addTask, 
  createSpreadsheet, 
  appendToSheet,
  fetchRecentDocs,
  fetchRecentSheets,
  fetchRecentDriveFiles 
} from '../services/workspaceService';
import { getWorkspaceAccessToken, signInWithGoogle } from '../services/firebaseConfig';

export const WorkspaceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'docs' | 'sheets' | 'gmail' | 'tasks'>('docs');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Docs & Drive State
  const [docsList, setDocsList] = useState<any[]>([]);
  const [docsSearch, setDocsSearch] = useState('');

  // Sheets State
  const [sheetsList, setSheetsList] = useState<any[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseItem, setExpenseItem] = useState('');
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);

  // Gmail State
  const [emails, setEmails] = useState<any[]>([]);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Tasks State
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    const token = getWorkspaceAccessToken();
    setIsConnected(!!token);
    
    const savedSheetId = localStorage.getItem('nexa_sheet_id');
    if (savedSheetId) {
      setActiveSheetId(savedSheetId);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      if (activeTab === 'docs') loadDocs();
      if (activeTab === 'sheets') loadSheets();
      if (activeTab === 'gmail') loadEmails();
      if (activeTab === 'tasks') loadTasks();
    }
  }, [activeTab, isConnected]);

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    const result = await signInWithGoogle();
    if (result.accessToken) {
      setIsConnected(true);
      setError('');
      // Reload current tab data
      if (activeTab === 'docs') loadDocs();
      if (activeTab === 'sheets') loadSheets();
      if (activeTab === 'gmail') loadEmails();
      if (activeTab === 'tasks') loadTasks();
    } else {
      setError(result.error || 'Connection failed. Please check popup permissions.');
    }
    setLoading(false);
  };

  const loadDocs = async () => {
    try {
      setLoading(true);
      setError('');
      const docs = await fetchRecentDocs(25);
      if (docs && docs.length > 0) {
        setDocsList(docs);
      } else {
        // Fallback to all non-trashed drive files if docs query returns 0
        const allFiles = await fetchRecentDriveFiles(25);
        setDocsList(allFiles.filter((f: any) => !f.mimeType?.includes('spreadsheet')));
      }
    } catch (err: any) {
      console.error("Failed to load Docs:", err);
      setError(err.message || 'Failed to fetch Google Docs. Please try reconnecting Google.');
    } finally {
      setLoading(false);
    }
  };

  const loadSheets = async () => {
    try {
      setLoading(true);
      setError('');
      const sheets = await fetchRecentSheets(25);
      setSheetsList(sheets || []);
    } catch (err: any) {
      console.error("Failed to load Sheets:", err);
      setError(err.message || 'Failed to fetch Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchRecentEmails(8);
      setEmails(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject) return;
    try {
      setLoading(true);
      await sendEmail(composeTo, composeSubject, composeBody);
      alert('Email sent successfully via Gmail!');
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      await loadEmails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchTasks();
      setTasks(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle) return;
    try {
      setLoading(true);
      await addTask('@default', newTaskTitle);
      setNewTaskTitle('');
      await loadTasks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!sheetName) return;
    try {
      setLoading(true);
      const sheet = await createSpreadsheet(sheetName);
      setActiveSheetId(sheet.spreadsheetId);
      localStorage.setItem('nexa_sheet_id', sheet.spreadsheetId);
      
      // Add standard headers
      await appendToSheet(sheet.spreadsheetId, 'Sheet1!A1:C1', [['Date', 'Item', 'Amount (INR)']]);
      setSheetName('');
      await loadSheets();
      alert('Expense Tracker Sheet created! Nexa will now log expenses here.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogExpense = async () => {
    if (!activeSheetId || !expenseItem || !expenseAmount) return;
    try {
      setLoading(true);
      const date = new Date().toLocaleDateString();
      await appendToSheet(activeSheetId, 'Sheet1!A:C', [[date, expenseItem, expenseAmount]]);
      alert(`Logged: ₹${expenseAmount} for ${expenseItem}`);
      setExpenseItem('');
      setExpenseAmount('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = docsList.filter(doc => 
    doc.name.toLowerCase().includes(docsSearch.toLowerCase())
  );

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-blue-950/40 border border-blue-800/60 rounded-full flex items-center justify-center text-blue-400">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-mono text-white">Google Workspace Hub</h3>
        <p className="text-sm text-zinc-400 font-mono max-w-md">
          Sign in with Google to access your Google Docs, Google Sheets, Gmail, and Tasks directly in Nexa.
        </p>
        <button 
          onClick={handleConnect}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-lg active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          {loading ? 'Connecting...' : 'Sign in with Google'}
        </button>
        {error && <p className="text-xs text-red-400 mt-2 max-w-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-mono rounded-xl overflow-hidden border border-zinc-800">
      {/* Header Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900 overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'docs' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-950/30' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <FileText className="w-4 h-4 text-blue-400" /> DOCS & DRIVE
        </button>
        <button 
          onClick={() => setActiveTab('sheets')}
          className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'sheets' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/30' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <LayoutList className="w-4 h-4 text-emerald-400" /> SHEETS
        </button>
        <button 
          onClick={() => setActiveTab('gmail')}
          className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'gmail' ? 'text-red-400 border-b-2 border-red-400 bg-red-950/30' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <Mail className="w-4 h-4 text-red-400" /> GMAIL
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-3 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'tasks' ? 'text-green-400 border-b-2 border-green-400 bg-green-950/30' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" /> TASKS
        </button>
      </div>

      {/* Reconnect / Sync Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Google Connected</span>
        </div>
        <button 
          onClick={handleConnect}
          disabled={loading}
          className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
          title="Refresh permissions to ensure Drive, Docs, and Sheets access"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync / Refresh Permissions</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 text-xs rounded flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              <button 
                onClick={handleConnect} 
                className="mt-2 inline-block px-3 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded text-[11px]"
              >
                Reconnect & Grant Permissions
              </button>
            </div>
          </div>
        )}

        {/* ===================== DOCS TAB ===================== */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Your Google Docs</h3>
                <p className="text-[10px] text-zinc-400">Documents opened or created in your Google account</p>
              </div>
              <button 
                onClick={loadDocs} 
                className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-xs transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Docs Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search documents by title..."
                value={docsSearch}
                onChange={e => setDocsSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              {filteredDocs.map(file => (
                <a 
                  key={file.id} 
                  href={file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-between p-3 rounded bg-zinc-900/90 border border-zinc-800/80 hover:border-blue-500/50 hover:bg-zinc-900 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded bg-blue-950/50 border border-blue-900 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-blue-300">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {file.viewedByMeTime 
                          ? `Opened: ${new Date(file.viewedByMeTime).toLocaleDateString()}`
                          : `Modified: ${new Date(file.modifiedTime).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 shrink-0 ml-2" />
                </a>
              ))}

              {filteredDocs.length === 0 && !loading && (
                <div className="text-center py-8 px-4 bg-zinc-900/40 rounded border border-zinc-800/50 space-y-3">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-semibold">No Google Docs visible</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    If you have existing Google Docs, please tap below to grant Google Drive Read permissions so Nexa can show them.
                  </p>
                  <button 
                    onClick={handleConnect}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Grant Google Drive Permissions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== SHEETS TAB ===================== */}
        {activeTab === 'sheets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Your Google Sheets</h3>
                <p className="text-[10px] text-zinc-400">Spreadsheets from your Google account</p>
              </div>
              <button 
                onClick={loadSheets} 
                className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-xs transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* List of existing Google Sheets */}
            <div className="space-y-2">
              {sheetsList.map(sheet => (
                <div 
                  key={sheet.id}
                  className="flex items-center justify-between p-3 rounded bg-zinc-900/90 border border-zinc-800/80 hover:border-emerald-500/50 transition-colors"
                >
                  <a 
                    href={sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="w-8 h-8 rounded bg-emerald-950/50 border border-emerald-900 flex items-center justify-center shrink-0">
                      <LayoutList className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-emerald-300">
                        {sheet.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Modified: {new Date(sheet.modifiedTime).toLocaleDateString()}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0 ml-2" />
                  </a>

                  {/* Button to set as active expense sheet */}
                  <button 
                    onClick={() => {
                      setActiveSheetId(sheet.id);
                      localStorage.setItem('nexa_sheet_id', sheet.id);
                      alert(`Set "${sheet.name}" as your active Expense Tracker sheet!`);
                    }}
                    className={`ml-3 px-2 py-1 rounded text-[10px] font-semibold border transition-colors shrink-0 ${activeSheetId === sheet.id ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                  >
                    {activeSheetId === sheet.id ? 'Active Tracker' : 'Use as Tracker'}
                  </button>
                </div>
              ))}

              {sheetsList.length === 0 && !loading && (
                <div className="text-center py-6 text-zinc-500 text-xs italic">
                  No spreadsheets found in your Google Drive.
                </div>
              )}
            </div>

            {/* Expense Tracker Configuration */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Expense Tracker Setup</h4>
              <p className="text-[10px] text-zinc-400">
                Create a dedicated Google Sheet to log daily expenses seamlessly via Nexa voice/chat.
              </p>

              {!activeSheetId ? (
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="e.g. My Expense Log 2026"
                    value={sheetName}
                    onChange={e => setSheetName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={handleCreateSheet}
                    disabled={loading || !sheetName}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2 rounded text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {loading ? 'Creating...' : 'Create New Tracker Sheet'}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Expense Tracker Connected</span>
                    </div>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('nexa_sheet_id');
                        setActiveSheetId(null);
                      }}
                      className="text-[10px] text-zinc-400 hover:text-red-400 underline"
                    >
                      Unlink
                    </button>
                  </div>

                  {/* Quick test expense logger */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-900/40">
                    <input 
                      type="text" 
                      placeholder="Item (e.g. Coffee)"
                      value={expenseItem}
                      onChange={e => setExpenseItem(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 outline-none"
                    />
                    <input 
                      type="number" 
                      placeholder="Amount (₹)"
                      value={expenseAmount}
                      onChange={e => setExpenseAmount(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleLogExpense}
                    disabled={loading || !expenseItem || !expenseAmount}
                    className="w-full py-1.5 bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Quick Log Expense to Sheet
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== GMAIL TAB ===================== */}
        {activeTab === 'gmail' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs text-red-400 font-bold uppercase tracking-wider">Recent Inbox</h4>
                <button onClick={loadEmails} className="hover:text-white" disabled={loading}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-2">
                {emails.map(email => (
                  <div key={email.id} className="p-3 bg-zinc-900 rounded border border-zinc-800 text-xs">
                    <div className="flex justify-between text-zinc-500 mb-1">
                      <span className="truncate w-2/3">{email.from}</span>
                      <span>{email.date.toLocaleDateString()}</span>
                    </div>
                    <div className="font-bold text-zinc-200">{email.subject}</div>
                    <div className="text-zinc-400 mt-1 line-clamp-2">{email.snippet}</div>
                  </div>
                ))}
                {emails.length === 0 && !loading && <p className="text-xs text-zinc-500 italic">No recent emails.</p>}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <h4 className="text-xs text-red-400 font-bold uppercase tracking-wider">Compose Email</h4>
              <input 
                type="email" 
                placeholder="To (recipient email)" 
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded p-2 text-xs focus:border-red-500 outline-none"
              />
              <input 
                type="text" 
                placeholder="Subject" 
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded p-2 text-xs focus:border-red-500 outline-none"
              />
              <textarea 
                placeholder="Message body" 
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded p-2 text-xs h-24 focus:border-red-500 outline-none resize-none"
              />
              <button 
                onClick={handleSendEmail}
                disabled={loading || !composeTo || !composeSubject}
                className="w-full flex items-center justify-center gap-2 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-bold disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> {loading ? 'Sending...' : 'Send via Gmail'}
              </button>
            </div>
          </div>
        )}

        {/* ===================== TASKS TAB ===================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs text-green-400 font-bold uppercase tracking-wider">Google Tasks</h4>
              <button onClick={loadTasks} className="hover:text-white" disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Add a new task..." 
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                className="flex-1 bg-black border border-zinc-800 rounded p-2 text-xs focus:border-green-500 outline-none"
              />
              <button 
                onClick={handleAddTask}
                disabled={loading || !newTaskTitle}
                className="px-3 bg-green-900 text-green-400 border border-green-800 rounded hover:bg-green-800 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 mt-4">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 p-2 hover:bg-zinc-900 rounded group">
                  <div className={`w-3 h-3 rounded-sm border ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-zinc-600 group-hover:border-green-500'}`} />
                  <span className={`text-xs ${task.status === 'completed' ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                    {task.title}
                  </span>
                </div>
              ))}
              {tasks.length === 0 && !loading && <p className="text-xs text-zinc-500 italic">No tasks found.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
