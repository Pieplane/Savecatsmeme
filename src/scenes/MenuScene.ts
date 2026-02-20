import Phaser from "phaser";
import { UIManager } from "../game/UIManager";
import { Lives } from "../game/Lives";
import { loadProgress } from "../services/progress";
import { tgHaptic } from "../services/tgHaptics";
//import { DailyTasks } from "../game/DailyTasks";

export class MenuScene extends Phaser.Scene {
  private ui!: UIManager;
  private lives = new Lives();
  //private daily = new DailyTasks();

  constructor() {
    super("MenuScene");
  }

  preload() {
    this.load.image("bg_menu", "assets/bg_menu.png");
  }

  create() {
    //this.cameras.main.setBackgroundColor("#5abcd4");
    const w = this.scale.width;
    const h = this.scale.height;

    const bg = this.add.image(w / 2, h / 2, "bg_menu");
    const scale = Math.max(w / bg.width, h / bg.height);
    bg.setScale(scale);
    bg.setDepth(-1000);
    this.input.setTopOnly(true);

    // UI поверх меню
    this.ui = new UIManager(this);
    this.ui.setGameHudVisible(false); // ← скрыли игровые кнопки и Ink

    // Заголовок
    this.add.text(this.scale.width / 2, 60, "SAVE CATS MEME", {
      fontSize: "34px",
      color: "#000",
      fontFamily: "Arial",
    }).setOrigin(0.5);

    // Кнопки
    const playBtn = this.makeBigButton(this.scale.width / 2, 160, "PLAY", () => {
      if (!this.lives.canPlay()) {
        tgHaptic("error");
        this.ui.showToast?.("Нет жизней. Подожди восстановление."); // если сделаешь toast
        return;
      }
      tgHaptic("light");
      //this.daily.inc("play_5", 1);
      this.scene.start("GameScene"); // переход в игру
    });

    const tasksBtn = this.makeBigButton(this.scale.width / 2, 230, "ЗАДАНИЯ", () => {
      tgHaptic("light");
      this.ui.openTasksPublic?.(); // см. пункт ниже
    });

    const resetBtn = this.makeBigButton(this.scale.width / 2, 320, "DEV RESET", () => {
  localStorage.removeItem("CATBRIDGE_PROGRESS_V1");
  this.scene.restart();
});

    this.add.existing(playBtn);
    this.add.existing(tasksBtn);
    this.add.existing(resetBtn);

    this.refreshHeader();
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.refreshHeader() });
  }

  private refreshHeader() {
    const p = loadProgress();
    const st = this.lives.getState();

    this.ui.setHeader?.({
      coins: p.coins,
      lives: `${st.count}/${st.max}`,
      regenAt: st.nextRegenAt,
    });
  }

  private makeBigButton(x: number, y: number, label: string, onClick: () => void) {
    const w = Math.min(280, this.scale.width - 60);
    const h = 52;

    const c = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0xffffff, 1)
      .setStrokeStyle(3, 0x000000, 0.2)
      .setOrigin(0.5);

    const t = this.add.text(0, 0, label, {
      fontSize: "20px",
      color: "#000",
      fontFamily: "Arial",
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true }).on("pointerdown", () => onClick());

    c.add([bg, t]);
    return c;
  }
}