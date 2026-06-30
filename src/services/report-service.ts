import type { CreditCardPurchase, FinancialProfile, Goal, Income, InvestmentMovement, MonthlyExpense, RecurringExpense, Transaction } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ensureMonthlyExpensesForUser } from "./recurring-expense-service.js";

export type ReportPeriodInput = {
  period?: "month" | "year";
  year?: number;
  month?: number;
};

export type ReportPeriod = {
  type: "month" | "year";
  year: number;
  month?: number;
  label: string;
  start: Date;
  end: Date;
  monthCount: number;
};

type CategorySource = {
  category: string;
  amountCents: number;
};

type GoalProgressSource = {
  currentCents: number;
  targetAmountCents: number;
};

type ReportExpenseItem = {
  description: string;
  category: string;
  date: string;
  amountCents: number;
};

type ReportIncomeItem = {
  description: string;
  category: string;
  date: string;
  amountCents: number;
};

type ReportGoal = {
  id: string;
  name: string;
  currentCents: number;
  targetAmountCents: number;
  progressPercent: number;
  deadline: string | null;
};

type ReportDebt = {
  name: string;
  type: string;
  amountCents: number;
  paidCents: number;
  balanceCents: number;
};

type ReportMonthFlow = {
  key: string;
  label: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type FinancialReport = {
  generatedAt: string;
  period: {
    type: ReportPeriod["type"];
    label: string;
    year: number;
    month: number | null;
    start: string;
    end: string;
  };
  summary: {
    grossIncomeCents: number;
    generalExpenseCents: number;
    netBalanceCents: number;
    investedCents: number;
    savingsRatePercent: number;
    averageGoalProgressPercent: number;
  };
  incomeCategories: CategorySource[];
  expenseCategories: CategorySource[];
  monthlyFlow: ReportMonthFlow[];
  topIncomes: ReportIncomeItem[];
  topExpenses: ReportExpenseItem[];
  goals: ReportGoal[];
  debts: ReportDebt[];
};

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function startOfUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1));
}

function nextUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function addToCategory(map: Map<string, number>, category: string, amountCents: number) {
  map.set(category, (map.get(category) ?? 0) + amountCents);
}

function addToFlow(
  map: Map<string, ReportMonthFlow>,
  date: Date,
  direction: "income" | "expense",
  amountCents: number
) {
  const key = monthKey(date);
  const existing =
    map.get(key) ??
    ({
      key,
      label: monthNames[date.getUTCMonth()].slice(0, 3),
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0
    } satisfies ReportMonthFlow);

  if (direction === "income") {
    existing.incomeCents += amountCents;
  } else {
    existing.expenseCents += amountCents;
  }

  existing.netCents = existing.incomeCents - existing.expenseCents;
  map.set(key, existing);
}

function eachPeriodMonth(period: ReportPeriod) {
  const months: Date[] = [];
  let cursor = period.start;

  while (cursor < period.end) {
    months.push(cursor);
    cursor = nextUtcMonth(cursor);
  }

  return months;
}

export function resolveReportPeriod(input: ReportPeriodInput = {}): ReportPeriod {
  const now = new Date();
  const year = input.year ?? now.getUTCFullYear();

  if (input.period === "month") {
    const month = input.month ?? now.getUTCMonth() + 1;
    const start = startOfUtcMonth(year, month);
    const end = nextUtcMonth(start);

    return {
      type: "month",
      year,
      month,
      label: `${monthNames[month - 1]} de ${year}`,
      start,
      end,
      monthCount: 1
    };
  }

  const start = new Date(Date.UTC(year, 0, 1));

  return {
    type: "year",
    year,
    label: String(year),
    start,
    end: new Date(Date.UTC(year + 1, 0, 1)),
    monthCount: 12
  };
}

export function calculateSavingsRatePercent(netBalanceCents: number, grossIncomeCents: number) {
  if (grossIncomeCents <= 0) return 0;
  return Math.round((netBalanceCents / grossIncomeCents) * 1000) / 10;
}

export function calculateAverageGoalProgress(goals: GoalProgressSource[]) {
  if (goals.length === 0) return 0;

  const totalPercent = goals.reduce((total, goal) => {
    if (goal.targetAmountCents <= 0) return total;
    return total + clampPercent(Math.round((goal.currentCents / goal.targetAmountCents) * 100));
  }, 0);

  return Math.round(totalPercent / goals.length);
}

export function buildCategoryTotals(items: CategorySource[]) {
  const totals = new Map<string, number>();

  for (const item of items) {
    addToCategory(totals, item.category, item.amountCents);
  }

  return Array.from(totals.entries())
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

function buildBaseIncomeEntries(profile: FinancialProfile | null, period: ReportPeriod) {
  if (!profile) return [];

  return eachPeriodMonth(period).map((month) => ({
    description: "Renda mensal prevista",
    category: "Renda fixa",
    date: month,
    amountCents: profile.monthlyIncomeCents
  }));
}

function investmentOutflow(movement: InvestmentMovement) {
  return ["BUY", "DEPOSIT", "POSITION"].includes(movement.movementType);
}

function buildDebtRows(
  recurringExpenses: Array<RecurringExpense & { monthlyExpenses: MonthlyExpense[] }>,
  installments: Array<{ amountCents: number; paidAt: Date | null; purchase: Pick<CreditCardPurchase, "description"> }>
) {
  const debts: ReportDebt[] = [];

  for (const expense of recurringExpenses) {
    const monthly = expense.monthlyExpenses[0];

    if (!monthly || ["PAID", "IGNORED", "CANCELED"].includes(monthly.status)) {
      continue;
    }

    debts.push({
      name: expense.name,
      type: "Conta fixa",
      amountCents: monthly.expectedAmountCents,
      paidCents: monthly.actualAmountCents ?? 0,
      balanceCents: Math.max(0, monthly.expectedAmountCents - (monthly.actualAmountCents ?? 0))
    });
  }

  const invoiceTotal = installments.filter((item) => !item.paidAt).reduce((total, item) => total + item.amountCents, 0);

  if (invoiceTotal > 0) {
    debts.push({
      name: "Faturas abertas",
      type: "Cartao de credito",
      amountCents: invoiceTotal,
      paidCents: 0,
      balanceCents: invoiceTotal
    });
  }

  return debts.sort((a, b) => b.balanceCents - a.balanceCents);
}

export async function getFinancialReport(userId: string, input: ReportPeriodInput = {}): Promise<FinancialReport> {
  const period = resolveReportPeriod(input);
  const months = eachPeriodMonth(period);

  await Promise.all(months.map((month) => ensureMonthlyExpensesForUser(userId, month)));

  const [profile, incomes, transactions, recurringExpenses, installments, goals, goalContributions, investmentMovements] =
    await Promise.all([
      prisma.financialProfile.findUnique({ where: { userId } }),
      prisma.income.findMany({
        where: {
          userId,
          receivedAt: {
            gte: period.start,
            lt: period.end
          }
        },
        orderBy: { receivedAt: "desc" }
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          occurredAt: {
            gte: period.start,
            lt: period.end
          }
        },
        orderBy: { occurredAt: "desc" }
      }),
      prisma.recurringExpense.findMany({
        where: { userId },
        include: {
          monthlyExpenses: {
            where: {
              referenceMonth: {
                gte: period.start,
                lt: period.end
              }
            },
            orderBy: { referenceMonth: "asc" }
          }
        }
      }),
      prisma.creditCardInstallment.findMany({
        where: {
          userId,
          invoiceMonth: {
            gte: period.start,
            lt: period.end
          }
        },
        include: {
          purchase: true
        },
        orderBy: { invoiceMonth: "desc" }
      }),
      prisma.goal.findMany({
        where: { userId },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
      }),
      prisma.goalContribution.findMany({
        where: {
          userId,
          contributedAt: {
            gte: period.start,
            lt: period.end
          }
        },
        include: {
          goal: true
        },
        orderBy: { contributedAt: "desc" }
      }),
      prisma.investmentMovement.findMany({
        where: {
          userId,
          occurredAt: {
            gte: period.start,
            lt: period.end
          }
        },
        include: {
          asset: true
        },
        orderBy: { occurredAt: "desc" }
      })
    ]);

  const baseIncomeEntries = buildBaseIncomeEntries(profile, period);
  const incomeItems: ReportIncomeItem[] = [
    ...baseIncomeEntries.map((income) => ({
      description: income.description,
      category: income.category,
      date: toIsoDate(income.date),
      amountCents: income.amountCents
    })),
    ...incomes.map((income: Income) => ({
      description: income.description,
      category: income.type,
      date: toIsoDate(income.receivedAt),
      amountCents: income.amountCents
    }))
  ];

  const recurringExpenseItems: ReportExpenseItem[] = recurringExpenses.flatMap((expense) =>
    expense.monthlyExpenses
      .filter((monthly) => !["IGNORED", "CANCELED"].includes(monthly.status))
      .map((monthly) => ({
        description: expense.name,
        category: expense.category,
        date: toIsoDate(monthly.referenceMonth),
        amountCents: monthly.actualAmountCents ?? monthly.expectedAmountCents
      }))
  );
  const transactionItems: ReportExpenseItem[] = transactions.map((transaction: Transaction) => ({
    description: transaction.description,
    category: transaction.category,
    date: toIsoDate(transaction.occurredAt),
    amountCents: transaction.amountCents
  }));
  const cardItems: ReportExpenseItem[] = installments.map((installment) => ({
    description: installment.purchase.description,
    category: installment.purchase.category,
    date: toIsoDate(installment.invoiceMonth),
    amountCents: installment.amountCents
  }));
  const goalItems: ReportExpenseItem[] = goalContributions.map((contribution) => ({
    description: contribution.goal.name,
    category: "Metas",
    date: toIsoDate(contribution.contributedAt),
    amountCents: contribution.amountCents
  }));
  const investmentItems: ReportExpenseItem[] = investmentMovements.filter(investmentOutflow).map((movement) => ({
    description: movement.asset?.ticker ?? movement.movementType,
    category: "Investimentos",
    date: toIsoDate(movement.occurredAt),
    amountCents: movement.totalCents + movement.feesCents
  }));
  const expenseItems = [...recurringExpenseItems, ...transactionItems, ...cardItems, ...goalItems, ...investmentItems];
  const grossIncomeCents = incomeItems.reduce((total, item) => total + item.amountCents, 0);
  const generalExpenseCents = expenseItems.reduce((total, item) => total + item.amountCents, 0);
  const netBalanceCents = grossIncomeCents - generalExpenseCents;
  const investedCents = investmentItems.reduce((total, item) => total + item.amountCents, 0);
  const flow = new Map<string, ReportMonthFlow>();

  for (const month of months) {
    flow.set(monthKey(month), {
      key: monthKey(month),
      label: period.type === "year" ? monthNames[month.getUTCMonth()].slice(0, 3) : `${month.getUTCDate()}`,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0
    });
  }

  for (const item of incomeItems) {
    addToFlow(flow, new Date(`${item.date}T00:00:00.000Z`), "income", item.amountCents);
  }

  for (const item of expenseItems) {
    addToFlow(flow, new Date(`${item.date}T00:00:00.000Z`), "expense", item.amountCents);
  }

  return {
    generatedAt: new Date().toISOString(),
    period: {
      type: period.type,
      label: period.label,
      year: period.year,
      month: period.month ?? null,
      start: period.start.toISOString(),
      end: period.end.toISOString()
    },
    summary: {
      grossIncomeCents,
      generalExpenseCents,
      netBalanceCents,
      investedCents,
      savingsRatePercent: calculateSavingsRatePercent(netBalanceCents, grossIncomeCents),
      averageGoalProgressPercent: calculateAverageGoalProgress(goals)
    },
    incomeCategories: buildCategoryTotals(incomeItems),
    expenseCategories: buildCategoryTotals(expenseItems),
    monthlyFlow: Array.from(flow.values()).sort((a, b) => a.key.localeCompare(b.key)),
    topIncomes: incomeItems.sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
    topExpenses: expenseItems.sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
    goals: goals.map((goal: Goal) => ({
      id: goal.id,
      name: goal.name,
      currentCents: goal.currentCents,
      targetAmountCents: goal.targetAmountCents,
      progressPercent: goal.targetAmountCents > 0 ? clampPercent(Math.round((goal.currentCents / goal.targetAmountCents) * 100)) : 0,
      deadline: goal.deadline ? goal.deadline.toISOString() : null
    })),
    debts: buildDebtRows(recurringExpenses, installments)
  };
}
