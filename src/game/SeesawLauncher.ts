import Phaser from "phaser";

type SeesawConfig = {
  width?: number;
  height?: number;

  // сенсорные зоны по краям
  sensorW?: number;
  sensorH?: number;

  // визуальный наклон
  tiltAngleRad?: number;      // например 0.25 ~ 14°
  tiltDurationMs?: number;    // 120..200
  cooldownMs?: number;        // защита от спама

  // импульс/скорости
  flightTime?: number;        // примерно время полёта к цели (0.8..1.2)
  upVelocity?: number;        // скорость вверх (Matter: отрицательная Y)
  extraXBoost?: number;       // добавить по X немного
};

export class SeesawLauncher {
  private scene: Phaser.Scene;
  private cfg: Required<SeesawConfig>;

  private plankBody: MatterJS.BodyType;
  private leftSensor: MatterJS.BodyType;
  private rightSensor: MatterJS.BodyType;

  private plankGO: Phaser.GameObjects.Rectangle;

  private catBody: MatterJS.BodyType;
  private goalBody: MatterJS.BodyType;

  private cooling = false;
  private lastHitSide: "left" | "right" | null = null;

  private launched = false;

  constructor(scene: Phaser.Scene, catBody: MatterJS.BodyType, goalBody: MatterJS.BodyType, cfg?: SeesawConfig) {
    this.scene = scene;
    this.catBody = catBody;
    this.goalBody = goalBody;

    this.cfg = {
      width: cfg?.width ?? 220,
      height: cfg?.height ?? 20,
      sensorW: cfg?.sensorW ?? 90,
      sensorH: cfg?.sensorH ?? 60,

      tiltAngleRad: cfg?.tiltAngleRad ?? 0.28,
      tiltDurationMs: cfg?.tiltDurationMs ?? 160,
      cooldownMs: cfg?.cooldownMs ?? 600,

      flightTime: cfg?.flightTime ?? 0.95,
      upVelocity: cfg?.upVelocity ?? 9.5,
      extraXBoost: cfg?.extraXBoost ?? 0.0,
    };

    const matter = (scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    // дефолтная позиция (потом setPosition)
    const x = scene.scale.width * 0.45;
    const y = scene.scale.height * 0.72;

    // 1) сама балка (статик, НЕ сенсор)
    this.plankBody = matter.add.rectangle(x, y, this.cfg.width, this.cfg.height, {
      isStatic: true,
      friction: 0.8,
      label: "seesaw_plank",
    });

    // 2) сенсоры по краям (статик + sensor)
    this.leftSensor = matter.add.rectangle(
      x - this.cfg.width * 0.35,
      y - this.cfg.sensorH * 0.5,
      this.cfg.sensorW,
      this.cfg.sensorH,
      { isStatic: true, isSensor: true, label: "seesaw_left" }
    );

    this.rightSensor = matter.add.rectangle(
      x + this.cfg.width * 0.35,
      y - this.cfg.sensorH * 0.5,
      this.cfg.sensorW,
      this.cfg.sensorH,
      { isStatic: true, isSensor: true, label: "seesaw_right" }
    );

    // 3) визуал балки
    this.plankGO = scene.add.rectangle(x, y, this.cfg.width, this.cfg.height, 0x000000, 0.25);
    this.plankGO.setDepth(5);
  }

  destroy() {
    // удалить визуал
    this.plankGO.destroy();

    // удалить физику
    const world = (this.scene as any).matter?.world;
    if (world) {
      world.remove(this.plankBody);
      world.remove(this.leftSensor);
      world.remove(this.rightSensor);
    }
  }

  setPosition(x: number, y: number) {
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    matter.body.setPosition(this.plankBody, { x, y });
    matter.body.setPosition(this.leftSensor, { x: x - this.cfg.width * 0.35, y: y - this.cfg.sensorH * 0.5 });
    matter.body.setPosition(this.rightSensor, { x: x + this.cfg.width * 0.35, y: y - this.cfg.sensorH * 0.5 });

    this.plankGO.setPosition(x, y);
  }

  update() {
    // визуал только следует за позицией (угол мы анимируем)
    const p = (this.plankBody as any).position;
    this.plankGO.setPosition(p.x, p.y);
  }

  /** вызывать из collisionstart, возвращает true если обработал */
  handleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType): boolean {
  if (this.cooling) return false;

  const a = this.rootBody(bodyA);
  const b = this.rootBody(bodyB);

  const aLabel = this.getLabel(a);
  const bLabel = this.getLabel(b);

  const leftHit  = (aLabel === "seesaw_left"  && this.isLineBody(b)) || (bLabel === "seesaw_left"  && this.isLineBody(a));
  const rightHit = (aLabel === "seesaw_right" && this.isLineBody(b)) || (bLabel === "seesaw_right" && this.isLineBody(a));

  if (!leftHit && !rightHit) return false;

  this.lastHitSide = leftHit ? "left" : "right";
  this.launchCat(this.lastHitSide);
  return true;
}

  // ---- internal ----

  private isLineBody(b: MatterJS.BodyType): boolean {
  const r = this.rootBody(b) as any;

  // 1) по label
  const lab = r.label ?? "";
  if (lab === "line" || lab.startsWith("line")) return true;

  // 2) если LineDrawer ставит кастомный флаг (рекомендую)
  if (r.plugin?.isLine) return true;

  return false;
}

  private launchCat(hitSide: "left" | "right") {
     if (this.launched) return;
  this.launched = true;
  this.cooling = true;

    const Body = (Phaser.Physics.Matter as any).Matter.Body;

    // наклон качели: если ударили слева — левая сторона "вниз", правая "вверх"
    const sign = hitSide === "left" ? -1 : 1;

    // анимация наклона (быстро туда-сюда)
    this.scene.tweens.add({
      targets: this.plankGO,
      rotation: sign * this.cfg.tiltAngleRad,
      duration: this.cfg.tiltDurationMs,
      yoyo: true,
      ease: "Sine.easeOut",
    });

    // расчёт скорости к цели (управляемый полёт)
    const catPos = (this.catBody as any).position;
    const goalPos = (this.goalBody as any).position;

    const t = this.cfg.flightTime;
    const dx = goalPos.x - catPos.x;

    // Matter: y вниз -> вверх отрицательная
    const vx = (dx / t) * 0.01 + sign * this.cfg.extraXBoost; // 0.01 подбирается под мир, потом подкрутим
    const vy = -this.cfg.upVelocity;

    // разморозить кота и дать импульс
    Body.setStatic(this.catBody, false);
    Body.setVelocity(this.catBody, { x: vx, y: vy });
    Body.setAngularVelocity(this.catBody, 0);

    // cooldown
    this.scene.time.delayedCall(this.cfg.cooldownMs, () => {
      this.cooling = false;
      this.lastHitSide = null;
    });
  }
  private rootBody(b: MatterJS.BodyType): MatterJS.BodyType {
  return (b as any).parent ?? b;
}

private getLabel(b: MatterJS.BodyType): string {
  const r = this.rootBody(b) as any;
  return r.label ?? (b as any).label ?? "";
}
resetLaunchLock() {
  this.launched = false;
}

}