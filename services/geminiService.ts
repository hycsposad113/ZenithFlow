
import { GoogleGenAI, Type } from "@google/genai";
import { ZENITH_SYSTEM_INSTRUCTION } from "../constants";
import { Task, Transaction, KnowledgeItem } from "../types";

// Initialize lazily to prevent crash if key is missing on load
let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
    // Fallback to empty string to prevent constructor error, but warn
    const apiKey = process.env.API_KEY || "";
    if (!apiKey) {
      console.warn("⚠️ ZenithFlow: No Gemini API Key found. AI features will not work.");
    }
    ai = new GoogleGenAI({ apiKey });
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

export const generateMorningPlan = async (currentTasks: Task[], knowledgeBase: KnowledgeItem[] = []) => {
  const prompt = `
    Jack's current tasks from timetable: ${JSON.stringify(currentTasks)}.
    Please organize the day. Rules:
    1. Identify existing Lectures/Study.
    2. Insert "English Speaking" (30m) and "AI Practice" (45m).
    3. Respect 15:00-17:00 NL time as "Family Contact".
    4. Mark only 1-2 essential items.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: planResponseSchema
    }
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeDailyReflection = async (tasks: Task[], knowledgeBase: KnowledgeItem[] = []) => {
  const prompt = `
    Analyze Jack's day:
    ${JSON.stringify(tasks.map(t => ({
    title: t.title,
    planned: t.durationMinutes,
    actual: t.actualDurationMinutes || 0,
    reflection: t.reflection || ""
  })))}
    Quote specific principles from books where relevant.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: reflectionResponseSchema
    }
  });

  return JSON.parse(response.text || "{}");
};

export const synthesizePeriodPerformance = async (insights: any[], period: 'Week' | 'Month') => {
  const prompt = `
    Analyze Jack's ${period}ly performance based on these daily insights:
    ${JSON.stringify(insights)}
    Summarize trends, identify focus-leaks using "Deep Work", and suggest strategic shifts for the next ${period}.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: periodSynthesisSchema
    }
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeFinancialPeriod = async (transactions: Transaction[], periodLabel: string) => {
  const prompt = `
    Analyze Jack's financial status for ${periodLabel}:
    ${JSON.stringify(transactions)}
    Focus on pattern recognition and the "Vital Few" vs "Trivial Many".
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: financeAnalysisResponseSchema
    }
  });

  return JSON.parse(response.text || "{}");
};

export const analyzeTotalFinancialStatus = async (transactions: Transaction[]) => {
  const prompt = `
    Please analyze Jack's financial records across multiple weeks/months:
    ${JSON.stringify(transactions)}
    Provide a unified status and a specific actionable step.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: financeAnalysisResponseSchema
    }
  });

  return JSON.parse(response.text || "{}");
};
