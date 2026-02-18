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

  { id: "fast_win_20", title: "Выиграй за ≤ 20 секунд", goal: 1, reward: 35 },
 { id: "no_fail_2", title: "Сделай 2 победы без поражений", goal: 1, reward: 40 },
  { id: "ink_120", title: "Победа с расходом ≤ 120 ink", goal: 1, reward: 45 },
  { id: "streak_2", title: "Сделай серию 2 побед подряд", goal: 1, reward: 50 },
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
  const picked = p.daily.pickedTaskIds ?? DAILY_TASKS.map(t => t.id);

  return DAILY_TASKS
    .filter(t => picked.includes(t.id))
    .map(t => ({
      ...t,
      progress: Math.min(p.daily.tasks[t.id] ?? 0, t.goal),
      claimed: p.daily.claimed[t.id] === true,
    }));
}
getAllBonusState() {
  const p = loadProgress();
  const picked = p.daily.pickedTaskIds ?? [];
  const allDone = picked.length > 0 && picked.every(id => (p.daily.tasks[id] ?? 0) >= (DAILY_TASKS.find(t=>t.id===id)?.goal ?? 1));
  const allClaimed = picked.length > 0 && picked.every(id => p.daily.claimed[id] === true);
  const bonusClaimed = p.daily.allBonusClaimed === true;

  return { allDone, allClaimed, bonusClaimed, reward: 50 };
}

tryClaimAllBonus(): boolean {
  const p = loadProgress();
  const picked = p.daily.pickedTaskIds ?? [];
  if (picked.length === 0) return false;
  if (p.daily.allBonusClaimed === true) return false;

  const allClaimed = picked.every(id => p.daily.claimed[id] === true);
  if (!allClaimed) return false;

  p.coins += 50;
  p.daily.allBonusClaimed = true;
  saveProgress(p);
  return true;
}
}