import Phaser from "phaser";

export type HazardConfig = {
  enabled: boolean;

  // когда начинать после старта (после рисования линии)
  delayMs: number;

  // спавн
  spawnX: number; // 0..1 (нормализовано по ширине)
  spawnY: number; // пиксели (обычно отрицательное типа -40)

  // режим: один раз или периодически
  repeat?: boolean;
  everyMs?: number;

  // физика/размер
  radius?: number;

  // авто-удаление, если улетело вниз
  killBelowY?: number;
};

export class HazardSystem {
  private scene: Phaser.Scene;
  private cfg: HazardConfig;

  private started = false;
  private timer?: Phaser.Time.TimerEvent;

  private hazards: MatterJS.BodyType[] = [];

  constructor(scene: Phaser.Scene, cfg: HazardConfig) {
    this.scene = scene;
    this.cfg = cfg;
  }

  /** вызвать, когда игрок закончил рисовать и кот поехал */
  start() {
    if (this.started) return;
    this.started = true;

    if (!this.cfg.enabled) return;

    const delay = Math.max(0, this.cfg.delayMs ?? 0);

    this.timer = this.scene.time.delayedCall(delay, () => {
      if (this.cfg.repeat && this.cfg.everyMs && this.cfg.everyMs > 0) {
        // периодический спавн
        this.spawnOnce();
        this.timer = this.scene.time.addEvent({
          delay: this.cfg.everyMs,
          loop: true,
          callback: () => this.spawnOnce(),
        });
      } else {
        // один спавн
        this.spawnOnce();
      }
    });
  }

  /** дергай из GameScene.update() */
  update() {
    // синхронизируем визуал и чистим улетевшие вниз
    const killY = this.cfg.killBelowY;

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const body = this.hazards[i];
      const go = (body as any)._go as Phaser.GameObjects.GameObject & { setPosition: any; destroy: any };
      const p = (body as any).position;

      if (go) go.setPosition(p.x, p.y);

      if (killY != null && p.y > killY) {
        this.removeAt(i);
      }
    }
  }

  /** проверить, является ли body опасностью */
  isHazardBody(body: MatterJS.BodyType) {
    return (body as any).label === "hazard";
  }

  /** удалить всё (вызывать при рестарте/шутдауне) */
  destroy() {
    this.timer?.remove(false);
    this.timer = undefined;

    // удаляем все hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      this.removeAt(i);
    }

    this.started = false;
  }

  // ---- internal ----

  private spawnOnce() {
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    const w = this.scene.scale.width;
    const x = this.cfg.spawnX * w;
    const y = this.cfg.spawnY;

    const r = this.cfg.radius ?? 18;

    const body = matter.add.circle(x, y, r, {
      restitution: 0.2,
      frictionAir: 0.01,
    });

    (body as any).label = "hazard";

    // Визуал (потом заменишь на sprite/анимацию)
    const go = this.scene.add.circle(x, y, r, 0xff0000);
    go.setDepth(50);

    (body as any)._go = go;

    this.hazards.push(body);
  }

  private removeAt(i: number) {
    const body = this.hazards[i];

    const go = (body as any)._go as Phaser.GameObjects.GameObject & { destroy: any };
    if (go) go.destroy();

    // удалить физ. тело
    const world = (this.scene as any).matter?.world;
    if (world) world.remove(body);

    this.hazards.splice(i, 1);
  }
}