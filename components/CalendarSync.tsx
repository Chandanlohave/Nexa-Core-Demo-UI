import React, { useState } from 'react';
import { fetchUpcomingBirthdays, setCalendarAccessToken } from '../services/googleCalendarService';
import { db } from '../services/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const CalendarSync: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMessage('Requesting Calendar access...');
    
    try {
      setMessage('Fetching events using Workspace token...');
      const token = localStorage.getItem('nexa_workspace_token');
      if (!token) {
          setMessage('Error: Please connect Google Workspace first (Cloud icon).');
          setSyncing(false);
          return;
      }
      setCalendarAccessToken(token);
      const events = await fetchUpcomingBirthdays();
      
      setMessage('Saving to database...');
      const eventsRef = doc(db, 'system', 'calendar_events');
      await setDoc(eventsRef, { events, lastSynced: new Date().toISOString() }, { merge: true });
      
      setMessage(`Success! Synced ${events.length} events.`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
      <h3 className="text-sm font-mono text-nexa-cyan mb-2">Google Calendar Integration</h3>
      <p className="text-xs text-zinc-400 mb-4">
        Sync family birthdays and festivals so Nexa can automatically send WhatsApp/SMS wishes.
      </p>
      <button 
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 bg-nexa-cyan text-black font-mono text-xs uppercase hover:bg-opacity-80 transition-colors disabled:opacity-50"
      >
        {syncing ? 'Syncing...' : 'Sync Calendar Events'}
      </button>
      {message && <p className="mt-2 text-xs text-zinc-300">{message}</p>}
    </div>
  );
};
