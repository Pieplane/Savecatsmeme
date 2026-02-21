import Phaser from "phaser";

export type Vec2 = { x: number; y: number };
export type DrawMode = "staticLine" | "spawnBall" | "spawnBox";

export type LineDrawerConfig = {
  thickness: number;     // визуальная толщина линии
  minPointDist: number;  // минимальная дистанция между точками при рисовании
  inkMax: number;        // “чернила”
};

export class LineDrawer {
  public inkLeft: number;

  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;

  private drawing = false;
  private points: Vec2[] = [];

  // храним только один rigid body (compound)
  private rigidBody?: MatterJS.BodyType;

  private cfg: LineDrawerConfig;
  private enabled = true;
  private mode: DrawMode = "staticLine";

  // физика линии отдельно от визуала (для стабильности)
  private physicsThicknessFactor = 0.6;

  constructor(scene: Phaser.Scene, cfg: LineDrawerConfig) {
    this.scene = scene;
    this.cfg = cfg;
    this.inkLeft = cfg.inkMax;
    this.g = scene.add.graphics();

    // ✅ СОН (sleeping) сильно уменьшает тряску
    try {
      ((this.scene as any).matter.world.engine as any).enableSleeping = true;
    } catch {}
  }

  setMode(m: DrawMode) {
    this.mode = m;
    this.enabled = true;
  }

  isEnabled() {
    return this.enabled;
  }
  setEnabled(v: boolean) {
    this.enabled = v;
  }

  setInkMax(v: number) {
    this.cfg.inkMax = v;
    this.inkLeft = v;
  }

  /** ВАЖНО: зови это из Scene.update() чтобы визуал ездил за физикой */
  public update() {
    if (!this.rigidBody) return;
    this.redrawFromBody(this.rigidBody);
  }

  /** подключить инпут */
  hookInput(onLineFinalized: () => void, onStartDraw?: () => void) {
    this.scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.enabled) return;

      // если до этого было физ. тело — чистим
      this.clear();

      this.drawing = true;
      this.points = [];
      this.inkLeft = this.cfg.inkMax;

      this.points.push({ x: p.worldX, y: p.worldY });
      this.redrawStroke();
      onStartDraw?.();
    });

    this.scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.enabled) return;
      if (!this.drawing) return;

      const cur = { x: p.worldX, y: p.worldY };
      const last = this.points[this.points.length - 1];

      const d = Phaser.Math.Distance.Between(cur.x, cur.y, last.x, last.y);
      if (d < this.cfg.minPointDist) return;
      if (this.inkLeft <= 0) return;

      const take = Math.min(d, this.inkLeft);
      if (take <= 0) return;

      if (take < d) {
        const t = take / d;
        cur.x = last.x + (cur.x - last.x) * t;
        cur.y = last.y + (cur.y - last.y) * t;
      }

      this.points.push(cur);
      this.inkLeft -= take;

      this.redrawStroke();
    });

    this.scene.input.on("pointerup", () => {
      if (!this.enabled) return;
      if (!this.drawing) return;

      this.drawing = false;

      // ✅ если это был просто тап — ничего не делаем
  if (this.points.length < 2) {
    this.clear();              // убрать “точку” если появилась
    this.enabled = true;       // оставляем возможность рисовать
    return;
  }

   // ✅ опционально: минимальная длина штриха
  const minLen = 20;
  let len = 0;
  for (let i = 0; i < this.points.length - 1; i++) {
    const a = this.points[i];
    const b = this.points[i + 1];
    len += Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
  }
  if (len < minLen) {
    this.clear();
    this.enabled = true;
    return;
  }

      // немного упрощаем линию → меньше сегментов → меньше тряски
      this.points = this.simplifyPointsAngle(this.points, 0.15);

      if (this.mode === "staticLine") {
        this.buildPhysicsLineRigid();
        this.enabled = false;
        onLineFinalized();
        return;
      }

      if (this.mode === "spawnBall") {
        this.spawnBallFromStroke();
        this.enabled = false;
        onLineFinalized();
        return;
      }

      if (this.mode === "spawnBox") {
        this.spawnBoxFromStroke();
        this.enabled = false;
        onLineFinalized();
        return;
      }
    });
  }

  clear() {
    this.g.clear();
    this.points = [];
    this.clearBody();
  }

  // -------------------------
  // Drawing (stroke preview)
  // -------------------------

  private redrawStroke() {
    this.g.clear();
    this.g.lineStyle(this.cfg.thickness, 0xffffff, 1);

    if (this.points.length >= 2) {
      this.g.beginPath();
      this.g.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        this.g.lineTo(this.points[i].x, this.points[i].y);
      }
      this.g.strokePath();
    }
  }

  // -------------------------
  // Physics (rigid line)
  // -------------------------

  private clearBody() {
    if (!this.rigidBody) return;
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;
    matter.world.remove(this.rigidBody);
    this.rigidBody = undefined;
  }

  /** ✅ Жёсткая линия, держит форму: один compound-body */
  private buildPhysicsLineRigid() {
    this.clearBody();
    if (this.points.length < 2) return;

    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    const Bodies = (Phaser.Physics.Matter as any).Matter.Bodies;
    const Body = (Phaser.Physics.Matter as any).Matter.Body;

    const parts: MatterJS.BodyType[] = [];

    const physThickness = Math.max(2, this.cfg.thickness * this.physicsThicknessFactor);

    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];

      const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (len < 6) continue;

      const angle = Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y);
      const cx = (a.x + b.x) * 0.5;
      const cy = (a.y + b.y) * 0.5;

      // ВАЖНО: не добавляем в world отдельно, только в parts
      const seg = Bodies.rectangle(cx, cy, len, physThickness, { angle });
      parts.push(seg);
    }

    if (parts.length === 0) return;

    const compound = Body.create({
      parts,
      isStatic: false,
      density: 0.0015,
      friction: 0.8,
      restitution: 0,
      frictionAir: 0.06,
    });

    // ✅ ВАЖНО: label для распознавания линий (качеля/опасности и т.п.)
    (compound as any).label = "line";

    // ✅ добавили в мир одно тело
    matter.world.add(compound);
    this.rigidBody = compound;

    // ✅ теперь визуал должен рисоваться по body.parts, иначе “зависнет”
    this.redrawFromBody(compound);
  }

  /** перерисовка линии по текущему положению physics-body */
  private redrawFromBody(body: MatterJS.BodyType) {
    this.g.clear();
    this.g.lineStyle(this.cfg.thickness, 0xffffff, 1);

    const parts = (body as any).parts as any[];
    if (!parts || parts.length <= 1) return;

    this.g.beginPath();

    // parts[0] — служебная “основа”, реальные части обычно с 1
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const v = p.vertices; // 4 точки прямоугольника

      // рисуем контур сегмента (стабильно, без “залипаний”)
      this.g.moveTo(v[0].x, v[0].y);
      this.g.lineTo(v[1].x, v[1].y);
      this.g.lineTo(v[2].x, v[2].y);
      this.g.lineTo(v[3].x, v[3].y);
      this.g.lineTo(v[0].x, v[0].y);
    }

    this.g.strokePath();
  }

  // -------------------------
  // Helpers
  // -------------------------

  /** упрощает точки: оставляет “изломы”, выкидывает почти прямые */
  private simplifyPointsAngle(points: Vec2[], angleEpsRad = 0.15) {
    if (points.length < 3) return points;
    const out: Vec2[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const a = out[out.length - 1];
      const b = points[i];
      const c = points[i + 1];

      const abx = b.x - a.x,
        aby = b.y - a.y;
      const bcx = c.x - b.x,
        bcy = c.y - b.y;

      const ang1 = Math.atan2(aby, abx);
      const ang2 = Math.atan2(bcy, bcx);

      const d = Math.abs(Phaser.Math.Angle.Wrap(ang2 - ang1));
      if (d > angleEpsRad) out.push(b);
    }

    out.push(points[points.length - 1]);
    return out;
  }

  // -------------------------
  // Spawn modes (как у тебя)
  // -------------------------

  private spawnBallFromStroke() {
    if (this.points.length < 2) return;

    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    let sumX = 0,
      sumY = 0;
    for (const p of this.points) {
      sumX += p.x;
      sumY += p.y;
    }
    const cx = sumX / this.points.length;
    const cy = sumY / this.points.length;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const r = Math.max(12, Math.min(maxX - minX, maxY - minY) * 0.35);

    matter.add.circle(cx, cy, r, {
      isStatic: false,
      density: 0.005,
      friction: 0.3,
      restitution: 0.1,
    });
  }

  private spawnBoxFromStroke() {
    if (this.points.length < 2) return;

    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const w = Math.max(20, maxX - minX);
    const h = Math.max(20, maxY - minY);
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;

    matter.add.rectangle(cx, cy, w, h, {
      isStatic: false,
      density: 0.004,
      friction: 0.6,
      restitution: 0,
    });
  }
}