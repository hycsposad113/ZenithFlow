
import { CalendarEvent, EventType } from "../types";

// NOTE: Jack needs to provide a valid Client ID from Google Cloud Console
const CLIENT_ID = "69357598926-d7g3lvg87g5bd4foefcdg4mhaj7ask7s.apps.googleusercontent.com";
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
  "https://sheets.googleapis.com/$discovery/rest?version=v4"
];
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets";

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

/**
 * Initializes Google API Client
 */
export const initGoogleAuth = () => {
  return new Promise<void>((resolve, reject) => {
    try {
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
          console.error("GIS Token Client Error:", err);
        }
      });
      gisInited = true;

      const maybeResolve = () => {
        if (gapiInited && gisInited) resolve();
      };
      maybeResolve();
    } catch (err) {
      console.error("Init Error:", err);
      reject(err);
    }
  });
};

/**
 * Requests authorization from user
 */
export const signIn = () => {
  if (!tokenClient) {
    return Promise.reject("Google Auth not initialized. Check your Client ID and API enablement.");
  }

  return new Promise<void>((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        console.error("Google Auth Callback Error:", resp);
        reject(resp);
        return;
      }
      resolve();
    };

    // 如果已經有 token 就不用重複跳視窗，除非失效
    // @ts-ignore
    const token = gapi.client.getToken();
    if (token === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

/**
 * Fetches events from primary calendar
 */
export const fetchGoogleEvents = async (): Promise<CalendarEvent[]> => {
  try {
    // @ts-ignore
    const response = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 50,
      orderBy: 'startTime',
    });

    const events = response.result.items || [];
    return events.map((event: any) => {
      const start = event.start.dateTime || event.start.date;
      const startDate = new Date(start);
      const end = event.end.dateTime || event.end.date;
      const endDate = new Date(end);

      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      return {
        id: event.id,
        googleEventId: event.id,
        title: event.summary || "Untitled Event",
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().split(' ')[0].slice(0, 5),
        durationMinutes: durationMinutes || 30,
        type: EventType.OTHER,
        notes: event.description || ""
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
  if (spreadsheetId) return spreadsheetId;

  try {
    // 2. Search Drive for file
    // @ts-ignore
    const listResp = await gapi.client.drive.files.list({
      q: `name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: 'files(id, name)',
    });

    const files = listResp.result.files;
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
      "Date", "Wake Time", "Focus Minutes", "Completion %", "Reflection", "Insight", "Key Concept", "Action Item"
    ]);

    return spreadsheetId;

  } catch (e) {
    console.error("Error finding/creating sheet:", e);
    // Fallback: Just ask user to create one manually if this fails deeply, but for now throw
    throw e;
  }
};

/**
 * Appends or updates a row for the given date.
 */
export const syncDailyStatsToSheet = async (
  date: string,
  stats: { wakeTime: string; focusMinutes: number; completionRate: number },
  reflection: { reflection: string; insight: string; concept: string; actionItem: string }
) => {
  try {
    const spreadsheetId = await findOrCreateZenithFlowSheet();

    // 1. Read existing data to check for duplicates
    // @ts-ignore
    const readResp = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = readResp.result.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r[0] === date);

    const rowData = [
      date,
      stats.wakeTime,
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
        range: `${SHEET_NAME}!A${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      console.log(`Updated row ${rowIndex + 1} for ${date}`);
    } else {
      // Append new row
      // @ts-ignore
      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] }
      });
      console.log(`Appended daily log for ${date}`);
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
