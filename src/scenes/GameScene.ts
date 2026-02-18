import Phaser from "phaser";
import { addTgDebugText } from "../services/tg";
import { LineDrawer } from "../game/LineDrawer";
import { CatRunner } from "../game/CatRunner";
import { HudUI } from "../game/HudUI";

export class GameScene extends Phaser.Scene {
  private line!: LineDrawer;
  private cat!: CatRunner;
  private hud!: HudUI;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#5abcd4");

    const w = this.scale.width;
    const h = this.scale.height;

    // мир
    this.matter.add.rectangle(w / 2, h - 40, w, 80, { isStatic: true });
    this.matter.add.rectangle(w * 0.22, h - 80, w * 0.35, 20, { isStatic: true });
    this.matter.add.rectangle(w * 0.78, h - 140, w * 0.35, 20, { isStatic: true });

    // TG debug
    addTgDebugText(this);

    // UI
    this.add.text(16, 16, "Нарисуй мост. Отпусти палец — кот пойдет.", { fontSize: "18px", color: "#000" }).setScrollFactor(0);

    // системы
    this.hud = new HudUI(this);

    this.cat = new CatRunner(this, w, h);

    this.line = new LineDrawer(this, {
      thickness: 14,
      minPointDist: 10,
      inkMax: 260,
    });

    this.hud.setInkMax(260);

    this.line.hookInput(() => {
      this.cat.start();
    });

    // win
    this.matter.world.on("collisionstart", (ev: any) => {
      for (const pair of ev.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        if ((a === this.cat.catBody && b === this.cat.goalBody) || (b === this.cat.catBody && a === this.cat.goalBody)) {
          this.onWin();
        }
      }
    });
  }

  update() {
    this.cat.update();
    this.hud.drawInk(this.line.inkLeft);

    if (this.cat.isFallenBelow(this.scale.height + 200)) {
      this.onLose();
    }
  }

  private onWin() {
    this.add.text(16, 70, "WIN 😺💞", { fontSize: "26px", color: "#000" });
    this.time.delayedCall(700, () => this.scene.restart());
  }

  private onLose() {
    this.add.text(16, 70, "LOSE 😿", { fontSize: "26px", color: "#000" });
    this.time.delayedCall(700, () => this.scene.restart());
  }
}