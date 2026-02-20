import Phaser from "phaser";

export class CatRunner {
  private scene: Phaser.Scene;

  public catBody: MatterJS.BodyType;
  public goalBody: MatterJS.BodyType;

  public catGO: Phaser.GameObjects.Sprite;
  public goalGO: Phaser.GameObjects.Sprite;

  private running = false;
  private targetSpeedX = 2.2;

  private visualOffsetY = 64; // подбери число
  private goalOffsetY = 10;

  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.scene = scene;
    const matter = (scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    this.catBody = matter.add.circle(w * 0.15, h - 140, 18, {
      friction: 0.01,
      frictionAir: 0.01,
      restitution: 0,
    });

    // не спать
    matter.body.set(this.catBody, { sleepThreshold: -1 });

    this.goalBody = matter.add.rectangle(w * 0.88, h - 180, 60, 60, {
      isStatic: true,
      isSensor: true,
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
  }

  start() {
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
  this.catGO.anims.stop();
  this.goalGO.anims.stop();
}

  update() {
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

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
    this.goalGO.setPosition(gp.x, gp.y - this.goalOffsetY);
  }

  isFallenBelow(y: number) {
    const pos = (this.catBody as any).position;
    return pos && pos.y > y;
  }
  setGoalPos(x: number, y: number) {
  const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;
  matter.body.setPosition(this.goalBody, { x, y });
}
setCatPos(x: number, y: number) {
  const Body = (Phaser.Physics.Matter as any).Matter.Body;

  // если кот был "заморожен" — разморозим
  Body.setStatic(this.catBody, false);

  // ставим позицию и обнуляем физику
  Body.setPosition(this.catBody, { x, y });
  Body.setVelocity(this.catBody, { x: 0, y: 0 });
  Body.setAngularVelocity(this.catBody, 0);

  // чтобы визуал сразу обновился (не ждать update)
  this.catGO.setPosition(x, y);
}
  
}