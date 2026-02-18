import type { Progress, ProgressStore } from "./progressStore";
import { readTgInfo } from "./tg";

function key() {
  const t = readTgInfo();
  return `progress_${t.connected ? t.userId : "dev"}`;
}

export class LocalProgressStore implements ProgressStore {
  async load(): Promise<Progress> {
    const raw = localStorage.getItem(key());
    if (!raw) return { best: 0 };
    try { return JSON.parse(raw); } catch { return { best: 0 }; }
  }

  async save(p: Progress): Promise<void> {
    localStorage.setItem(key(), JSON.stringify(p));
  }
}