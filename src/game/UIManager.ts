import Phaser from "phaser";
import { DailyTasks } from "./DailyTasks";
import { ReferralRewards } from "./ReferralRewards";

type Task = { id: string; title: string; progress: number; goal: number };
type UIHooks = {
  onModalOpen?: () => void;
  onModalClose?: () => void;

  // ✅ DEBUG
  onDebugPrevLevel?: () => void;
  onDebugNextLevel?: () => void;
  onDebugRestartLevel?: () => void;
};

export class UIManager {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;

  // HUD
  private inkText: Phaser.GameObjects.Text;
  private btnTasks: Phaser.GameObjects.Container;
  //private btnRestart: Phaser.GameObjects.Container;

  // Modals
  private modalDim: Phaser.GameObjects.Rectangle;

  private tasksModal: Phaser.GameObjects.Container;
  //private tasksListText: Phaser.GameObjects.Text;
  private tasksListContainer: Phaser.GameObjects.Container;


  private resultModal: Phaser.GameObjects.Container;
  private resultTitle: Phaser.GameObjects.Text;
  private hooks?: UIHooks;
  private winInfoText?: Phaser.GameObjects.Text;
  private headerText?: Phaser.GameObjects.Text;

  private toastText?: Phaser.GameObjects.Text;
private toastBg?: Phaser.GameObjects.Rectangle;
private toastTimer?: Phaser.Time.TimerEvent;

private debugBar?: Phaser.GameObjects.Container;
private debugLevelText?: Phaser.GameObjects.Text;
private debugEnabled = true; // выключишь на релизе

private debugTimerText?: Phaser.GameObjects.Text;

  private tasks: Task[] = [
    { id: "t1", title: "Выиграй 1 раз", progress: 0, goal: 1 },
    { id: "t2", title: "Потрать ≤ 200 ink", progress: 0, goal: 200 },
    { id: "t3", title: "Не упади 1 раз", progress: 0, goal: 1 },
  ];
  private daily = new DailyTasks();
  private referral = new ReferralRewards();

  constructor(scene: Phaser.Scene, hooks?: UIHooks) {
    this.scene = scene;
  this.hooks = hooks;

    

    this.root = scene.add.container(0, 0).setDepth(1000);

    const w = scene.scale.width;
const h = scene.scale.height;
    // затемнение (общий dim для модалок)
    this.modalDim = scene.add.rectangle(0, 0, w, h, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setVisible(false)
      .setInteractive(); // блокирует клики по игре
    this.root.add(this.modalDim);

    // HUD
    this.inkText = scene.add.text(16, 34, "Ink: 0", {
      fontSize: "18px",
      color: "#000",
      fontFamily: "Arial",
    });
    this.root.add(this.inkText);

    this.btnTasks = this.makeButton(w - 16 - 120, 10, 120, 36, "Задания", () => this.openTasks());
    this.root.add(this.btnTasks);

    //this.btnRestart = this.makeButton(w - 16 - 120, 10 + 44, 120, 36, "Рестарт", () => scene.scene.restart());
    //this.root.add(this.btnRestart);

    this.tasksListContainer = scene.add.container(0, 0);

    const tasksW = Math.min(360, w - 40);
    const tasksPanelH = 400; // подгони

this.tasksModal = this.makeModal(
  "Задания",
  this.tasksListContainer,
  () => this.closeModals(),
  { width: tasksW, height: tasksPanelH, contentAnchor: "topleft", contentOffset: { x: 0, y: 0 } }
);

    this.tasksModal.setVisible(false);
    this.root.add(this.tasksModal);

    // Result modal
    this.resultTitle = scene.add.text(0, 0, "WIN", {
  fontSize: "28px",
  color: "#000",
  fontFamily: "Arial",
}).setOrigin(0.5, 0.5);

this.resultModal = this.makeModal(
  "Результат",
  this.resultTitle,
  () => this.closeModals(),
  { width: Math.min(360, this.scene.scale.width - 40), height: 240, contentAnchor: "center", contentOffset: { x: 0, y: -20 } }
);
    // добавим кнопку "Дальше/Повторить" прямо внизу
    const btnNextW = 180;
const btnNextH = 40;
const btnNext = this.makeButton(0, 0, btnNextW, btnNextH, "Ок", () => this.closeModals());

const rmH = this.resultModal.getData("modalH") as number;

// центрируем по X, ставим ближе к низу
btnNext.x = -btnNextW / 2;
btnNext.y = rmH / 2 - btnNextH - 16;

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
    this.hooks?.onModalOpen?.();

  this.modalDim.setVisible(true);
  this.tasksModal.setVisible(true);
  this.resultModal.setVisible(false);

  this.renderTasksList();
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
    //this.btnRestart.x = w - 16 - 120;
    //this.btnRestart.y = 10 + 44;

    // center modals
    this.tasksModal.x = w * 0.5;
    this.tasksModal.y = h * 0.5;

    this.resultModal.x = w * 0.5;
    this.resultModal.y = h * 0.5;
  }
private makeModal(
  title: string,
  content: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform,
  onClose: () => void,
  opts?: {
    width?: number;
    height?: number;
    contentAnchor?: "topleft" | "center";
    contentOffset?: { x: number; y: number }; // дополнительный сдвиг
  }
) {
  const w = opts?.width ?? Math.min(360, this.scene.scale.width - 40);
  const h = opts?.height ?? 220;

  const c = this.scene.add.container(0, 0);

  const panel = this.scene.add.rectangle(0, 0, w, h, 0xffffff, 1)
    .setStrokeStyle(2, 0x000000, 0.15)
    .setOrigin(0.5, 0.5);

  const titleText = this.scene.add.text(0, -h/2 + 16, title, {
    fontSize: "20px",
    color: "#000",
    fontFamily: "Arial",
  }).setOrigin(0.5, 0);

  const anchor = opts?.contentAnchor ?? "center";
  const off = opts?.contentOffset ?? { x: 0, y: 0 };

  if (anchor === "topleft") {
    // (0,0) контента = левый верх панели
    content.setPosition(-w/2 + off.x, -h/2 + off.y);
  } else {
    // контент в центре модалки
    content.setPosition(0 + off.x, 0 + off.y);
  }

  const closeSize = 34;
  const closePadding = 12;

  const btnClose = this.makeButton(
    w/2 - closeSize - closePadding,
    -h/2 + closePadding,
    closeSize,
    closeSize,
    "✕",
    onClose
  );

  c.add([panel, titleText, content, btnClose]);

  // полезно: сохраним размеры для других расчётов
  c.setData("modalW", w);
  c.setData("modalH", h);

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

    const setEnabled = (v: boolean) => {
    bg.disableInteractive();
    if (v) bg.setInteractive({ useHandCursor: true });
    c.setAlpha(v ? 1 : 0.4);
  };

    bg.setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onClick());

    c.add([bg, t]);

    // @ts-ignore
    c.setEnabled = setEnabled;
    return c;
  }
  public setWinInfo(data: { stars: number; reward: number }) {
  if (!this.resultModal) return;

  // если ещё не создан текст — создаём
  if (!this.winInfoText) {
    this.winInfoText = this.scene.add.text(0, 30, "", {
      fontSize: "20px",
      color: "#000",
      fontFamily: "Arial",
    }).setOrigin(0.5);

    this.resultModal.add(this.winInfoText);
  }

  this.winInfoText.setText(`⭐ ${data.stars}   +${data.reward} 💰`);
}
public openTasksPublic() {
  this.openTasks();
}
public setHeader(data: { coins: number; lives: string; regenAt: number }) {
  if (!this.headerText) {
    this.headerText = this.scene.add.text(16, 16, "", { fontSize: "18px", color: "#000", fontFamily: "Arial" });
    this.root.add(this.headerText);
  }

  let regen = "";
  if (data.regenAt && data.regenAt > Date.now()) {
    const s = Math.max(0, Math.floor((data.regenAt - Date.now()) / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    regen = `  +1 через ${mm}:${ss}`;
  }

  this.headerText.setText(`💰 ${data.coins}   ❤️ ${data.lives}${regen}`);
}
public showToast(message: string, duration = 2000) {
  const w = this.scene.scale.width;
  const h = this.scene.scale.height;

  if (!this.toastBg) {
    this.toastBg = this.scene.add.rectangle(
      w / 2,
      h - 80,
      w - 60,
      44,
      0x000000,
      0.8
    ).setOrigin(0.5);

    this.toastText = this.scene.add.text(
      w / 2,
      h - 80,
      "",
      {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
      }
    ).setOrigin(0.5);

    this.root.add(this.toastBg);
    this.root.add(this.toastText);
  }

  this.toastText!.setText(message);

  this.toastBg.setAlpha(0);
  this.toastText!.setAlpha(0);

  this.scene.tweens.add({
    targets: [this.toastBg, this.toastText],
    alpha: 1,
    duration: 150,
  });

  if (this.toastTimer) {
    this.toastTimer.remove(false);
  }

  this.toastTimer = this.scene.time.delayedCall(duration, () => {
    this.scene.tweens.add({
      targets: [this.toastBg, this.toastText],
      alpha: 0,
      duration: 200,
    });
  });
}
public setGameHudVisible(v: boolean) {
  this.inkText.setVisible(v);
  this.btnTasks.setVisible(v);
  //this.btnRestart.setVisible(v);
}
private renderTasksList() {
  this.tasksListContainer.removeAll(true);

  const dailyState = this.daily.getState();
  const refState = this.referral.getState();

  const modalW = (this.tasksModal.getData("modalW") as number) ?? Math.min(360, this.scene.scale.width - 40);

  const padL = 18;
  const padR = 18;
  const padTop = 54;
  const rowSpacing = 18;

  const contentW = modalW - padL - padR;
  const btnW = 110;
  const btnH = 36;

  const textMaxWidth = contentW - btnW - 10;

  let currentY = padTop;

  // --------- SECTION: DAILY ----------
  this.addSectionTitle("Ежедневные", currentY, modalW);
  currentY += 22;

  dailyState.forEach((t) => {
    const canClaim = !t.claimed && t.progress >= t.goal;

    const title = this.scene.add.text(padL, currentY, t.title, {
      fontSize: "16px",
      color: "#000",
      fontFamily: "Arial",
      wordWrap: { width: textMaxWidth }
    });

    const prog = this.scene.add.text(
      padL,
      title.y + title.height + 4,
      `${t.progress}/${t.goal}   +${t.reward}💰`,
      { fontSize: "14px", color: "#333", fontFamily: "Arial" }
    );

    const rowHeight = (prog.y + prog.height) - currentY;

    const btnX = padL + contentW - btnW;
    const btnY = currentY + (rowHeight - btnH) / 2;

    const btnLabel = t.claimed ? "✅" : "Забрать";
    const btn = this.makeButton(btnX, btnY, btnW, btnH, btnLabel, () => {
      if (!canClaim) return;
      if (this.daily.tryClaim(t.id)) {
        this.showToast(`+${t.reward} 💰`);
        this.renderTasksList();
        this.scene.events.emit("ui:coinsChanged");
      }
    });

    // @ts-ignore
    btn.setEnabled?.(canClaim && !t.claimed);

    this.tasksListContainer.add([title, prog, btn]);
    currentY += rowHeight + rowSpacing;
  });

  // --------- SECTION: REFERRAL ----------
  currentY += 8;
  this.addSectionTitle("Пригласи друга", currentY, modalW);
  currentY += 22;

  const refTitle = this.scene.add.text(padL, currentY, "Пригласи 1 друга и получи бонус", {
    fontSize: "16px",
    color: "#000",
    fontFamily: "Arial",
    wordWrap: { width: textMaxWidth }
  });

  const refProg = this.scene.add.text(
    padL,
    refTitle.y + refTitle.height + 4,
    `${Math.min(refState.invited, refState.goal)}/${refState.goal}   +${refState.reward}💰`,
    { fontSize: "14px", color: "#333", fontFamily: "Arial" }
  );

  const refRowHeight = (refProg.y + refProg.height) - currentY;

  const refBtnX = padL + contentW - btnW;
  const refBtnY = currentY + (refRowHeight - btnH) / 2;

  const canClaimRef = !refState.claimed && refState.invited >= refState.goal;

  const refBtnLabel = refState.claimed ? "✅" : (canClaimRef ? "Забрать" : "Пригласить");

  const refBtn = this.makeButton(refBtnX, refBtnY, btnW, btnH, refBtnLabel, () => {
    if (refState.claimed) return;

    if (canClaimRef) {
      if (this.referral.tryClaimInvite1()) {
        this.showToast(`+${refState.reward} 💰`);
        this.renderTasksList();
        this.scene.events.emit("ui:coinsChanged");
      }
      return;
    }

    // TODO: тут открытие шаринга Telegram (ссылка-приглашение)
    this.showToast("Скоро: приглашение друга");
  });

  // @ts-ignore
  refBtn.setEnabled?.(!refState.claimed);

  this.tasksListContainer.add([refTitle, refProg, refBtn]);
}
private addSectionTitle(text: string, y: number, modalW: number) {
  const t = this.scene.add.text(modalW / 2, y, text, {
    fontSize: "16px",
    color: "#666",
    fontFamily: "Arial",
  })
  .setOrigin(0.5, 0);   // 🔥 центрируем по X

  this.tasksListContainer.add(t);
  return t;
}
public setDebugBarVisible(v: boolean) {
  this.debugEnabled = v;
  this.debugBar?.setVisible(v);
}

public setDebugLevel(levelId: number) {
  this.debugLevelText?.setText(`LVL ${levelId}`);
}

public createDebugBar(initialLevelId: number) {
  if (!this.debugEnabled) return;

  // если пересоздаём
  this.debugBar?.destroy(true);

  //const w = this.scene.scale.width;

  const barY = 120;
  const btnW = 54;
  const btnH = 36;
  const gap = 8;

  const x0 = 16;

  const btnPrev = this.makeButton(x0, barY, btnW, btnH, "◀", () => {
    this.hooks?.onDebugPrevLevel?.();
  });

  const btnNext = this.makeButton(x0 + (btnW + gap) * 1, barY, btnW, btnH, "▶", () => {
    this.hooks?.onDebugNextLevel?.();
  });

  const btnR = this.makeButton(x0 + (btnW + gap) * 2, barY, btnW, btnH, "↻", () => {
    this.hooks?.onDebugRestartLevel?.();
  });

  // бейдж уровня
  const badgeW = 90;
  const badgeH = btnH;

  const badge = this.scene.add.container(x0 + (btnW + gap) * 3 + 10, barY);

  const badgeBg = this.scene.add.rectangle(0, 0, badgeW, badgeH, 0xffffff, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0x000000, 0.2);

  this.debugLevelText = this.scene.add.text(badgeW / 2, badgeH / 2, `LVL ${initialLevelId}`, {
    fontSize: "16px",
    color: "#000",
    fontFamily: "Arial",
  }).setOrigin(0.5, 0.5);

  badge.add([badgeBg, this.debugLevelText]);

  // соберём в один контейнер, чтобы удобно скрывать/двигать
  this.debugBar = this.scene.add.container(0, 0, [btnPrev, btnNext, btnR, badge])
    .setDepth(2000)
    .setScrollFactor(0);

  this.root.add(this.debugBar);

  // адаптация под resize
  this.scene.scale.on("resize", () => {
    // если хочешь — можно сдвигать вправо, но сейчас слева, ок
  });
}
public setDebugTimersVisible(v: boolean) {
  if (!this.debugEnabled) return;
  this.debugTimerText?.setVisible(v);
}

public setDebugTimers(lines: string[]) {
  if (!this.debugEnabled) return;

  if (!this.debugTimerText) {
    this.debugTimerText = this.scene.add.text(16, 260, "", {
      fontSize: "14px",
      color: "#000",
      fontFamily: "Arial",
      backgroundColor: "#ffffff",
      padding: { left: 8, right: 8, top: 6, bottom: 6 } as any,
    })
    .setDepth(2000)
    .setScrollFactor(0);

    this.root.add(this.debugTimerText);
  }

  this.debugTimerText.setText(lines.join("\n"));
}
}