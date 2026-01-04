
import { GoogleGenAI, Type } from "@google/genai";
import { ZENITH_SYSTEM_INSTRUCTION } from "../constants";
import { Task, Transaction, KnowledgeItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const cryptoPsychologyResponseSchema = {
  type: Type.OBJECT,
  properties: {
    psychAnalysis: { type: Type.STRING },
    mentalModel: { type: Type.STRING }
  },
  required: ["psychAnalysis", "mentalModel"]
};

// 全域財務分析 Schema
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
  const prompt = `
    Jack's current tasks from timetable: ${JSON.stringify(currentTasks)}.
    Please organize the day. Rules:
    1. Identify existing Lectures/Study.
    2. Insert "English Speaking" (30m) and "AI Practice" (45m).
    3. Respect 15:00-17:00 NL time as "Family Contact".
    4. Mark only 1-2 essential items.
  `;

  const response = await ai.models.generateContent({
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

  const response = await ai.models.generateContent({
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

export const analyzeCryptoPsychology = async (transaction: Transaction, winRate: number) => {
  const prompt = `
    Analyze this crypto transaction: ${JSON.stringify(transaction)}
    Current win rate: ${(winRate * 100).toFixed(1)}%
    Based on "Peak", analyze performance and mindset. Suggest a mental model.
  `;

  const response = await ai.models.generateContent({
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
 * 深度分析 Jack 的全域財務狀況
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

  const response = await ai.models.generateContent({
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
