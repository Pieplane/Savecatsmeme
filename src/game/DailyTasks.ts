import { loadProgress, saveProgress } from "../services/progress";

export type TaskDef = {
  id: string;
  title: string;
  goal: number;
  reward: number;
};

export const DAILY_TASKS: TaskDef[] = [
  { id: "win_3", title: "Выиграй 3 раза", goal: 3, reward: 30 },
  { id: "play_5", title: "Сыграй 5 раз", goal: 5, reward: 20 },
  { id: "ink_150", title: "Победа с расходом ≤ 150 ink", goal: 1, reward: 25 },
];

export class DailyTasks {
  inc(taskId: string, amount = 1) {
    const p = loadProgress();
    p.daily.tasks[taskId] = (p.daily.tasks[taskId] ?? 0) + amount;
    saveProgress(p);
  }

  markClaimed(taskId: string) {
    const p = loadProgress();
    p.daily.claimed[taskId] = true;
    saveProgress(p);
  }

  tryClaim(taskId: string): boolean {
    const p = loadProgress();
    const def = DAILY_TASKS.find(t => t.id === taskId);
    if (!def) return false;

    const prog = p.daily.tasks[taskId] ?? 0;
    const claimed = p.daily.claimed[taskId] === true;
    if (claimed) return false;
    if (prog < def.goal) return false;

    p.coins += def.reward;
    p.daily.claimed[taskId] = true;
    saveProgress(p);
    return true;
  }

  getState() {
    const p = loadProgress();
    return DAILY_TASKS.map(t => ({
      ...t,
      progress: Math.min(p.daily.tasks[t.id] ?? 0, t.goal),
      claimed: p.daily.claimed[t.id] === true,
    }));
  }
}