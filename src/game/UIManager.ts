import Phaser from "phaser";

type Task = { id: string; title: string; progress: number; goal: number };
type UIHooks = {
  onModalOpen?: () => void;
  onModalClose?: () => void;
};

export class UIManager {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;

  // HUD
  private inkText: Phaser.GameObjects.Text;
  private btnTasks: Phaser.GameObjects.Container;
  private btnRestart: Phaser.GameObjects.Container;

  // Modals
  private modalDim: Phaser.GameObjects.Rectangle;

  private tasksModal: Phaser.GameObjects.Container;
  private tasksListText: Phaser.GameObjects.Text;

  private resultModal: Phaser.GameObjects.Container;
  private resultTitle: Phaser.GameObjects.Text;
  private hooks?: UIHooks;

  private tasks: Task[] = [
    { id: "t1", title: "Выиграй 1 раз", progress: 0, goal: 1 },
    { id: "t2", title: "Потрать ≤ 200 ink", progress: 0, goal: 200 },
    { id: "t3", title: "Не упади 1 раз", progress: 0, goal: 1 },
  ];

  constructor(scene: Phaser.Scene, hooks?: UIHooks) {
    this.scene = scene;
  this.hooks = hooks;

    const w = scene.scale.width;
    const h = scene.scale.height;

    this.root = scene.add.container(0, 0).setDepth(1000);

    // затемнение (общий dim для модалок)
    this.modalDim = scene.add.rectangle(0, 0, w, h, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setVisible(false)
      .setInteractive(); // блокирует клики по игре
    this.root.add(this.modalDim);

    // HUD
    this.inkText = scene.add.text(16, 14, "Ink: 0", {
      fontSize: "18px",
      color: "#000",
      fontFamily: "Arial",
    });
    this.root.add(this.inkText);

    this.btnTasks = this.makeButton(w - 16 - 120, 10, 120, 36, "Задания", () => this.openTasks());
    this.root.add(this.btnTasks);

    this.btnRestart = this.makeButton(w - 16 - 120, 10 + 44, 120, 36, "Рестарт", () => scene.scene.restart());
    this.root.add(this.btnRestart);

    // Tasks modal
    this.tasksListText = scene.add.text(0, 0, "", {
      fontSize: "16px",
      color: "#000",
      fontFamily: "Arial",
      wordWrap: { width: Math.min(320, w - 64) },
    });

    this.tasksModal = this.makeModal("Задания", this.tasksListText, () => this.closeModals());
    this.tasksModal.setVisible(false);
    this.root.add(this.tasksModal);

    // Result modal
    this.resultTitle = scene.add.text(0, 0, "WIN", {
      fontSize: "28px",
      color: "#000",
      fontFamily: "Arial",
    });

    this.resultModal = this.makeModal("Результат", this.resultTitle, () => this.closeModals());
    // добавим кнопку "Дальше/Повторить" прямо внизу
    const btnNext = this.makeButton(0, 50, 180, 40, "Ок", () => this.closeModals());
    btnNext.x = -90; // центрируем по контейнеру модалки
    this.resultModal.add(btnNext);

    this.resultModal.setVisible(false);
    this.root.add(this.resultModal);

    this.layout(); // позиционирование по центру
    scene.scale.on("resize", () => this.layout());
  }

  setInk(v: number) {
    this.inkText.setText(`Ink: ${Math.max(0, Math.floor(v))}`);
  }

  showWin(onOk?: () => void) {
    this.resultTitle.setText("WIN 😺");
    this.openResult(onOk);
  }

  showLose(onOk?: () => void) {
    this.resultTitle.setText("LOSE 😿");
    this.openResult(onOk);
  }

  setTaskProgress(id: string, progress: number) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    t.progress = progress;
  }

  // ----------------- internal -----------------

  private openTasks() {
    this.hooks?.onModalOpen?.(); // ✅ выключаем рисование
    this.modalDim.setVisible(true);
    this.tasksModal.setVisible(true);
    this.resultModal.setVisible(false);

    this.tasksListText.setText(this.tasks.map(t => {
      const p = Math.min(t.progress, t.goal);
      return `• ${t.title}\n  ${p}/${t.goal}`;
    }).join("\n\n"));
  }

  private openResult(onOk?: () => void) {
    this.modalDim.setVisible(true);
    this.resultModal.setVisible(true);
    this.tasksModal.setVisible(false);

    // “Ок” кнопка — просто закрывает; если надо — вызываем callback
    if (onOk) {
      // перехватим закрытие: быстро и просто через одноразовый listener
      const once = () => { onOk(); this.scene.events.off("ui:resultClosed", once); };
      this.scene.events.on("ui:resultClosed", once);
    }
  }

  private closeModals() {
    this.modalDim.setVisible(false);
    this.tasksModal.setVisible(false);
    this.resultModal.setVisible(false);
    this.scene.events.emit("ui:resultClosed");
    this.hooks?.onModalClose?.(); // ✅ включаем рисование обратно
  }

  private layout() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    this.modalDim.setSize(w, h);

    // reposition HUD buttons
    this.btnTasks.x = w - 16 - 120;
    this.btnTasks.y = 10;
    this.btnRestart.x = w - 16 - 120;
    this.btnRestart.y = 10 + 44;

    // center modals
    this.tasksModal.x = w * 0.5;
    this.tasksModal.y = h * 0.5;

    this.resultModal.x = w * 0.5;
    this.resultModal.y = h * 0.5;
  }

  private makeModal(title: string, content: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform, onClose: () => void) {
    const w = Math.min(360, this.scene.scale.width - 40);
    const h = 220;

    const c = this.scene.add.container(0, 0);

    const panel = this.scene.add.rectangle(0, 0, w, h, 0xffffff, 1)
      .setStrokeStyle(2, 0x000000, 0.15)
      .setOrigin(0.5, 0.5);

    const titleText = this.scene.add.text(0, -h/2 + 16, title, {
      fontSize: "20px",
      color: "#000",
      fontFamily: "Arial",
    }).setOrigin(0.5, 0);

    // content
    content.setPosition(-w/2 + 18, -h/2 + 54);

    // close button (крестик)
    const btnClose = this.makeButton(w/2 - 44, -h/2 + 10, 34, 34, "✕", onClose);

    c.add([panel, titleText, content, btnClose]);
    return c;
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void) {
    const c = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, w, h, 0xffffff, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x000000, 0.2);

    const t = this.scene.add.text(w/2, h/2, label, {
      fontSize: "16px",
      color: "#000",
      fontFamily: "Arial",
    }).setOrigin(0.5, 0.5);

    bg.setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onClick());

    c.add([bg, t]);
    return c;
  }
}