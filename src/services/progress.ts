export type ProgressData = {
  coins: number;
  bestStarsByLevel: Record<number, number>; // levelId -> stars 0..3
  daily: {
    dateKey: string; // YYYY-MM-DD
    tasks: Record<string, number>; // taskId -> progress
    claimed: Record<string, boolean>;
  };
  lives: {
    count: number;
    nextRegenAt: number; // ms timestamp
  };
};

const KEY = "CATBRIDGE_PROGRESS_V1";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function loadProgress(): ProgressData {
  const raw = localStorage.getItem(KEY);
  const base: ProgressData = {
    coins: 0,
    bestStarsByLevel: {},
    daily: { dateKey: todayKey(), tasks: {}, claimed: {} },
    lives: { count: 5, nextRegenAt: 0 },
  };

  if (!raw) return base;

  try {
    const parsed = JSON.parse(raw) as ProgressData;

    // daily rollover
    const tk = todayKey();
    if (!parsed.daily || parsed.daily.dateKey !== tk) {
      parsed.daily = { dateKey: tk, tasks: {}, claimed: {} };
    }

    // lives defaults
    if (!parsed.lives) parsed.lives = { count: 5, nextRegenAt: 0 };

    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

export function saveProgress(data: ProgressData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}