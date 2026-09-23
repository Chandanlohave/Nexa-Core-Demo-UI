import { getAuth } from "firebase/auth";
import { app } from "./firebaseConfig";

// Store token in memory after GIS flow
let calendarAccessToken = "";

export const setCalendarAccessToken = (token: string) => {
  calendarAccessToken = token;
};

export const fetchUpcomingBirthdays = async () => {
  if (!calendarAccessToken) {
    throw new Error("Calendar access token not available.");
  }
  
  const timeMin = new Date().toISOString();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30); // Next 30 days
  
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?q=birthday&timeMin=${timeMin}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
    headers: {
      Authorization: `Bearer ${calendarAccessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch calendar events");
  }

  const data = await response.json();
  return data.items || [];
};
