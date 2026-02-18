import Phaser from "phaser";
import { addTgDebugText } from "../services/tg";
import { LineDrawer } from "../game/LineDrawer";
import { CatRunner } from "../game/CatRunner";
import { HudUI } from "../game/HudUI";
import { tgHaptic } from "../services/tgHaptics";
import { UIManager } from "../game/UIManager";
import { loadProgress, saveProgress } from "../services/progress";
import { DailyTasks } from "../game/DailyTasks";
import { Lives } from "../game/Lives";

export class GameScene extends Phaser.Scene {
  private line!: LineDrawer;
  private cat!: CatRunner;
  private hud!: HudUI;
  private ui!: UIManager;

  private ended = false;
  private paused = false;

  private levelId = 1;
  private inkMax = 260;

  private daily = new DailyTasks();
  private lives = new Lives();

  private runStartedAt = 0;
  private catStarted = false; // чтобы не включать рисование после старта кота

  private topStatsText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  create() {
    if (!this.lives.canPlay()) {
    this.scene.start("MenuScene");
    return;
  }

    this.runStartedAt = Date.now();
    this.ended = false;
    this.paused = false;
    this.catStarted = false;


    this.cameras.main.setBackgroundColor("#5abcd4");
    this.input.setTopOnly(true);

    const w = this.scale.width;
    const h = this.scale.height;

    // мир
    this.matter.add.rectangle(w / 2, h - 40, w, 80, { isStatic: true });
    this.matter.add.rectangle(w * 0.22, h - 80, w * 0.35, 20, { isStatic: true });
    this.matter.add.rectangle(w * 0.78, h - 140, w * 0.35, 20, { isStatic: true });

    addTgDebugText(this);
    this.topStatsText = this.add.text(16, 16, "", {
  fontSize: "18px",
  color: "#000",
  fontFamily: "Arial",
}).setScrollFactor(0);

this.refreshTopStats();

// чтобы жизни “тикали” когда идёт восстановление
this.time.addEvent({
  delay: 1000,
  loop: true,
  callback: () => this.refreshTopStats(),
});

    this.add
      .text(16, 66, "Нарисуй мост. Отпусти палец — кот пойдет.", {
        fontSize: "18px",
        color: "#000",
      })
      .setScrollFactor(0);

    // системы
    this.hud = new HudUI(this);
    this.cat = new CatRunner(this, w, h);

    // линия
    this.line = new LineDrawer(this, { thickness: 10, minPointDist: 12, inkMax: this.inkMax });
    this.line.setInkMax(this.inkMax);
    this.hud.setInkMax(this.inkMax);
    this.line.setEnabled(true);

    this.line.hookInput(
      () => {
        // ✅ попытка засчитывается только когда игрок реально отпустил линию и запустил кота
    this.daily.inc("play_5", 1);
        // старт кота = дальше рисование запрещаем
        this.catStarted = true;
        this.line.setEnabled(false);
        this.cat.start();
      },
      () => tgHaptic("light")
    );

    // UI
    this.ui = new UIManager(this, {
      onModalOpen: () => this.pauseGame(),
      onModalClose: () => this.time.delayedCall(0, () => this.resumeGame()),
    });

    // WIN
    this.matter.world.on("collisionstart", (ev: any) => {
      if (this.ended) return;

      for (const pair of ev.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;

        if (
          (a === this.cat.catBody && b === this.cat.goalBody) ||
          (b === this.cat.catBody && a === this.cat.goalBody)
        ) {
          this.endWin();
          return;
        }
      }
    });
  }

  update() {
  if (this.paused || this.ended) return;

  this.cat.update();
  this.hud.drawInk(this.line.inkLeft);
  this.line.update();
  this.ui.setInk(this.line.inkLeft);

  // ✅ проигрыш проверяем только после старта
  if (this.catStarted && this.cat.isFallenBelow(this.scale.height + 200)) {
    this.endLose();
  }
}

  private endWin() {
    if (this.ended) return;
    this.ended = true;

    this.cat.stop();
    this.line.setEnabled(false);

    // --- DAILY: win_3
    this.daily.inc("win_3", 1);

    // --- DAILY: fast_win_20
    const dt = Date.now() - this.runStartedAt;
    if (dt <= 20_000) this.daily.inc("fast_win_20", 1);

    // --- DAILY: ink thresholds
    const used = this.inkMax - this.line.inkLeft;
    if (used <= 150) this.daily.inc("ink_150", 1);
    if (used <= 120) this.daily.inc("ink_120", 1);

    // --- STREAK (храним в progress, чтобы не сбрасывалось при restart)
    const pProg = loadProgress();
    const prevWins = pProg.streak.wins;
    pProg.streak.wins = prevWins + 1;
    pProg.streak.noFail = pProg.streak.noFail + 1; // в твоей игре win = noFail, lose сбрасывает

    // засчитываем “сделай серию 2” ровно в момент достижения 2
    if (pProg.streak.wins === 2) this.daily.inc("streak_2", 1);
    if (pProg.streak.noFail === 2) this.daily.inc("no_fail_2", 1);

    // --- STARS + coins reward (за победу уровня)
    const ratio = used / this.inkMax;
    const stars = ratio <= 0.4 ? 3 : ratio <= 0.7 ? 2 : 1;

    const prevStars = pProg.bestStarsByLevel[this.levelId] ?? 0;
    if (stars > prevStars) pProg.bestStarsByLevel[this.levelId] = stars;

    const reward = stars === 3 ? 20 : stars === 2 ? 12 : 6;
    pProg.coins += reward;

    saveProgress(pProg);
    this.refreshTopStats();

    // UI
    this.ui.setWinInfo({ stars, reward });
    this.ui.showWin(() => this.scene.restart());
    tgHaptic("success");
  }

  private endLose() {
    if (this.ended) return;
    this.ended = true;

    this.line.setEnabled(false);

    // сброс серий в progress
    const p = loadProgress();
    p.streak.wins = 0;
    p.streak.noFail = 0;
    saveProgress(p);

    // ✅ тратим жизнь ТОЛЬКО тут
  const ok = this.lives.consumeOne();
  this.refreshTopStats();

    if (!ok) {
    // жизней нет -> в меню
    this.ui.showLose(() => this.scene.start("MenuScene"));
  } else {
    // жизнь есть -> быстрая попытка
    this.ui.showLose(() => this.scene.restart());
  }

  tgHaptic("error");
  }

  private pauseGame() {
    this.paused = true;
    this.matter.world.pause();
    this.line.setEnabled(false);
  }

  private resumeGame() {
    if (this.ended) return;

    this.paused = false;
    this.matter.world.resume();

    // рисование разрешаем только если кот ещё НЕ стартовал
    if (!this.catStarted) this.line.setEnabled(true);
  }
  private refreshTopStats() {
  const p = loadProgress();
  const st = this.lives.getState();

  let regen = "";
  if (st.count < st.max && st.nextRegenAt && st.nextRegenAt > Date.now()) {
    const s = Math.ceil((st.nextRegenAt - Date.now()) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    regen = `  +1 через ${mm}:${ss}`;
  }

  this.topStatsText.setText(`💰 ${p.coins}   ❤️ ${st.count}/${st.max}${regen}`);
}
}