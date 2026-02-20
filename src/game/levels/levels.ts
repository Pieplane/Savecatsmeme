import type { LevelConfig } from "./LevelConfig";

export const LEVELS: Record<number, LevelConfig> = {
  1: {
    id: 1,
    inkMax: 260,
    visuals: {
      backgroundKey: "bg_game",
      hintText: "Нарисуй мост. Отпусти палец — кот пойдет.",
    },
    platforms: [
      { x: 0.50, y: 0.70, w: 1.00, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
    ],
    goal: { x: 0.78, y: 0.60 },
    start: { x: 0.15, y: 0.60 },
    hazard: {
    delayMs: 2000,
    spawnX: 0.5,
    spawnY: -50,
    repeat: true,
    everyMs: 1500,
    radius: 18,
  },
  },

  2: {
    id: 2,
    inkMax: 240,
    visuals: { backgroundKey: "bg_game" },
    platforms: [
      { x: 0.50, y: 0.92, w: 1.00, h: 80, visual: { key: "grass_mid", mode: "tile" } },
      { x: 0.30, y: 0.78, w: 0.30, h: 20, visual: { key: "grass_mid", mode: "tile" } },
      { x: 0.72, y: 0.68, w: 0.28, h: 20, visual:{ key: "grass_mid", mode: "tile" } },
    ],
    goal: { x: 0.72, y: 0.62 },
    start: { x: 0.15, y: 0.80 },
  },
};

export function getLevel(id: number): LevelConfig {
  return LEVELS[id] ?? LEVELS[1];
}