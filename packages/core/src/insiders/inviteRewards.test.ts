import { describe, expect, it } from "vitest";
import { maskPhone } from "./insiderSignIn";
import {
  validateInviteRewardRule,
  type InviteRewardRuleInput,
} from "./inviteRewards";

const good: InviteRewardRuleInput = {
  invites: 10,
  rewardType: "AMOUNT_OFF",
  value: 500,
  freeVariantId: null,
  validDays: 90,
  isActive: true,
};

describe("invite reward rules", () => {
  it("accepts money off, percent off and a free item", () => {
    expect(validateInviteRewardRule(good)).toEqual({});
    expect(
      validateInviteRewardRule({
        ...good,
        rewardType: "PERCENT_OFF",
        value: 10,
      }),
    ).toEqual({});
    expect(
      validateInviteRewardRule({
        ...good,
        rewardType: "FREE_ITEM",
        value: null,
        freeVariantId: "v1",
      }),
    ).toEqual({});
  });

  it("explains each problem", () => {
    const errors = validateInviteRewardRule({
      ...good,
      invites: 0,
      value: 0,
      validDays: 0,
    });
    expect(errors.invites).toBeTruthy();
    expect(errors.value).toBeTruthy();
    expect(errors.validDays).toBeTruthy();
    expect(
      validateInviteRewardRule({
        ...good,
        rewardType: "PERCENT_OFF",
        value: 95,
      }).value,
    ).toBeTruthy();
    expect(
      validateInviteRewardRule({
        ...good,
        rewardType: "FREE_ITEM",
        value: null,
      }).freeVariantId,
    ).toBeTruthy();
  });
});

describe("maskPhone", () => {
  it("shows only the last four digits", () => {
    expect(maskPhone("+919876543210")).toBe("••••••3210");
  });
});
