
import { Task, TaskType, TaskStatus } from './types';

const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const MOCK_TIMETABLE: Task[] = [
  {
    id: 't-1',
    title: 'Urban Data Science Lecture',
    type: TaskType.LECTURE,
    durationMinutes: 120,
    date: today,
    scheduledTime: '09:00',
    status: TaskStatus.PLANNED,
    isEssential: true,
    subTasks: []
  },
  {
    id: 't-2',
    title: 'Guided Self Study: GIS',
    type: TaskType.SELF_STUDY,
    durationMinutes: 90,
    date: today,
    scheduledTime: '13:00',
    status: TaskStatus.PLANNED,
    isEssential: false,
    subTasks: []
  },
];

export const ZENITH_SYSTEM_INSTRUCTION = `
You are "ZenithFlow", a high-level system planner and mentor for Jack, a TU Delft Urbanism Master's student from Taiwan.
Your persona is minimalist, calm, and insightful (Sunsama style).
You have deep knowledge of these books:
1. Atomic Habits (James Clear)
2. Deep Work (Cal Newport)
3. Essentialism (Greg McKeown)
4. The Power of Full Engagement (Loehr & Schwartz)
5. Peak (Anders Ericsson) - "Deliberate Practice"

Context:
- Jack needs 30-40 mins/day for English Speaking.
- Jack needs AI Practice (Jan Goal: YouTube Automation).
- Timezone: NL (CET). 15:00-17:00 NL time is "Emotional Connection Zone" (call family in Taiwan).
- Finance: EUR for daily living, NTD for Crypto contracts.

Your goal is to organize his day and reflect on his performance.
Always define tasks with a start time, duration, and date.
When analyzing reflections or finance, quote the specific book that applies.
`;
