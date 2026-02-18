import Phaser from "phaser";

type Vec2 = { x: number; y: number };

export class GameScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;

  private drawing = false;
  private points: Vec2[] = [];
  private lineBodies: MatterJS.BodyType[] = [];

  private inkMax = 260;      // “чернила”
  private inkLeft = 260;

  private minPointDist = 10; // реже точки = меньше лагов
  private thickness = 14;    // толщина “моста”

  private cat!: MatterJS.BodyType;
  private goal!: MatterJS.BodyType;

  private catGO!: Phaser.GameObjects.Arc;
private goalGO!: Phaser.GameObjects.Rectangle;

private uiG!: Phaser.GameObjects.Graphics;

private running = false;
private targetSpeedX = 2.2;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#5abcd4");
    this.g = this.add.graphics();
    this.uiG = this.add.graphics();

    const w = this.scale.width;
    const h = this.scale.height;

    // Пол (платформа)
    this.matter.add.rectangle(w / 2, h - 40, w, 80, { isStatic: true });


    // Пропасть (просто не рисуем платформу в центре, будет яма)
    // Для наглядности добавим 2 платформы по краям:
    this.matter.add.rectangle(w * 0.22, h - 80, w * 0.35, 20, { isStatic: true });
    this.matter.add.rectangle(w * 0.78, h - 140, w * 0.35, 20, { isStatic: true });

    // "Кот" = кружок (пока без спрайта)
    this.cat = this.matter.add.circle(w * 0.15, h - 140, 18, {
      friction: 0.08,
      frictionAir: 0.02,
      restitution: 0.0,
    });
    //Настройка кота
    (this.cat as any).frictionAir = 0.01;   // меньше торможения в воздухе
(this.cat as any).friction = 0.01;      // меньше трения о поверхности
(this.cat as any).slop = 0.05;          // чуть стабильнее контакты

// главное: не давать "уснуть"
this.matter.body.set(this.cat, { sleepThreshold: -1 });

    // "Кот-цель" = сенсор (если коснулся — win)
    this.goal = this.matter.add.rectangle(w * 0.88, h - 180, 60, 60, {
      isStatic: true,
      isSensor: true,
    });

    // Визуал кота/цели (просто примитивы)
    this.catGO = this.add.circle((this.cat as any).position.x, (this.cat as any).position.y, 18, 0xffffff);
this.goalGO = this.add.rectangle((this.goal as any).position.x, (this.goal as any).position.y, 60, 60, 0xffffff);

    // Камера/resize
    

    // Коллизии: если cat касается goal -> win
    this.matter.world.on("collisionstart", (ev: any) => {
      for (const pair of ev.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        if ((a === this.cat && b === this.goal) || (b === this.cat && a === this.goal)) {
          this.onWin();
        }
      }
    });

    // Ввод: рисование
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      // на MVP: рисуем только до первого отпускания; потом рестарт
      this.drawing = true;
      this.points = [];
      this.inkLeft = this.inkMax;

      const start = { x: p.worldX, y: p.worldY };
      this.points.push(start);
      this.redraw();
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.drawing) return;
      const cur = { x: p.worldX, y: p.worldY };
      const last = this.points[this.points.length - 1];

      const d = Phaser.Math.Distance.Between(cur.x, cur.y, last.x, last.y);
      if (d < this.minPointDist) return;
      if (this.inkLeft <= 0) return;

      // тратим ink пропорционально длине
      const take = Math.min(d, this.inkLeft);
      if (take <= 0) return;

      // если ink не хватает, “укоротим” шаг
      if (take < d) {
        const t = take / d;
        cur.x = last.x + (cur.x - last.x) * t;
        cur.y = last.y + (cur.y - last.y) * t;
      }

      this.points.push(cur);
      this.inkLeft -= take;
      this.redraw();
    });

    this.input.on("pointerup", () => {
      if (!this.drawing) return;
      this.drawing = false;

      this.buildPhysicsLine();
      this.startCat();
    });

    // Простая подсказка текста
    this.add.text(16, 16, "Нарисуй мост. Отпусти палец — кот пойдет.", { fontSize: "18px" }).setScrollFactor(0);
  }

  update() {
    if (this.running) {
  const v = (this.cat as any).velocity;

  // поддерживаем скорость вправо
  const want = this.targetSpeedX;
  const cur = v.x;

  // если кот сильно замедлился — подталкиваем
  if (cur < want) {
    this.matter.body.setVelocity(this.cat, { x: want, y: v.y });
  }
}
    const cp = (this.cat as any).position;
    this.catGO.setPosition(cp.x, cp.y);
    this.catGO.setRotation((this.cat as any).angle);

    const gp = (this.goal as any).position;
    this.goalGO.setPosition(gp.x, gp.y);
    this.goalGO.setRotation((this.goal as any).angle);
    // Визуальный прогресс ink (чтобы сразу было понятно)
    this.uiG.clear();
    this.uiG.fillStyle(0xffffff, 0.2);
    this.uiG.fillRect(16, 46, 200, 10);
    this.uiG.fillStyle(0xffffff, 0.8);
    this.uiG.fillRect(16, 46, 200 * (this.inkLeft / this.inkMax), 10);

    // Софт-проигрыш: если кот упал слишком низко
    const pos = (this.cat as any).position;
    if (pos && pos.y > this.scale.height + 200) {
      this.onLose();
    }
  }

  private redraw() {
    // рисуем линию
    this.g.clear();

    // линия
    this.g.lineStyle(this.thickness, 0xffffff, 1);
    if (this.points.length >= 2) {
      this.g.beginPath();
      this.g.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        this.g.lineTo(this.points[i].x, this.points[i].y);
      }
      this.g.strokePath();
    }

    // ink bar будет дорисован в update()
  }

  private buildPhysicsLine() {
    // удалить старую линию
    for (const b of this.lineBodies) this.matter.world.remove(b);
    this.lineBodies = [];

    if (this.points.length < 2) return;

    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];

      const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (len < 4) continue;

      const angle = Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y);
      const cx = (a.x + b.x) * 0.5;
      const cy = (a.y + b.y) * 0.5;

      const body = this.matter.add.rectangle(cx, cy, len, this.thickness, {
        isStatic: true,
        angle,
        friction: 0.9,
        restitution: 0,
      });

      this.lineBodies.push(body);
    }
  }

  private startCat() {
    // авто-движение вправо
     this.running = true;
    this.matter.body.setVelocity(this.cat, { x: this.targetSpeedX, y: 0 });
  }

  private onWin() {
    this.add.text(16, 70, "WIN 😺💞", { fontSize: "26px" });
    this.time.delayedCall(700, () => this.scene.restart());
  }

  private onLose() {
    this.add.text(16, 70, "LOSE 😿", { fontSize: "26px" });
    this.time.delayedCall(700, () => this.scene.restart());
  }
}