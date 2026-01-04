
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

// Define the response schema for crypto psychology analysis
const cryptoPsychologyResponseSchema = {
  type: Type.OBJECT,
  properties: {
    psychAnalysis: { type: Type.STRING, description: "A psychological analysis of the trade based on performance principles." },
    mentalModel: { type: Type.STRING, description: "A suggested mental model or representation for improvement." }
  },
  required: ["psychAnalysis", "mentalModel"]
};

// Global Finance Analysis Schema
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

export const generateMorningPlan = async (currentTasks: Task[], knowledgeBase: KnowledgeItem[] = []) => {
  const knowledgeContext = knowledgeBase.length > 0
    ? `Reference these specific mental models from Jack's personal library: ${knowledgeBase.map(k => `[${k.bookTitle}: ${k.content}]`).join(', ')}`
    : "";

  const prompt = `
    Jack's current tasks from timetable: ${JSON.stringify(currentTasks)}.
    ${knowledgeContext}
    
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
  const knowledgeContext = knowledgeBase.length > 0
    ? `Apply these specific principles from Jack's personal library: ${knowledgeBase.map(k => `[${k.bookTitle}: ${k.content}]`).join(', ')}`
    : "";

  const prompt = `
    Analyze Jack's day:
    ${JSON.stringify(tasks.map(t => ({
    title: t.title,
    planned: t.durationMinutes,
    actual: t.actualDurationMinutes || 0,
    reflection: t.reflection || ""
  })))}
    ${knowledgeContext}

    Quote the specific knowledge items Jack has provided if relevant.
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

/**
 * Analyzes crypto trading psychology and suggests mental models for improvement.
 * Based on the principles of "Peak" (deliberate practice) and "Deep Work".
 */
export const analyzeCryptoPsychology = async (transaction: Transaction, winRate: number) => {
  const prompt = `
    Analyze this crypto transaction:
    ${JSON.stringify(transaction)}
    Current overall win rate: ${(winRate * 100).toFixed(1)}%

    Based on the principles of "Peak" (deliberate practice), analyze Jack's performance and mindset.
    Examine the notes for emotional triggers or cognitive biases.
    Suggest a "mental representation" (mental model) to improve or sustain high performance in trading.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: ZENITH_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: cryptoPsychologyResponseSchema
    }
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Analyzes Jack's total financial status
 */
export const analyzeTotalFinancialStatus = async (transactions: Transaction[]) => {
  const prompt = `
    Please analyze Jack's financial records across multiple weeks/months:
    ${JSON.stringify(transactions)}
    
    Current environment: Jack is in TU Delft (EUR living), trading in Crypto (NTD).
    Rules:
    1. EUR: Analyze the spending categories. Are there patterns of "Trivial Many"? Suggest 1 category to cut back.
    2. Crypto: Look for "Deliberate Practice" signs. Is the win rate stable or improving?
    3. Time Series: Mention if this month/week looks healthier than typical based on the data.
    4. Provide a unified status and a specific actionable step.
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
