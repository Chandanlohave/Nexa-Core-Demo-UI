import { db } from './firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const checkAndSendBirthdayWishes = async () => {
  try {
    const eventsRef = doc(db, 'system', 'calendar_events');
    const docSnap = await getDoc(eventsRef);
    
    if (!docSnap.exists()) return;
    
    const { events, wishedEvents = [] } = docSnap.data();
    if (!events || events.length === 0) return;

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    for (const event of events) {
      // Very basic date matching
      const eventDateStr = event.start?.date || (event.start?.dateTime ? event.start.dateTime.split('T')[0] : null);
      if (!eventDateStr) continue;

      const eventMonthDay = eventDateStr.substring(5, 10);
      const todayMonthDay = todayString.substring(5, 10);

      if (eventMonthDay === todayMonthDay) {
        // It's a birthday today!
        const eventId = `${event.id}_${today.getFullYear()}`;
        
        // Did we already wish them this year?
        if (!wishedEvents.includes(eventId)) {
          const name = event.summary.replace(/birthday/i, '').replace(/bday/i, '').trim();
          const message = `Namaste ${name}! Nexa aur Chandan Sir ki taraf se aapko Janamdin ki bohot bohot shubhkamnaye! 🎉`;

          console.log(`[AutoWisher] Preparing Birthday Wish for ${name}...`);
          try {
            // Replaced Twilio with a system log
            console.log(`[AutoWisher] Would have sent: "${message}"`);
            
            // Mark as wished
            wishedEvents.push(eventId);
            await setDoc(eventsRef, { wishedEvents }, { merge: true });
            console.log(`[AutoWisher] Wish recorded successfully for ${name}!`);
          } catch (error) {
            console.error('[AutoWisher] Failed to record wish:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking birthday wishes:', error);
  }
};
