export type ProgressData = {
  coins: number;
  bestStarsByLevel: Record<number, number>; // levelId -> stars 0..3
  daily: {
    dateKey: string; // YYYY-MM-DD
    tasks: Record<string, number>;
    claimed: Record<string, boolean>;
    pickedTaskIds: string[];        // ✅ всегда есть
    allBonusClaimed: boolean;       // ✅ всегда есть
  };
  lives: {
    count: number;
    nextRegenAt: number; // ms timestamp
  };
  streak: {
    wins: number;
    noFail: number;
  };
};

const KEY = "CATBRIDGE_PROGRESS_V1";

// ✅ общий пул id заданий для выбора на день
const DAILY_POOL_IDS = [
  "win_3",
  "play_5",
  "ink_150",
  "fast_win_20",
  "no_fail_2",
  "ink_120",
  "streak_2",
];

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pickDaily(ids: string[], n: number) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function makeFreshDaily(tk: string) {
  return {
    dateKey: tk,
    tasks: {} as Record<string, number>,
    claimed: {} as Record<string, boolean>,
    pickedTaskIds: pickDaily(DAILY_POOL_IDS, 3),
    allBonusClaimed: false,
  };
}

export function loadProgress(): ProgressData {
  const tk = todayKey();

  const base: ProgressData = {
    coins: 0,
    bestStarsByLevel: {},
    daily: makeFreshDaily(tk),
    lives: { count: 5, nextRegenAt: 0 },
    streak: { wins: 0, noFail: 0 },
  };

  const raw = localStorage.getItem(KEY);
  if (!raw) return base;

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressData>;

    // ---- defaults for older saves ----
    if (typeof parsed.coins !== "number") parsed.coins = 0;

    if (!parsed.bestStarsByLevel) parsed.bestStarsByLevel = {};
    if (!parsed.streak) parsed.streak = { wins: 0, noFail: 0 };
    if (!parsed.lives) parsed.lives = { count: 5, nextRegenAt: 0 };

    if (!parsed.daily) {
      parsed.daily = makeFreshDaily(tk);
    } else {
      if (!parsed.daily.tasks) parsed.daily.tasks = {};
      if (!parsed.daily.claimed) parsed.daily.claimed = {};

      // daily rollover
      if (parsed.daily.dateKey !== tk) {
        parsed.daily = makeFreshDaily(tk);
      } else {
        // если в этот день pickedTaskIds потерялся/пустой — восстановим
        if (!parsed.daily.pickedTaskIds || parsed.daily.pickedTaskIds.length === 0) {
          parsed.daily.pickedTaskIds = pickDaily(DAILY_POOL_IDS, 3);
        }
        if (typeof parsed.daily.allBonusClaimed !== "boolean") {
          parsed.daily.allBonusClaimed = false;
        }
      }
    }

    // гарантируем типы для daily
    if (!parsed.daily.pickedTaskIds) parsed.daily.pickedTaskIds = pickDaily(DAILY_POOL_IDS, 3);
    if (typeof parsed.daily.allBonusClaimed !== "boolean") parsed.daily.allBonusClaimed = false;
    if (!parsed.daily.tasks) parsed.daily.tasks = {};
    if (!parsed.daily.claimed) parsed.daily.claimed = {};

    // merge
    return {
      ...base,
      ...parsed,
      daily: {
        ...base.daily,
        ...(parsed.daily as any),
      },
      lives: {
        ...base.lives,
        ...(parsed.lives as any),
      },
      streak: {
        ...base.streak,
        ...(parsed.streak as any),
      },
      bestStarsByLevel: parsed.bestStarsByLevel as Record<number, number>,
      coins: parsed.coins as number,
    };
  } catch {
    return base;
  }
}

export function saveProgress(data: ProgressData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}