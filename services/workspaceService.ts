import { getWorkspaceAccessToken } from './firebaseConfig';

const request = async (url: string, options: RequestInit = {}) => {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Google Workspace not connected (Missing access token)");
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error('Google API Error: ' + res.statusText + ' - ' + errorBody);
  }
  return res.json();
};

// ==========================================
// GMAIL
// ==========================================
export const fetchRecentEmails = async (maxResults = 5) => {
  const data = await request('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=' + maxResults + '&labelIds=INBOX');
  if (!data.messages) return [];
  
  const emails = await Promise.all(data.messages.map((msg: any) => 
    request('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + msg.id)
  ));
  
  return emails.map(email => {
    const headers = email.payload.headers;
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
    return { id: email.id, snippet: email.snippet, subject, from, date: new Date(parseInt(email.internalDate)) };
  });
};

export const sendEmail = async (to: string, subject: string, body: string) => {
  const emailLines = [
    'To: ' + to,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    'Subject: ' + subject,
    '',
    body
  ];
  const email = emailLines.join('\n');
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  return request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encodedEmail })
  });
};

// ==========================================
// GOOGLE TASKS
// ==========================================
export const fetchTasksLists = async () => {
  return request('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
};

export const fetchTasks = async (listId = '@default') => {
  return request('https://tasks.googleapis.com/tasks/v1/lists/' + listId + '/tasks');
};

export const addTask = async (listId = '@default', title: string, notes?: string) => {
  return request('https://tasks.googleapis.com/tasks/v1/lists/' + listId + '/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, notes })
  });
};

// ==========================================
// GOOGLE SHEETS
// ==========================================
export const createSpreadsheet = async (title: string) => {
  return request('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({ properties: { title } })
  });
};

export const appendToSheet = async (spreadsheetId: string, range: string, values: any[][]) => {
  return request('https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + range + ':append?valueInputOption=USER_ENTERED', {
    method: 'POST',
    body: JSON.stringify({ values })
  });
};

export const updateSheetValues = async (spreadsheetId: string, range: string, values: any[][]) => {
  return request('https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + range + '?valueInputOption=USER_ENTERED', {
    method: 'PUT',
    body: JSON.stringify({ values })
  });
};

export const getSheetData = async (spreadsheetId: string, range = 'Sheet1!A1:Z50') => {
  return request('https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + range);
};

// ==========================================
// GOOGLE DOCS
// ==========================================
export const createDocument = async (title: string) => {
  return request('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    body: JSON.stringify({ title })
  });
};

export const getDocument = async (documentId: string) => {
  return request('https://docs.googleapis.com/v1/documents/' + documentId);
};

export const insertTextToDoc = async (documentId: string, text: string) => {
  return request('https://docs.googleapis.com/v1/documents/' + documentId + ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: text
          }
        }
      ]
    })
  });
};

export const appendParagraphToDoc = async (documentId: string, text: string) => {
  try {
    const doc = await getDocument(documentId);
    const content = doc.body?.content || [];
    const lastElement = content[content.length - 1];
    const endIndex = lastElement?.endIndex ? Math.max(1, lastElement.endIndex - 1) : 1;
    return request('https://docs.googleapis.com/v1/documents/' + documentId + ':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: endIndex },
              text: '\n' + text
            }
          }
        ]
      })
    });
  } catch (err) {
    return insertTextToDoc(documentId, text + '\n');
  }
};

// ==========================================
// GOOGLE DRIVE & DOCS & SHEETS
// ==========================================
export const fetchRecentDocs = async (maxResults = 20) => {
  try {
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.document' and trashed=false");
    const data = await request('https://www.googleapis.com/drive/v3/files?q=' + q + '&orderBy=viewedByMeTime desc,modifiedTime desc&pageSize=' + maxResults + '&fields=files(id,name,mimeType,modifiedTime,viewedByMeTime,webViewLink,iconLink)');
    return data.files || [];
  } catch (err) {
    console.warn("fetchRecentDocs failed, falling back to general query:", err);
    // Fallback without orderBy if index issue
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.document' and trashed=false");
    const data = await request('https://www.googleapis.com/drive/v3/files?q=' + q + '&pageSize=' + maxResults + '&fields=files(id,name,mimeType,modifiedTime,webViewLink)');
    return data.files || [];
  }
};

export const fetchRecentSheets = async (maxResults = 20) => {
  try {
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const data = await request('https://www.googleapis.com/drive/v3/files?q=' + q + '&orderBy=modifiedTime desc&pageSize=' + maxResults + '&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)');
    return data.files || [];
  } catch (err) {
    console.warn("fetchRecentSheets fallback:", err);
    const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const data = await request('https://www.googleapis.com/drive/v3/files?q=' + q + '&pageSize=' + maxResults + '&fields=files(id,name,mimeType,modifiedTime,webViewLink)');
    return data.files || [];
  }
};

export const fetchRecentDriveFiles = async (maxResults = 20) => {
  try {
    const q = encodeURIComponent("trashed=false");
    const data = await request('https://www.googleapis.com/drive/v3/files?q=' + q + '&orderBy=modifiedTime desc&pageSize=' + maxResults + '&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)');
    return data.files || [];
  } catch (err) {
    console.warn("fetchRecentDriveFiles fallback:", err);
    const data = await request('https://www.googleapis.com/drive/v3/files?pageSize=' + maxResults + '&fields=files(id,name,mimeType,modifiedTime,webViewLink)');
    return data.files || [];
  }
};
