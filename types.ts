
export enum TaskType {
  LECTURE = 'Lecture',
  SELF_STUDY = 'Self Study',
  ENGLISH_SPEAKING = 'English Speaking',
  AI_PRACTICE = 'AI Practice',
  CRYPTO_ANALYSIS = 'Crypto Analysis',
  EVENT = 'Event',
  GOAL = 'Goal',
  OTHER = 'Other'
}

export enum TaskStatus {
  PLANNED = 'Planned',
  COMPLETED = 'Completed',
  MIGRATED = 'Migrated'
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  actualDurationMinutes?: number;
  scheduledTime?: string; // HH:mm
  status: TaskStatus;
  isEssential: boolean;
  reflection?: string;
  location?: string;
  subTasks?: SubTask[];
  origin?: 'daily' | 'planning'; // 'daily' from notes/timeline, 'planning' from weekly/monthly
  googleEventId?: string; // ID from Google Calendar
}

export enum Currency {
  EUR = 'EUR',
  NTD = 'NTD'
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  category: string;
  isProfit?: boolean;
  notes?: string;
}

export interface KnowledgeItem {
  id: string;
  bookTitle: string;
  content: string;
  category: 'Habits' | 'Deep Work' | 'Mindset' | 'Finance' | 'Other';
}

export enum EventType {
  MEETING = 'Meeting',
  PREPARATION = 'Preparation',
  DEADLINE = 'Deadline',
  WORK = 'Work',
  OTHER = 'Other'
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  type: EventType;
  notes?: string;
  googleEventId?: string; // ID from Google Calendar
}

export interface AiInsight {
  message: string;
  sourceBook?: string;
  actionableStep?: string;
}

export interface DailyStats {
  date: string;
  completionRate: number; // 0-100
  focusMinutes: number;
  wakeTime: string;
}
