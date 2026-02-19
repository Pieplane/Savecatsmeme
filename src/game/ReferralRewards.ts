import { loadProgress, saveProgress } from "../services/progress";

export type ReferralState = {
  invited: number;
  goal: number;
  reward: number;
  claimed: boolean;
};

export class ReferralRewards {
  // для теста/отладки
  incInvited(amount = 1) {
    const p = loadProgress();
    p.referral ??= { invitedCount: 0, claimedInvite1: false };

    p.referral.invitedCount = (p.referral.invitedCount ?? 0) + amount;
    saveProgress(p);
  }

  getState(): ReferralState {
    const p = loadProgress();
    p.referral ??= { invitedCount: 0, claimedInvite1: false };

    return {
      invited: p.referral.invitedCount ?? 0,
      goal: 1,
      reward: 100,
      claimed: p.referral.claimedInvite1 === true,
    };
  }

  tryClaimInvite1(): boolean {
    const p = loadProgress();
    p.referral ??= { invitedCount: 0, claimedInvite1: false };

    if (p.referral.claimedInvite1) return false;
    if ((p.referral.invitedCount ?? 0) < 1) return false;

    p.coins += 100;
    p.referral.claimedInvite1 = true;
    saveProgress(p);
    return true;
  }
}