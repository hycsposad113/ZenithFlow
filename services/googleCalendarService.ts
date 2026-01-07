
import { CalendarEvent, EventType } from "../types";
import LZString from 'lz-string';

// NOTE: Jack needs to provide a valid Client ID from Google Cloud Console
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!CLIENT_ID) {
  console.warn("VITE_GOOGLE_CLIENT_ID is missing. Google Calendar sync will not work.");
}
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];
const SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Utility to wait for script load
const waitForGoogleScripts = () => {
  return new Promise<void>((resolve, reject) => {
    let elapsed = 0;
    const interval = setInterval(() => {
      // @ts-ignore
      if (window.gapi && window.google) {
        clearInterval(interval);
        resolve();
      }
      elapsed += 100;
      if (elapsed > 10000) { // 10s timeout
        clearInterval(interval);
        reject(new Error("Google scripts load timeout"));
      }
    }, 100);
  });
};

/**
 * Initializes Google API Client
 */
export const initGoogleAuth = async () => {
  await waitForGoogleScripts();

  return new Promise<void>((resolve, reject) => {
    try {
      if (gisInited && gapiInited) {
        resolve();
        return;
      }

      // @ts-ignore
      gapi.load('client', async () => {
        try {
          // @ts-ignore
          await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiInited = true;
          maybeResolve();
        } catch (err) {
          console.error("GAPI Init Error:", err);
          reject(err);
        }
      });

      // @ts-ignore
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at request time
        error_callback: (err: any) => {
          // If error is related to popup closing or similar, we might ignore.
          console.warn("GIS Token Client Warning:", err);
        }
      });
      gisInited = true;
      maybeResolve();

      function maybeResolve() {
        if (gapiInited && gisInited) resolve();
      }
    } catch (err) {
      console.error("Init Error:", err);
      reject(err);
    }
  });
};

/**
 * Requests authorization from user
 */
export const signIn = (silent = false) => {
  if (!tokenClient) {
    return Promise.reject("Google Auth not initialized. Check your Client ID and API enablement.");
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.warn("ZenithFlow: Sign-in timed out");
      // Don't reject for silent attempts, just resolve so app proceeds
      resolve();
    }, 10000);

    tokenClient.callback = async (resp: any) => {
      clearTimeout(timeout);
      if (resp.error !== undefined) {
        console.warn("Google Auth Callback Error:", resp.error);
        if (resp.error === 'immediate_failed' || resp.error === 'popup_closed_by_user') {
          // Resolve so app starts normally even if sync fails
          resolve();
        } else {
          reject(resp);
        }
        return;
      }
      resolve();
    };

    // @ts-ignore
    const token = gapi.client.getToken();
    if (token && token.access_token) {
      clearTimeout(timeout);
      resolve();
    } else {
      // Use prompt: 'none' only for silent background checks
      tokenClient.requestAccessToken({ prompt: silent ? 'none' : '' });
    }
  });
};

/**
 * Fetches events from ALL visible calendars
 */
export const fetchGoogleEvents = async (): Promise<CalendarEvent[]> => {
  try {
    // 1. Get list of all calendars
    // @ts-ignore
    const calendarListResp = await gapi.client.calendar.calendarList.list({
      minAccessRole: 'reader'
    });

    const calendars = calendarListResp.result.items || [];
    let allEvents: any[] = [];

    // 2. Fetch events for each calendar
    // We use Promise.all to fetch in parallel
    const fetchPromises = calendars.map(async (cal: any) => {
      try {
        // @ts-ignore
        const response = await gapi.client.calendar.events.list({
          calendarId: cal.id,
          timeMin: (new Date()).toISOString(),
          showDeleted: false,
          singleEvents: true,
          maxResults: 50,
          orderBy: 'startTime',
        });

        // Add calendar info to event for potential coloring/context
        const items = response.result.items || [];
        return items.map((item: any) => ({ ...item, calendarSummary: cal.summary, calendarColor: cal.backgroundColor }));
      } catch (e) {
        console.warn(`Failed to fetch events for calendar ${cal.summary}`, e);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    results.forEach(evts => {
      allEvents = allEvents.concat(evts);
    });

    // 3. Map to internal format
    return allEvents.map((event: any) => {
      const start = event.start.dateTime || event.start.date;
      const startDate = new Date(start);
      const end = event.end.dateTime || event.end.date;
      const endDate = new Date(end);

      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      // Distinguish event types slightly based on calendar or content
      let type = EventType.OTHER;
      // Heuristic: If calendar name contains "Class", "University", "Tu Delft", etc or event title does.
      const lowerTitle = (event.summary || "").toLowerCase();
      const lowerCal = (event.calendarSummary || "").toLowerCase();

      if (lowerCal.includes('class') || lowerCal.includes('school') || lowerCal.includes('university') || lowerCal.includes('tu delft')) {
        type = EventType.WORK; // Treat school as work/study
      }

      return {
        id: event.id,
        googleEventId: event.id,
        title: event.summary || "Untitled Event",
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().split(' ')[0].slice(0, 5),
        durationMinutes: durationMinutes || 30,
        type: type,
        notes: event.description || `From calendar: ${event.calendarSummary}`
      };
    });
  } catch (err) {
    console.error("Fetch Events Error:", err);
    throw err;
  }
};

/**
 * Pushes a ZenithFlow task/event to Google Calendar
 */
export const pushToGoogleCalendar = async (title: string, date: string, startTime: string, durationMinutes: number) => {
  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  const event = {
    'summary': title,
    'description': 'Synced from ZenithFlow',
    'start': {
      'dateTime': startDateTime.toISOString(),
      'timeZone': 'Europe/Amsterdam'
    },
    'end': {
      'dateTime': endDateTime.toISOString(),
      'timeZone': 'Europe/Amsterdam'
    }
  };

  try {
    // @ts-ignore
    const response = await gapi.client.calendar.events.insert({
      'calendarId': 'primary',
      'resource': event
    });
    return response.result.id;
  } catch (err) {
    console.error("Insert Event Error:", err);
    throw err;
  }
};

/**
 * Updates an existing event in Google Calendar
 */
export const updateGoogleEvent = async (eventId: string, title: string, date: string, startTime: string, durationMinutes: number) => {
  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  const event = {
    'summary': title,
    'start': {
      'dateTime': startDateTime.toISOString(),
      'timeZone': 'Europe/Amsterdam'
    },
    'end': {
      'dateTime': endDateTime.toISOString(),
      'timeZone': 'Europe/Amsterdam'
    }
  };

  try {
    // @ts-ignore
    await gapi.client.calendar.events.patch({
      'calendarId': 'primary',
      'eventId': eventId,
      'resource': event
    });
    return true;
  } catch (err) {
    console.error("Update Event Error:", err);
    throw err;
  }
};

// --- Delete Event ---
export const deleteGoogleEvent = async (eventId: string) => {
  try {
    // @ts-ignore
    await gapi.client.calendar.events.delete({
      'calendarId': 'primary',
      'eventId': eventId
    });
    console.log(`Deleted Google Event: ${eventId}`);
    return true;
  } catch (err) {
    console.error("Delete Event Error:", err);
    return false; // Might be already deleted or permission issue
  }
};

// --- Google Sheets Integration ---

const SPREADSHEET_TITLE = "ZenithFlow Data";
const SHEET_NAME = "DailyLogs";

/**
 * Finds existing ZenithFlow spreadsheet or creates a new one.
 * Returns the Spreadsheet ID.
 */
export const findOrCreateZenithFlowSheet = async (): Promise<string> => {
  // 1. Check local storage first
  let spreadsheetId = localStorage.getItem('zenithflow_sheet_id');
  if (spreadsheetId) {
    try {
      // Verify it exists AND we have access
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
      return spreadsheetId;
    } catch (e) {
      console.warn("Cached spreadsheet ID invalid or inaccessible, searching/creating new...", e);
      localStorage.removeItem('zenithflow_sheet_id');
      spreadsheetId = null; // Reset to force search
    }
  }

  try {
    // 2. Search Drive for file
    // @ts-ignore
    const listResp = await gapi.client.drive.files.list({
      q: `name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: 'files(id, name)',
    });

    const files = listResp?.result?.files;
    if (files && files.length > 0) {
      spreadsheetId = files[0].id;
      localStorage.setItem('zenithflow_sheet_id', spreadsheetId);
      return spreadsheetId;
    }

    // 3. Create new if not found
    // @ts-ignore
    const createResp = await gapi.client.sheets.spreadsheets.create({
      properties: { title: SPREADSHEET_TITLE },
      sheets: [{ properties: { title: SHEET_NAME } }]
    });

    spreadsheetId = createResp.result.spreadsheetId;
    localStorage.setItem('zenithflow_sheet_id', spreadsheetId);

    // Add headers
    await appendRowToSheet(spreadsheetId, SHEET_NAME, [
      "Date", "Wake Time", "Meditation", "Exercise", "Focus Minutes", "Completion %", "Reflection", "Insight", "Key Concept", "Action Item"
    ]);

    return spreadsheetId;

  } catch (e) {
    console.error("Error finding/creating sheet:", e);
    // Fallback: Just ask user to create one manually if this fails deeply, but for now throw
    throw e;
  }
};

const getOrCreateSheet = async (spreadsheetId: string, sheetName: string, headers: string[]): Promise<boolean> => {
  try {
    // @ts-ignore
    const sheetMeta = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = sheetMeta.result.sheets.some((s: any) => s.properties.title === sheetName);

    if (!sheetExists) {
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: { title: sheetName }
            }
          }]
        }
      });

      // Write Headers
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [headers] }
      });
      return true; // Created
    }
    return false; // Existed
  } catch (e) {
    console.error(`Error checking/creating sheet ${sheetName}:`, e);
    throw e;
  }
};

/**
 * Appends or updates a row for the given date in the MONTHLY log sheet.
 */
export const syncDailyStatsToSheet = async (
  date: string,
  stats: { wakeTime: string; meditation: boolean; exercise: boolean; focusMinutes: number; completionRate: number },
  reflection: { reflection: string; insight: string; concept: string; actionItem: string }
) => {
  try {
    const spreadsheetId = await findOrCreateZenithFlowSheet();
    const monthSuffix = date.slice(0, 7); // YYYY-MM
    const sheetName = `Logs_${monthSuffix}`;

    await getOrCreateSheet(spreadsheetId, sheetName, [
      "Date", "Wake Time", "Meditation", "Exercise", "Focus Minutes", "Completion %", "Reflection", "Insight", "Key Concept", "Action Item"
    ]);

    // 1. Read existing data to check for duplicates
    // @ts-ignore
    const readResp = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = readResp.result.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r[0] === date);

    const rowData = [
      date,
      stats.wakeTime,
      stats.meditation ? 'YES' : 'NO',
      stats.exercise ? 'YES' : 'NO',
      stats.focusMinutes,
      stats.completionRate,
      reflection.reflection,
      reflection.insight,
      reflection.concept,
      reflection.actionItem
    ];

    if (rowIndex !== -1) {
      // Update existing row (index + 1 because A1 notation is 1-based)
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      console.log(`Updated row ${rowIndex + 1} for ${date} in ${sheetName}`);
    } else {
      // Append new row
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      console.log(`Appended daily log for ${date} in ${sheetName}`);
    }

  } catch (e) {
    console.error("Error syncing to sheet:", e);
    throw e;
  }
};

const appendRowToSheet = async (spreadsheetId: string, range: string, values: any[]) => {
  // @ts-ignore
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] }
  });
};

// --- App State Sync (The "Cloud Save" Logic) ---

const STATE_SHEET_NAME = "AppState";
const TRANSACTIONS_SHEET_NAME = "Transactions";

const syncTransactions = async (spreadsheetId: string, transactions: any[]) => {
  try {
    // Group transactions by month
    const grouped: { [key: string]: any[] } = {};
    transactions.forEach(t => {
      const month = t.date.slice(0, 7) || 'Unknown'; // YYYY-MM
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(t);
    });

    // Iterate over each month group
    for (const month of Object.keys(grouped)) {
      if (month === 'Unknown') continue;

      const sheetName = `Transactions_${month}`;
      const monthTransactions = grouped[month];

      await getOrCreateSheet(spreadsheetId, sheetName, ['Date', 'Currency', 'Category', 'Amount', 'Status', 'Notes', 'ID']);

      // Format Data
      const rows = monthTransactions.map((t: any) => [
        t.date,
        t.currency,
        t.category,
        t.amount,
        t.currency === 'NTD' ? (t.isProfit ? 'PROFIT' : 'LOSS') : '-',
        t.notes || '',
        t.id
      ]);

      // Clear old data (A2:G) to overwrite
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A2:G`
      });

      if (rows.length > 0) {
        // Write new data
        // @ts-ignore
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A2`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: rows }
        });
      }
      console.log(`Synced ${rows.length} transactions to ${sheetName}`);
    }
  } catch (e) {
    console.warn("Failed to sync readable transactions:", e);
    // Suppress error so main sync doesn't fail
  }
};



// ... (keep existing imports)

// ... (keep existing code up to saveAppStateToSheet)

/**
 * Saves the entire application state (tasks, routine, etc.) to a specific sheet.
 * Acts as a "Cloud Save" so mobile and desktop stay in sync.
 * NOW WITH COMPRESSION (LZ-String) to multiply capacity by ~10x.
 */
export const saveAppStateToSheet = async (state: any) => {
  try {
    const spreadsheetId = await findOrCreateZenithFlowSheet();

    // 1. Ensure "AppState" sheet exists
    // @ts-ignore
    const sheetMeta = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId
    });

    const sheetExists = sheetMeta.result.sheets.some((s: any) => s.properties.title === STATE_SHEET_NAME);

    if (!sheetExists) {
      // Create the sheet if it doesn't exist
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: { title: STATE_SHEET_NAME, hidden: true } // Hide it so it doesn't clutter
            }
          }]
        }
      });
    }

    // 2. Save state as COMPRESSED chunks
    const jsonState = JSON.stringify(state);

    // NEW: Compress the JSON string
    const compressed = LZString.compressToEncodedURIComponent(jsonState);

    console.log(`Original Size: ${Math.ceil(jsonState.length / 1024)}KB, Compressed: ${Math.ceil(compressed.length / 1024)}KB`);

    // Cell limit is 50k chars. safe chunk size 40k.
    const CHUNK_SIZE = 40000;
    const chunks = [];
    for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
      chunks.push([compressed.slice(i, i + CHUNK_SIZE)]);
    }

    // Clear existing data 
    // @ts-ignore
    await gapi.client.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${STATE_SHEET_NAME}!A:A`
    });

    // Write new chunks
    // @ts-ignore
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${STATE_SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      resource: { values: chunks }
    });

    // 3. Sync Readable Transactions (Still do this for visibility)
    if (state.transactions && Array.isArray(state.transactions)) {
      await syncTransactions(spreadsheetId, state.transactions);
    }

    console.log(`App state saved to cloud!`);
  } catch (e) {
    console.error("Error saving app state:", e);
    // @ts-ignore
    const msg = e.result?.error?.message || e.message || JSON.stringify(e);
    console.error("GOOGLE SYNC ERROR DETAILS:", msg);
  }
};

/**
 * Loads the application state from the sheet.
 */
export const loadAppStateFromSheet = async () => {
  try {
    const spreadsheetId = await findOrCreateZenithFlowSheet();

    // @ts-ignore
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${STATE_SHEET_NAME}!A:A`
    });

    const rows = response.result.values;
    if (rows && rows.length > 0) {
      try {
        // Reassemble chunks
        const compressedState = rows.map((r: any[]) => r[0] || '').join('');
        if (!compressedState) return null;

        // Try Decompressing first
        let jsonState = LZString.decompressFromEncodedURIComponent(compressedState);

        // Fallback: If decompression returns null/empty, maybe it's legacy uncompressed data?
        if (!jsonState || !jsonState.startsWith('{')) {
          console.log("Decompression failed or returned invalid JSON, trying legacy READ...");
          // In transition period, we might have old data. 
          // But usually LZString returns null if invalid.
          // Let's assume if it looks like JSON it WAS uncompressed.
          if (compressedState.trim().startsWith('{')) {
            jsonState = compressedState;
          }
        }

        if (!jsonState) return null;

        return JSON.parse(jsonState);
      } catch (parseError) {
        console.warn("Failed to parse AppState from sheet chunks, treating as empty.", parseError);
        return null;
      }
    }
    return null;
  } catch (e) {
    console.error("Error loading app state from sheet:", e);
    // Fallback: Return null so app uses local storage or defaults
    return null;
  }
};
