export type PlatformRect = {
  x: number; y: number; w: number; h: number;
  angle?: number;

  visual?: {
    key: string;           // ключ картинки
    mode?: "stretch" | "tile" | "nineslice";
    tileScale?: number;    // для tile
    depth?: number;
  };
};

export type LevelConfig = {
  id: number;

  inkMax: number;

  visuals: {
    backgroundColor?: string;
    backgroundKey?: string;
    hintText?: string;
  };

  platforms: PlatformRect[];

  // если цель/финиш тоже по конфигу
  goal: { x: number; y: number };
  start: { x: number; y: number };

  hazard?: {
  delayMs: number;
  spawnX: number;  // 0..1
  spawnY: number;  // px (например -50)
  repeat?: boolean;
  everyMs?: number;
  radius?: number;
};
seesaw?: {
  enabled: boolean;
  x: number; // 0..1
  y: number; // 0..1
  width?: number;
  height?: number;
  upVelocity?: number;
  flightTime?: number;
  cooldownMs?: number;
};
win?: 
  | { type: "reachGoal" }
  | { type: "survive"; ms: number }
  | { type: "enterTrigger"; triggerId: string };

lose?: {
  // общий таймер: если win не случился — проигрыш
  noWinAfterMs?: number;

  // “застрял”: если почти не движется/не прогрессит
  stuckMs?: number;
  minMovePx?: number;    // например 8 (за окно времени)

  // упал вниз
  fellBelowY?: number;
};
movement?: { mode: "walk" | "launch" };
};
