
import { GoogleGenAI, Type } from "@google/genai";
import { ZENITH_SYSTEM_INSTRUCTION } from "../constants";
import { Task, Transaction, KnowledgeItem, CalendarEvent } from "../types";

// Initialize lazily to prevent crash if key is missing on load
let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
    // Fallback to empty string but warn
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is missing mapping. Please check your .env file.");
    }
    // Using stable v1 API and flash model
    ai = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
  }
  return ai;
};

const planResponseSchema = {
  type: Type.OBJECT,
  properties: {
    advice: { type: Type.STRING, description: "A brief, minimalist encouraging message." },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          startTime: { type: Type.STRING },
          durationMinutes: { type: Type.INTEGER },
          isEssential: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ["title", "startTime", "durationMinutes", "isEssential"]
      }
    }
  },
  required: ["advice", "tasks"]
};

const reflectionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    insight: { type: Type.STRING },
    bookReference: { type: Type.STRING },
    concept: { type: Type.STRING },
    actionItem: { type: Type.STRING }
  },
  required: ["insight", "bookReference", "concept", "actionItem"]
};

const financeAnalysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    overallStatus: { type: Type.STRING, description: "One word: Growth, Refining, or Cautious" },
    summary: { type: Type.STRING, description: "Overall summary of financial health." },
    eurInsights: { type: Type.STRING, description: "Advice on EUR spending using Essentialism principles." },
    cryptoInsights: { type: Type.STRING, description: "Analysis of trading performance using Peak principles." },
    actionableStep: { type: Type.STRING, description: "One immediate thing Jack can do to improve." },
    bookQuote: { type: Type.STRING, description: "A relevant quote from the 10 management books." }
  },
  required: ["overallStatus", "summary", "eurInsights", "cryptoInsights", "actionableStep", "bookQuote"]
};

const periodSynthesisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Induction of the period's performance." },
    patterns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Identified patterns of behavior." },
    suggestions: { type: Type.STRING, description: "Strategic suggestions for the next period." },
    improvement: { type: Type.STRING, description: "One core area of improvement based on management bibles." }
  },
  required: ["summary", "patterns", "suggestions", "improvement"]
};

// Helper to safely parse JSON from AI response
const parseJSON = (text: string) => {
  try {
    // 1. Try passing directly
    return JSON.parse(text);
  } catch (e) {
    // 2. Try stripping markdown code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        console.warn("Failed to parse stripped JSON:", e2);
      }
    }
    console.warn("Retrying with raw text cleanup...");
    // 3. Last ditch: some models return "Here is json: { ... }"
    const openBrace = text.indexOf('{');
    const closeBrace = text.lastIndexOf('}');
    if (openBrace >= 0 && closeBrace > openBrace) {
      try {
        return JSON.parse(text.substring(openBrace, closeBrace + 1));
      } catch (e3) {
        console.error("JSON Parse Critical Failure:", e3);
        return {};
      }
    }
    return {};
  }
};

export const generateDailyRitual = async (currentTasks: Task[], events: CalendarEvent[], knowledgeBase: KnowledgeItem[] = []) => {
  const prompt = `
    Jack's Daily Schedule Template (STRICTLY FOLLOW THIS):
    - **Early Morning (Focus)**: 06:00 - 08:00 -> STRICTLY "AI Practice" and "English Speaking".
    - **Commute**: 08:00 - 08:45 -> LEAVE BLANK (Do not schedule anything).
    - **Morning Classes**: 08:45 - 12:30 -> Fixed events (Do not overlap).
    - **Lunch**: 12:30 - 13:30 -> LEAVE BLANK.
    - **Afternoon**: 13:30 - 17:30 -> Classes (Fixed) OR Self Study (if free).
    - **Dinner/Rest**: 17:30 - 19:30 -> LEAVE BLANK.
    - **Night**: 19:30 - 22:10 -> Self Study / Deep Work.
    - **Wind Down (MANDATORY)**:
      - 22:00 - 22:30: Reading.
      - 22:30 - 23:00: Daily Review.
      - 23:00: Sleep Target.

    Current Context:
    1. Fixed Calendar Events (Do NOT change/move): ${JSON.stringify(events.map(e => ({ title: e.title, start: e.startTime, duration: e.durationMinutes })))}
    2. Existing Tasks: ${JSON.stringify(currentTasks.map(t => ({ title: t.title, time: t.scheduledTime })))}

    Directives:
    1. **Fill Gaps**: Only suggest *NEW* tasks for empty slots based on the template above.
    2. **Conflict Free**: Do NOT overlap with Fixed Calendar Events.
    3. **Crucial**: If 06:00 - 08:00 is empty, you MUST schedule "AI Practice" and "English Speaking" there.
    4. **Mandatory Items**: Ensure "Reading" (22:00) and "Daily Review" (22:30) are present if not already there.
    5. **Mantra Generation**: The 'advice' field MUST be a short, powerful, NEWly generated mantra (NOT from a fixed list) focusing on ONE of these themes:
       - Investment Philosophy & Market Nature
       - Risk Management & Decision Frameworks
       - Investment Psychology & Behavioral Biases
       - Wealth Perception & Personal Finance
       - Foundational Thinking & Identity Building
       - Goal Setting & Planning Systems
       - Execution & Habit Formation
       - Learning & Mastery (Deep Work)
       - Energy Management
       - Interpersonal Synergy
    6. **Output**: Only return the NEW tasks to be added and the unique advice.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: planResponseSchema
    }
  });

  return parseJSON(response.text || "{}");
};

export const analyzeDailyReflection = async (tasks: Task[], knowledgeBase: KnowledgeItem[] = [], dailyStats?: DailyStats) => {
  const prompt = `
    Analyze Jack's day:
    Context (Stats):
    - Wake Up Time: ${dailyStats?.wakeTime || "N/A"}
    - Completion Rate: ${dailyStats?.completionRate || 0}%
    - Routine: Meditation=${dailyStats?.meditation ? 'YES' : 'NO'}, Exercise=${dailyStats?.exercise ? 'YES' : 'NO'}

    Task Breakdown:
    ${JSON.stringify(tasks.map(t => ({
    title: t.title,
    planned: t.durationMinutes,
    actual: t.actualDurationMinutes || 0,
    reflection: t.reflection || ""
  })))}
    Quote specific principles from books where relevant.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: reflectionResponseSchema
    }
  });

  return parseJSON(response.text || "{}");
};

export interface DailyStats {
  date: string;
  completionRate: number; // 0-100
  focusMinutes: number;
  wakeTime: string;
  meditation?: boolean;
  exercise?: boolean;
}

export const synthesizePeriodPerformance = async (insights: any[], period: 'Week' | 'Month', stats?: DailyStats[]) => {
  const prompt = `
    Analyze Jack's ${period}ly performance based on:
    1. Daily Qualitative Insights: ${JSON.stringify(insights)}
    2. Daily Quantitative Stats (Completion Rate, Focus Minutes, Wake Up Time): ${JSON.stringify(stats || [])}

    Summarize trends in both discipline (wake up times, completion rates) and depth (focus minutes).
    Identify focus-leaks using "Deep Work", and suggest strategic shifts for the next ${period}.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: periodSynthesisSchema
    } // ... rest of config
  });

  return parseJSON(response.text || "{}");
};

export const analyzeFinancialPeriod = async (transactions: Transaction[], periodLabel: string) => {
  // ... (use getAI().models.generateContent with gemini-2.0-flash-exp)
  const prompt = `
    Analyze Jack's financial status for ${periodLabel}:
    ${JSON.stringify(transactions)}
    Focus on pattern recognition and the "Vital Few" vs "Trivial Many".
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: financeAnalysisResponseSchema
    }
  });

  return parseJSON(response.text || "{}");
}

export const analyzeTotalFinancialStatus = async (transactions: Transaction[]) => {
  // ... (use getAI().models.generateContent with gemini-2.0-flash-exp)
  const prompt = `
    Please analyze Jack's financial records across multiple weeks/months:
    ${JSON.stringify(transactions)}
    Provide a unified status and a specific actionable step.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: financeAnalysisResponseSchema
    }
  });

  return parseJSON(response.text || "{}");
}
