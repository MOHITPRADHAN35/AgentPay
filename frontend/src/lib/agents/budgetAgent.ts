import { POLICY } from "../catalog";
import { round2 } from "../policy";
import type { NormalizedProduct } from "../types/product";

export interface BudgetEvaluation {
  isAllowed: boolean;
  reason: string;
  itemPrice: number;
  taxAndShipping: number;
  totalAmount: number;
  remainingBudgetAfter: number;
  dailyLimit: number;
  singleTransactionLimit: number;
}

export function evaluateBudget(
  product: NormalizedProduct,
  currentSpentToday: number = 0,
  currentReserved: number = 0,
  customLimits?: { dailyLimit?: number; singleTransactionLimit?: number }
): BudgetEvaluation {
  const itemPrice = round2(product.price);
  const taxAndShipping = round2((product.shippingCost || 0) + (product.taxEstimated || 0));
  const totalAmount = round2(itemPrice + taxAndShipping);

  const dailyLimit = customLimits?.dailyLimit ?? POLICY.dailyLimit;
  const singleTransactionLimit = customLimits?.singleTransactionLimit ?? POLICY.singleTransactionLimit;
  const currentTotalCommitted = round2(currentSpentToday + currentReserved);
  const remainingAllowance = Math.max(0, round2(dailyLimit - currentTotalCommitted));

  // Check 1: Single transaction limit
  if (totalAmount > singleTransactionLimit) {
    return {
      isAllowed: false,
      reason: `Total cost ($${totalAmount.toFixed(2)}) exceeds single-transaction limit of $${singleTransactionLimit.toFixed(2)}.`,
      itemPrice,
      taxAndShipping,
      totalAmount,
      remainingBudgetAfter: remainingAllowance,
      dailyLimit,
      singleTransactionLimit
    };
  }

  // Check 2: Daily cumulative limit
  if (totalAmount > remainingAllowance) {
    return {
      isAllowed: false,
      reason: `Total cost ($${totalAmount.toFixed(2)}) exceeds remaining daily allowance of $${remainingAllowance.toFixed(2)} (Spent: $${currentSpentToday.toFixed(2)}, Reserved: $${currentReserved.toFixed(2)}).`,
      itemPrice,
      taxAndShipping,
      totalAmount,
      remainingBudgetAfter: remainingAllowance,
      dailyLimit,
      singleTransactionLimit
    };
  }

  const remainingAfter = Math.max(0, round2(remainingAllowance - totalAmount));

  return {
    isAllowed: true,
    reason: `Within limits. Single transaction ($${totalAmount.toFixed(2)} <= $${singleTransactionLimit.toFixed(2)}) and daily balance ($${remainingAfter.toFixed(2)} remaining).`,
    itemPrice,
    taxAndShipping,
    totalAmount,
    remainingBudgetAfter: remainingAfter,
    dailyLimit,
    singleTransactionLimit
  };
}
