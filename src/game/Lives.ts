import { loadProgress, saveProgress } from "../services/progress";

export class Lives {
  private regenMs = 10 * 60 * 1000; // 10 минут за 1 жизнь
  private maxLives = 5;

  tick() {
    const p = loadProgress();
    const now = Date.now();

    if (p.lives.count >= this.maxLives) {
      p.lives.nextRegenAt = 0;
      saveProgress(p);
      return;
    }

    if (p.lives.nextRegenAt === 0) {
      p.lives.nextRegenAt = now + this.regenMs;
      saveProgress(p);
      return;
    }

    if (now >= p.lives.nextRegenAt) {
      p.lives.count = Math.min(this.maxLives, p.lives.count + 1);
      p.lives.nextRegenAt = p.lives.count >= this.maxLives ? 0 : now + this.regenMs;
      saveProgress(p);
    }
  }

  canPlay() {
    const p = loadProgress();
    this.tick();
    return p.lives.count > 0;
  }

  consumeOne(): boolean {
    const p = loadProgress();
    this.tick();
    if (p.lives.count <= 0) return false;

    p.lives.count -= 1;
    if (p.lives.count < this.maxLives && p.lives.nextRegenAt === 0) {
      p.lives.nextRegenAt = Date.now() + this.regenMs;
    }
    saveProgress(p);
    return true;
  }

  getState() {
    const p = loadProgress();
    this.tick();
    return { count: p.lives.count, max: this.maxLives, nextRegenAt: p.lives.nextRegenAt };
  }
}