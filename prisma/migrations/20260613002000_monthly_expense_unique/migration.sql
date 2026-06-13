-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpense_recurringExpenseId_userId_referenceMonth_key" ON "MonthlyExpense"("recurringExpenseId", "userId", "referenceMonth");
