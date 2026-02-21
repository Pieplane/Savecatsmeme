import Phaser from "phaser";

export class CatRunner {
  private scene: Phaser.Scene;

  public catBody: MatterJS.BodyType;
  public goalBody: MatterJS.BodyType;
  public goalTriggerBody: MatterJS.BodyType;

  public catGO: Phaser.GameObjects.Sprite;
  public goalGO: Phaser.GameObjects.Sprite;

  private running = false;
  private targetSpeedX = 2.8;

  private visualOffsetY = 64; // подбери число
  // смещение для обычной цели
private goalIdleOffsetX = -25;
private goalIdleOffsetY = 10;

// смещение для победной анимации
private goalWinOffsetX = 0;   // можно 15 если хочешь правее
private goalWinOffsetY = 0;

// текущее активное смещение
private currentGoalOffsetX = -25;
private currentGoalOffsetY = 10;
  private finishing = false;
  private onGlideFx?: () => void;
private preDrawGlide = true;
private glideFxNextAt = 0;

  


  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.scene = scene;
    const matter = (scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    this.catBody = matter.add.circle(w * 0.15, h - 140, 18, {
      friction: 0.01,
      frictionAir: 0.01,
      restitution: 0,
    });
    const Body = (Phaser.Physics.Matter as any).Matter.Body;

// не статик!
Body.setStatic(this.catBody, false);

    // не спать
    matter.body.set(this.catBody, { sleepThreshold: -1 });

    const gpX = w * 0.88;
    const gpY = h - 180;

    this.goalBody = matter.add.rectangle(gpX, gpY, 150, 100, {
      isStatic: true,
      isSensor: false,
      label: "goalSolid",
      restitution: 0,
      friction: 0.9,
    });
    // 2) SENSOR триггер победы (чуть больше)
this.goalTriggerBody = matter.add.rectangle(gpX, gpY, 200, 130, {
  isStatic: true,
  isSensor: true,
  label: "trigger:goal",
});

    //this.catGO = scene.add.circle((this.catBody as any).position.x, (this.catBody as any).position.y, 18, 0xffffff);
    const cp = (this.catBody as any).position;

// базовый кадр (первый кадр спрайтшита)
this.catGO = scene.add.sprite(cp.x, cp.y, "cat_run", 0);
// важное: чтобы визуал совпадал с физикой
this.catGO.setOrigin(0.5, 0.5);
// если размер кадра больше/меньше физического радиуса — подгони scale
// например, если кадр 64x64, а тело 36px диаметром:
this.catGO.setScale(36 / 64);
// запускаем анимацию (если она создана заранее)
this.catGO.anims.play("cat-run", true);
    //this.goalGO = scene.add.rectangle((this.goalBody as any).position.x, (this.goalBody as any).position.y, 60, 60, 0xffffff);

    const gp = (this.goalBody as any).position;

    // визуал цели
this.goalGO = scene.add.sprite(gp.x, gp.y, "goal_anim", 0);
this.goalGO.setOrigin(0.5, 0.5);

// если нужно масштабировать под 60x60 сенсор
this.goalGO.setDisplaySize(200, 200);

// запускаем анимацию
this.goalGO.anims.play("goal-loop", true);
this.currentGoalOffsetX = this.goalIdleOffsetX;
this.currentGoalOffsetY = this.goalIdleOffsetY;

this.syncGoalVisualNow();
  }

  start() {
    if (this.running || this.finishing) return;

    this.running = true;
    //const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;
    //matter.body.setVelocity(this.catBody, { x: this.targetSpeedX, y: 0 });
     const Body = (Phaser.Physics.Matter as any).Matter.Body;
  Body.setStatic(this.catBody, false);

  Body.setVelocity(this.catBody, { x: this.targetSpeedX, y: 0 });
  this.catGO.anims.play("cat-run", true);
  this.goalGO.anims.play("cat-idle", true);
  }

  stop() {
  //const Body = (Phaser.Physics.Matter as any).Matter.Body;

  //Body.setVelocity(this.catBody, { x: 0, y: 0 });
  //Body.setAngularVelocity(this.catBody, 0);
  //Body.setStatic(this.catBody, true); // полностью замораживаем
  this.running = false;

  const Body = (Phaser.Physics.Matter as any).Matter.Body;
  Body.setVelocity(this.catBody, { x: 0, y: 0 });
  Body.setAngularVelocity(this.catBody, 0);
  Body.setStatic(this.catBody, true);
  //this.catGO.anims.stop();
  //this.goalGO.anims.stop();
}

  update() {
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;
    const Body = (Phaser.Physics.Matter as any).Matter.Body;

     // ✅ ПЛАНИРОВАНИЕ до старта: ограничиваем скорость падения
  if (this.preDrawGlide && !this.finishing) {
    const v = (this.catBody as any).velocity;
    const maxFall = 0.6; // подбирай: 0.2 очень медленно, 0.6 норм, 1.2 быстрее

    if (v.y > maxFall) {
      Body.setVelocity(this.catBody, { x: 0, y: maxFall });
    }

    // эффект только если реально падает
  const now = Date.now();
  const falling = v.y > 0.15;

  if (falling && now >= this.glideFxNextAt) {
    this.onGlideFx?.();      // 🔔 сцена решает что делать
    this.glideFxNextAt = now + 350; // раз в 350мс
  }
  }

    if (this.running) {
      const v = (this.catBody as any).velocity;
      if (v.x < this.targetSpeedX) {
        matter.body.setVelocity(this.catBody, { x: this.targetSpeedX, y: v.y });
      }
    }

    const cp = (this.catBody as any).position;
    this.catGO.setPosition(cp.x, cp.y - this.visualOffsetY);
    //this.catGO.setRotation((this.catBody as any).angle);
    this.catGO.setRotation(0);

    const gp = (this.goalBody as any).position;
    //this.goalGO.setPosition(gp.x, gp.y - this.goalOffsetY);
    this.goalGO.setPosition(
  gp.x + this.currentGoalOffsetX,
  gp.y - this.currentGoalOffsetY
);
  }

  isFallenBelow(y: number) {
    const pos = (this.catBody as any).position;
    return pos && pos.y > y;
  }
  setGoalPos(x: number, y: number) {
  const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;
  matter.body.setPosition(this.goalBody, { x, y });
  matter.body.setPosition(this.goalTriggerBody, { x, y });
}
setCatPos(x: number, y: number) {
  const Body = (Phaser.Physics.Matter as any).Matter.Body;

  // ставим позицию и обнуляем физику
  Body.setPosition(this.catBody, { x, y });
  Body.setVelocity(this.catBody, { x: 0, y: 0 });
  Body.setAngularVelocity(this.catBody, 0);

  // если кот был "заморожен" — разморозим
  Body.setStatic(this.catBody, false);

  // чтобы визуал сразу обновился (не ждать update)
  this.catGO.setPosition(x, y);
}
beginWinSequence(delayMs: number, onDone: () => void) {
  if (this.finishing) return;
  this.finishing = true;

  this.stop();

  // переключаем смещение
  this.currentGoalOffsetX = this.goalWinOffsetX;
  this.currentGoalOffsetY = this.goalWinOffsetY;

  // ✅ применяем позицию сразу, даже если update больше не будет вызываться
  this.syncGoalVisualNow();

  this.goalGO.setDisplaySize(160, 160);
  this.goalGO.anims.play("goal-win", true);

  this.scene.time.delayedCall(delayMs, () => onDone());
}
private syncGoalVisualNow() {
  const gp = (this.goalBody as any).position;
  this.goalGO.setPosition(
    gp.x + this.currentGoalOffsetX,
    gp.y - this.currentGoalOffsetY
  );
}
setGoalTriggerId(id: string) {
  (this.goalTriggerBody as any).label = `trigger:${id}`;
}
setOnGlideFx(cb?: () => void) {
  this.onGlideFx = cb;
}

setPreDrawGlide(enabled: boolean) {
  this.preDrawGlide = enabled;
  this.glideFxNextAt = 0;
}

  
}