
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

// Define the response schema for crypto psychology analysis
const cryptoPsychologyResponseSchema = {
  type: Type.OBJECT,
  properties: {
    psychAnalysis: { type: Type.STRING, description: "A psychological analysis of the trade based on performance principles." },
    mentalModel: { type: Type.STRING, description: "A suggested mental model or representation for improvement." }
  },
  required: ["psychAnalysis", "mentalModel"]
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
