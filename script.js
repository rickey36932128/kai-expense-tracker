const STORAGE_KEY = "kai-expense-tracker-v1";
const APP_VERSION = "v18";
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
const UPDATE_STATUS_HIDE_MS = 2200;
const DEFAULT_CURRENCY = "TWD";
const CURRENCY_OPTIONS = new Set(["TWD", "JPY"]);

const elements = {};
let state = loadState();
let selectedMonth = new Date();
let activeEntryType = "expense";
let activeAnalysisType = "expense";
let refreshingForUpdate = false;
let updateStatusTimer = 0;

document.addEventListener("DOMContentLoaded", init);

function init() {
  elements.tabButtons = document.querySelectorAll(".tab-bar button");
  elements.screens = document.querySelectorAll(".screen");
  elements.recentList = document.querySelector("#recent-list");
  elements.recordsList = document.querySelector("#records-list");
  elements.recordsTotal = document.querySelector("#records-total");
  elements.monthTotal = document.querySelector("#month-total");
  elements.todayTotal = document.querySelector("#today-total");
  elements.debtList = document.querySelector("#debt-list");
  elements.debtTotal = document.querySelector("#debt-total");
  elements.debtCount = document.querySelector("#debt-count");
  elements.selectedMonthLabel = document.querySelector("#selected-month-label");
  elements.recordsListTitle = document.querySelector("#records-list-title");
  elements.monthBalance = document.querySelector("#month-balance");
  elements.recordsExpenseTotal = document.querySelector("#records-expense-total");
  elements.recordsIncomeTotal = document.querySelector("#records-income-total");
  elements.analysisCurrency = document.querySelector("#analysis-currency");
  elements.chartTotalLabel = document.querySelector("#chart-total-label");
  elements.chartCurrency = document.querySelector("#chart-currency");
  elements.categoryChart = document.querySelector("#category-chart");
  elements.chartLegend = document.querySelector("#chart-legend");
  elements.offlineStatus = document.querySelector("#offline-status");
  elements.parsedDate = document.querySelector("#parsed-date");
  elements.expenseForm = document.querySelector("#expense-form");
  elements.expenseInput = document.querySelector("#expense-input");
  elements.debtForm = document.querySelector("#debt-form");
  elements.updateStatus = document.querySelector("#update-status");
  elements.updateStatusText = document.querySelector("#update-status-text");
  elements.checkUpdate = document.querySelector("#check-update");
  elements.appVersion = document.querySelector("#app-version");
  elements.settingsCurrency = document.querySelector("#settings-currency");
  elements.currencyButtons = document.querySelectorAll("[data-currency]");
  elements.entryTypeButtons = document.querySelectorAll("[data-entry-type]");
  elements.analysisTypeButtons = document.querySelectorAll("[data-analysis-type]");
  elements.expenseEditSheet = document.querySelector("#expense-edit-sheet");
  elements.expenseEditForm = document.querySelector("#expense-edit-form");
  elements.expenseEditId = document.querySelector("#expense-edit-id");
  elements.expenseEditType = document.querySelector("#expense-edit-type");
  elements.expenseEditDate = document.querySelector("#expense-edit-date");
  elements.expenseEditAmountInput = document.querySelector("#expense-edit-amount-input");
  elements.expenseEditTitle = document.querySelector("#expense-edit-title");
  elements.expenseEditMeta = document.querySelector("#expense-edit-meta");
  elements.expenseEditAmount = document.querySelector("#expense-edit-amount");
  elements.expenseEditClose = document.querySelector("#expense-edit-close");
  elements.expenseEditCancel = document.querySelector("#expense-edit-cancel");
  elements.expenseEditTypeButtons = document.querySelectorAll("[data-edit-type]");
  elements.expenseEditDateTrigger = document.querySelector("#expense-edit-date-trigger");
  elements.expenseEditDateLabel = document.querySelector("#expense-edit-date-label");
  elements.expenseEditDelete = document.querySelector("#expense-edit-delete");

  document.addEventListener("dblclick", preventDoubleTapZoom, { passive: false });
  elements.expenseForm.addEventListener("submit", addExpenseFromText);
  elements.expenseInput.addEventListener("keydown", handleExpenseInputKeydown);
  elements.debtForm.addEventListener("submit", addDebtFromForm);
  document.querySelector("#prev-month").addEventListener("click", () => changeMonth(-1));
  document.querySelector("#next-month").addEventListener("click", () => changeMonth(1));
  document.querySelector("#clear-debts").addEventListener("click", clearDebts);
  document.querySelector("#reset-data").addEventListener("click", resetData);
  elements.checkUpdate.addEventListener("click", () => checkForUpdates(true));
  elements.appVersion.textContent = APP_VERSION;
  elements.currencyButtons.forEach((button) => {
    button.addEventListener("click", () => setCurrency(button.dataset.currency));
  });
  elements.entryTypeButtons.forEach((button) => {
    button.addEventListener("click", () => setEntryType(button.dataset.entryType));
  });
  elements.analysisTypeButtons.forEach((button) => {
    button.addEventListener("click", () => setAnalysisType(button.dataset.analysisType));
  });
  elements.expenseEditTypeButtons.forEach((button) => {
    button.addEventListener("click", () => setEditRecordType(button.dataset.editType));
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.target));
  });

  document.querySelectorAll("[data-target-tab]").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.targetTab));
  });

  elements.recentList.addEventListener("click", handleExpenseListClick);
  elements.recordsList.addEventListener("click", handleExpenseListClick);
  elements.debtList.addEventListener("click", handleDebtDelete);
  elements.expenseEditForm.addEventListener("submit", saveExpenseDateEdit);
  elements.expenseEditClose.addEventListener("click", closeExpenseEditor);
  elements.expenseEditCancel.addEventListener("click", closeExpenseEditor);
  elements.expenseEditDate.addEventListener("change", updateEditDateLabel);
  elements.expenseEditDateTrigger.addEventListener("click", openEditDatePicker);
  elements.expenseEditDelete.addEventListener("click", deleteEditingRecord);
  elements.expenseEditSheet.addEventListener("click", (event) => {
    if (event.target === elements.expenseEditSheet) closeExpenseEditor();
  });

  saveState();
  render();
  registerServiceWorker();
}

function getDefaultState() {
  return {
    expenses: [],
    incomes: [],
    debts: [],
    currency: DEFAULT_CURRENCY,
  };
}

function preventDoubleTapZoom(event) {
  event.preventDefault();
}

function createExpense(title, amount, category = "??", date = new Date()) {
  return createMoneyItem(title, amount, category, date);
}

function createIncome(title, amount, category = "??", date = new Date()) {
  return createMoneyItem(title, amount, category, date);
}

function createMoneyItem(title, amount, category = "??", date = new Date()) {
  return {
    id: createId(),
    title,
    amount,
    category,
    currency: getCurrency(),
    date: new Date(date).toISOString(),
  };
}

function createDebt(friend, item, amount, date = new Date()) {
  return {
    id: createId(),
    friend,
    item,
    amount,
    currency: getCurrency(),
    date: new Date(date).toISOString(),
  };
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultState();

  try {
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return getDefaultState();
    return cleanState(parsed);
  } catch {
    return getDefaultState();
  }
}

function isValidState(value) {
  return value && Array.isArray(value.expenses) && Array.isArray(value.debts);
}

function cleanState(value) {
  return {
    expenses: value.expenses.filter((expense) => isValidExpense(expense) && !isSeedExpense(expense)).map(normalizeMoneyItem),
    incomes: Array.isArray(value.incomes) ? value.incomes.filter(isValidMoneyItem).map(normalizeMoneyItem) : [],
    debts: value.debts.filter((debt) => isValidDebt(debt) && !isSeedDebt(debt)).map(normalizeMoneyItem),
    currency: CURRENCY_OPTIONS.has(value.currency) ? value.currency : DEFAULT_CURRENCY,
  };
}

function normalizeMoneyItem(item) {
  return {
    ...item,
    currency: CURRENCY_OPTIONS.has(item.currency) ? item.currency : DEFAULT_CURRENCY,
  };
}

function isValidExpense(expense) {
  return isValidMoneyItem(expense);
}

function isValidMoneyItem(expense) {
  return (
    expense &&
    typeof expense.id === "string" &&
    typeof expense.title === "string" &&
    Number.isFinite(Number(expense.amount)) &&
    typeof expense.category === "string" &&
    !hasCorruptText(expense)
  );
}

function isValidDebt(debt) {
  return (
    debt &&
    typeof debt.id === "string" &&
    typeof debt.friend === "string" &&
    typeof debt.item === "string" &&
    Number.isFinite(Number(debt.amount)) &&
    !hasCorruptText(debt)
  );
}

function hasCorruptText(value) {
  const text = JSON.stringify(value);
  return /[\uFFFD\u95AE\u875D\u7508\u649F\u929D\u761D\u876F\u769C\u5697]/.test(text);
}

function isSeedExpense(expense) {
  const seeds = new Set(["??:85", "??:85", "??:35", "??:120"]);
  return seeds.has(`${expense.title}:${Number(expense.amount)}`);
}

function isSeedDebt(debt) {
  const seeds = new Set(["??:??:280", "??:???:1200", "??:??:400"]);
  return seeds.has(`${debt.friend}:${debt.item}:${Number(debt.amount)}`);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrency() {
  return CURRENCY_OPTIONS.has(state.currency) ? state.currency : DEFAULT_CURRENCY;
}

function setCurrency(currency) {
  if (!CURRENCY_OPTIONS.has(currency)) return;

  state.currency = currency;
  saveState();
  render();
}

function setEntryType(type) {
  if (!["expense", "income"].includes(type)) return;
  activeEntryType = type;
  renderModeButtons();
  elements.expenseInput.focus();
}

function setAnalysisType(type) {
  if (!["expense", "income"].includes(type)) return;
  activeAnalysisType = type;
  render();
}

function getCurrencyLabel(currency = getCurrency()) {
  return currency === "JPY" ? "?" : "NT$";
}

function formatMoney(amount, currency = getCurrency()) {
  return `${getCurrencyLabel(currency)} ${Number(amount).toLocaleString(currency === "JPY" ? "ja-JP" : "zh-Hant-TW")}`;
}

function formatDateLabel(value) {
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) return "??";

  return `${date.getMonth() + 1} ? ${date.getDate()} ?`;
}

function formatShortDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--";

  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatFullDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${date.getFullYear()}?${String(date.getMonth() + 1).padStart(2, "0")}?${String(date.getDate()).padStart(2, "0")}?`;
}

function getMonthKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedMonthKey() {
  return getMonthKey(selectedMonth);
}

function inferCategory(title) {
  if (/??|??|??|??|??|??|?|?|?|??/i.test(title)) return "??";
  if (/??|??|??|uber|???|??|??/i.test(title)) return "??";
  if (/??|??|?|momo|pchome|??|??/i.test(title)) return "??";
  if (/??|???|??|???|???/i.test(title)) return "??";
  return "??";
}

function inferIncomeCategory(title) {
  if (/??|??|??|??|salary|pay/i.test(title)) return "??";
  if (/??|bonus|??|??/i.test(title)) return "??";
  if (/??|??|??/i.test(title)) return "??";
  if (/??|??|??|??/i.test(title)) return "??";
  return "????";
}

function parseMoneyText(text, type = activeEntryType) {
  const value = text.trim();
  const textFirstMatch = value.match(/^(.+?)\s*([0-9,]+)$/);
  const amountFirstMatch = value.match(/^([0-9,]+)\s*(.+?)$/);

  const title = textFirstMatch ? textFirstMatch[1].trim() : amountFirstMatch?.[2].trim();
  const amountText = textFirstMatch ? textFirstMatch[2] : amountFirstMatch?.[1];

  if (!title || !amountText) return null;

  const amount = Number(amountText.replaceAll(",", ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return type === "income"
    ? createIncome(title, amount, inferIncomeCategory(title))
    : createExpense(title, amount, inferCategory(title));
}

function addExpenseFromText(event) {
  event.preventDefault();
  const item = parseMoneyText(elements.expenseInput.value, activeEntryType);

  if (!item) {
    elements.expenseInput.focus();
    elements.expenseInput.classList.add("is-invalid");
    window.setTimeout(() => elements.expenseInput.classList.remove("is-invalid"), 500);
    return;
  }

  if (activeEntryType === "income") {
    state.incomes.unshift(item);
  } else {
    state.expenses.unshift(item);
  }
  saveState();
  elements.expenseInput.value = "";
  elements.expenseInput.focus();
  render();
}

function handleExpenseInputKeydown(event) {
  if (event.key !== "Enter" || event.isComposing) return;

  event.preventDefault();
  if (typeof elements.expenseForm.requestSubmit === "function") {
    elements.expenseForm.requestSubmit();
  } else {
    elements.expenseForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }
}

function addDebtFromForm(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const friend = String(formData.get("friend") || "").trim();
  const item = String(formData.get("item") || "").trim();
  const amount = Number(String(formData.get("amount") || "").replaceAll(",", ""));

  if (!friend || !item || !Number.isFinite(amount) || amount <= 0) return;

  state.debts.unshift(createDebt(friend, item, amount));
  saveState();
  event.currentTarget.reset();
  render();
}

function handleExpenseListClick(event) {
  const button = event.target.closest("[data-delete-expense]");
  if (button) {
    deleteExpense(button.dataset.deleteExpense);
    return;
  }

  const incomeButton = event.target.closest("[data-delete-income]");
  if (incomeButton) {
    deleteIncome(incomeButton.dataset.deleteIncome);
    return;
  }

  const editableRecord = event.target.closest("[data-edit-money]");
  if (editableRecord) {
    openMoneyEditor(editableRecord.dataset.editMoney, editableRecord.dataset.editMoneyType || "expense");
    return;
  }

  const item = event.target.closest("[data-edit-expense]");
  if (!item) return;

  openExpenseEditor(item.dataset.editExpense);
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  saveState();
  if (elements.expenseEditId.value === id) closeExpenseEditor();
  render();
}

function deleteIncome(id) {
  state.incomes = state.incomes.filter((income) => income.id !== id);
  saveState();
  if (elements.expenseEditId.value === id) closeExpenseEditor();
  render();
}

function openExpenseEditorLegacy(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) return;

  elements.expenseEditId.value = expense.id;
  elements.expenseEditDate.value = formatDateInput(expense.date);
  elements.expenseEditAmountInput.value = Number(expense.amount).toLocaleString("en-US");
  elements.expenseEditTitle.textContent = expense.title;
  elements.expenseEditMeta.textContent = `${expense.category} ? ${formatDateLabel(expense.date)}`;
  elements.expenseEditAmount.textContent = `-${formatMoney(expense.amount, expense.currency)}`;
  elements.expenseEditSheet.hidden = false;
  elements.expenseEditDate.focus();
}

function openExpenseEditor(id) {
  openMoneyEditor(id, "expense");
}

function openMoneyEditor(id, type) {
  const list = type === "income" ? state.incomes : state.expenses;
  const record = list.find((item) => item.id === id);
  if (!record) return;

  elements.expenseEditId.value = record.id;
  elements.expenseEditType.dataset.originalType = type;
  elements.expenseEditDate.value = formatDateInput(record.date);
  elements.expenseEditAmountInput.value = Number(record.amount).toLocaleString("en-US");
  elements.expenseEditTitle.value = record.title;
  elements.expenseEditMeta.textContent = "??";
  updateEditDateLabel();
  elements.expenseEditAmount.textContent = `${type === "income" ? "+" : "-"}${formatMoney(record.amount, record.currency)}`;
  elements.expenseEditAmount.classList.toggle("is-income", type === "income");
  setEditRecordType(type);
  elements.expenseEditSheet.hidden = false;
  elements.expenseEditDate.focus();
}

function closeExpenseEditor() {
  elements.expenseEditSheet.hidden = true;
  elements.expenseEditForm.reset();
  elements.expenseEditId.value = "";
  elements.expenseEditType.value = "";
  elements.expenseEditType.dataset.originalType = "";
  elements.expenseEditAmount.classList.remove("is-income");
  elements.expenseEditDateLabel.textContent = "-";
}

function saveExpenseDateEdit(event) {
  event.preventDefault();
  const id = elements.expenseEditId.value;
  const originalType = elements.expenseEditType.dataset.originalType || "expense";
  const nextType = elements.expenseEditType.value || originalType;
  const source = originalType === "income" ? state.incomes : state.expenses;
  const recordIndex = source.findIndex((item) => item.id === id);
  const record = source[recordIndex];
  const amount = parseAmountInput(elements.expenseEditAmountInput.value);
  const title = elements.expenseEditTitle.value.trim();
  if (!record || !title || !elements.expenseEditDate.value || amount === null) return;

  record.title = title;
  record.date = mergeDateWithExistingTime(elements.expenseEditDate.value, record.date);
  record.amount = amount;

  if (nextType !== originalType) {
    source.splice(recordIndex, 1);
    record.category = nextType === "income" ? inferIncomeCategory(record.title) : inferCategory(record.title);
    const target = nextType === "income" ? state.incomes : state.expenses;
    target.unshift(record);
  }

  saveState();
  closeExpenseEditor();
  render();
}

function openEditDatePicker() {
  if (typeof elements.expenseEditDate.showPicker === "function") {
    elements.expenseEditDate.showPicker();
    return;
  }
  elements.expenseEditDate.focus();
  elements.expenseEditDate.click();
}

function updateEditDateLabel() {
  elements.expenseEditDateLabel.textContent = formatFullDateLabel(elements.expenseEditDate.value);
}

function deleteEditingRecord() {
  const id = elements.expenseEditId.value;
  const type = elements.expenseEditType.dataset.originalType || elements.expenseEditType.value || "expense";
  if (!id) return;

  if (type === "income") {
    state.incomes = state.incomes.filter((income) => income.id !== id);
  } else {
    state.expenses = state.expenses.filter((expense) => expense.id !== id);
  }
  saveState();
  closeExpenseEditor();
  render();
}

function setEditRecordType(type) {
  const nextType = type === "income" ? "income" : "expense";
  elements.expenseEditType.value = nextType;
  elements.expenseEditTypeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.editType === nextType);
  });
  if (elements.expenseEditId.value) {
    const amount = parseAmountInput(elements.expenseEditAmountInput.value);
    if (amount !== null) {
      elements.expenseEditAmount.textContent = `${nextType === "income" ? "+" : "-"}${formatMoney(amount)}`;
      elements.expenseEditAmount.classList.toggle("is-income", nextType === "income");
    }
  }
}

function parseAmountInput(value) {
  const amount = Number(String(value || "").replaceAll(",", "").trim());
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function formatDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mergeDateWithExistingTime(dateText, existingValue) {
  const [year, month, day] = dateText.split("-").map(Number);
  const existing = new Date(existingValue);
  const hours = Number.isNaN(existing.getTime()) ? 12 : existing.getHours();
  const minutes = Number.isNaN(existing.getTime()) ? 0 : existing.getMinutes();
  const seconds = Number.isNaN(existing.getTime()) ? 0 : existing.getSeconds();

  return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
}

function handleDebtDelete(event) {
  const button = event.target.closest("[data-delete-debt]");
  if (!button) return;

  state.debts = state.debts.filter((debt) => debt.id !== button.dataset.deleteDebt);
  saveState();
  render();
}

function clearDebts() {
  state.debts = [];
  saveState();
  render();
}

function resetData() {
  state = getDefaultState();
  selectedMonth = new Date();
  saveState();
  render();
}

function changeMonth(delta) {
  selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1);
  render();
}

function showTab(target) {
  elements.tabButtons.forEach((item) => item.classList.toggle("active", item.dataset.target === target));
  elements.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === target);
  });
}

function render() {
  const nowKey = getMonthKey(new Date());
  const today = new Date().toDateString();
  const currency = getCurrency();
  const currencyExpenses = state.expenses.filter((expense) => expense.currency === currency);
  const currencyIncomes = state.incomes.filter((income) => income.currency === currency);
  const currencyDebts = state.debts.filter((debt) => debt.currency === currency);
  const thisMonthExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === nowKey);
  const todayExpenses = currencyExpenses.filter((expense) => new Date(expense.date).toDateString() === today);
  const recentTransactions = combineTransactions(currencyExpenses, currencyIncomes).slice(0, 4);
  const selectedExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === getSelectedMonthKey());
  const selectedIncomes = currencyIncomes.filter((income) => getMonthKey(income.date) === getSelectedMonthKey());
  const selectedAnalysisItems = activeAnalysisType === "income" ? selectedIncomes : selectedExpenses;
  const monthExpenseTotal = sumAmounts(selectedExpenses);
  const monthIncomeTotal = sumAmounts(selectedIncomes);
  const monthBalance = monthIncomeTotal - monthExpenseTotal;
  const debtSum = currencyDebts.reduce((sum, debt) => sum + Number(debt.amount), 0);

  elements.monthTotal.textContent = formatMoney(sumAmounts(thisMonthExpenses));
  elements.todayTotal.textContent = formatMoney(sumAmounts(todayExpenses));
  elements.recordsTotal.textContent = formatChartTotal(sumAmounts(selectedAnalysisItems), activeAnalysisType);
  elements.monthBalance.textContent = formatSignedMoney(monthBalance, currency);
  elements.recordsExpenseTotal.textContent = formatPlainNumber(monthExpenseTotal);
  elements.recordsIncomeTotal.textContent = formatPlainNumber(monthIncomeTotal);
  elements.analysisCurrency.textContent = currency;
  elements.chartCurrency.textContent = getCurrencyLabel(currency);
  elements.chartTotalLabel.textContent = activeAnalysisType === "income" ? "???" : "???";
  elements.selectedMonthLabel.textContent = `${selectedMonth.getFullYear()} ? ${selectedMonth.getMonth() + 1} ?`;
  elements.recordsListTitle.textContent = `${selectedMonth.getMonth() + 1} ?${activeAnalysisType === "income" ? "??" : "??"}??`;
  elements.debtTotal.textContent = formatMoney(debtSum);
  elements.debtCount.textContent = `${currencyDebts.length} ?`;
  elements.settingsCurrency.textContent = currency;
  renderModeButtons();

  renderLatestTransaction(recentTransactions[0]);
  renderTransactionList(elements.recentList, recentTransactions, "??????");
  renderCategoryAnalysis(selectedAnalysisItems, activeAnalysisType);
  renderDebtList(currencyDebts);
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}

function formatPlainNumber(amount) {
  return Number(amount).toLocaleString(getCurrency() === "JPY" ? "ja-JP" : "zh-Hant-TW");
}

function formatChartTotal(amount, type) {
  const sign = type === "income" || Number(amount) === 0 ? "" : "-";
  return `${sign}${formatPlainNumber(amount)}`;
}

function formatSignedMoney(amount, currency = getCurrency()) {
  const sign = Number(amount) < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(amount), currency)}`;
}

function renderModeButtons() {
  const currency = getCurrency();
  elements.currencyButtons.forEach((button) => button.classList.toggle("active", button.dataset.currency === currency));
  elements.entryTypeButtons.forEach((button) => button.classList.toggle("active", button.dataset.entryType === activeEntryType));
  elements.analysisTypeButtons.forEach((button) => button.classList.toggle("active", button.dataset.analysisType === activeAnalysisType));
}

function combineTransactions(expenses, incomes) {
  return [
    ...expenses.map((item) => ({ ...item, type: "expense" })),
    ...incomes.map((item) => ({ ...item, type: "income" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderLatestTransaction(item) {
  if (!item) {
    document.querySelector("#parsed-title").textContent = "????";
    document.querySelector("#parsed-amount").textContent = formatMoney(0);
    document.querySelector("#parsed-category").textContent = "-";
    elements.parsedDate.textContent = "-";
    return;
  }

  document.querySelector("#parsed-title").textContent = item.title;
  document.querySelector("#parsed-amount").textContent = `${item.type === "income" ? "+" : "-"}${formatMoney(item.amount, item.currency)}`;
  document.querySelector("#parsed-amount").classList.toggle("is-income", item.type === "income");
  document.querySelector("#parsed-category").textContent = item.category;
  elements.parsedDate.textContent = formatDateLabel(item.date);
}

function renderTransactionList(target, transactions, emptyText) {
  if (!transactions.length) {
    target.innerHTML = `<li class="empty-state">${emptyText}</li>`;
    return;
  }

  target.innerHTML = transactions
    .map(
      (item) => `
        <li data-edit-money="${item.id}" data-edit-money-type="${item.type}" ${item.type === "expense" ? `data-edit-expense="${item.id}"` : ""}>
          <span class="category-dot ${getCategoryClass(item.category)}"></span>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.category)} ? ${formatDateLabel(item.date)}</p>
          </div>
          <b class="${item.type === "income" ? "income-amount" : ""}">${item.type === "income" ? "+" : "-"}${formatMoney(item.amount, item.currency)}</b>
          <button class="delete-button" type="button" data-delete-${item.type}="${item.id}" aria-label="?? ${escapeHtml(item.title)}">x</button>
        </li>
      `
    )
    .join("");
}

function renderCategoryAnalysis(items, type) {
  const groups = groupByCategory(items);
  const total = groups.reduce((sum, group) => sum + group.amount, 0);

  renderDonutChart(groups, total);
  renderCategorySummary(groups, type, total);
}

function groupByCategory(items) {
  const map = new Map();

  items.forEach((item) => {
    const current = map.get(item.category) || {
      category: item.category,
      amount: 0,
      count: 0,
      items: [],
    };

    current.amount += Number(item.amount);
    current.count += 1;
    current.items.push(item);
    map.set(item.category, current);
  });

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function renderDonutChart(groups, total) {
  if (!groups.length || total <= 0) {
    elements.categoryChart.style.background = "conic-gradient(#e5e5ea 0 100%)";
    elements.chartLegend.innerHTML = `<p class="empty-chart">??????${activeAnalysisType === "income" ? "??" : "??"}??</p>`;
    return;
  }

  let cursor = 0;
  const segments = groups.map((group, index) => {
    const percent = (group.amount / total) * 100;
    const start = cursor;
    cursor += percent;
    return `${getChartColor(index)} ${start}% ${cursor}%`;
  });

  elements.categoryChart.style.background = `conic-gradient(${segments.join(", ")})`;
  elements.chartLegend.innerHTML = groups
    .slice(0, 4)
    .map((group, index) => {
      const percent = Math.round((group.amount / total) * 1000) / 10;
      return `
        <div>
          <i style="background:${getChartColor(index)}"></i>
          <span>${escapeHtml(group.category)}</span>
          <strong>${percent.toFixed(1)}%</strong>
        </div>
      `;
    })
    .join("");
}

function renderCategorySummary(groups, type, total) {
  if (!groups.length) {
    elements.recordsList.innerHTML = `<li class="empty-state">??????${type === "income" ? "??" : "??"}</li>`;
    return;
  }

  elements.recordsList.innerHTML = groups
    .map((group, index) => {
      const sign = type === "income" ? "+" : "-";
      const isExpandable = group.count > 1;
      const details = group.items
        .map(
          (item) => `
            <li class="category-detail-row" data-edit-money="${item.id}" data-edit-money-type="${type}">
              <span class="category-detail-title"><span>${formatShortDateLabel(item.date)}</span><i>?</i>${escapeHtml(item.title)}</span>
              <b>${sign}${formatPlainNumber(item.amount)}</b>
              <button class="category-detail-edit" type="button" data-edit-money="${item.id}" data-edit-money-type="${type}" aria-label="?? ${escapeHtml(item.title)}">?</button>
            </li>
          `
        )
        .join("");
      const row = `
        <span class="category-summary-swatch" style="background:${getChartColor(index)}"></span>
        <strong>${escapeHtml(group.category)} <em>(${group.count}?)</em></strong>
        <b class="summary-amount">${sign}${formatPlainNumber(group.amount)}</b>
        <span class="summary-chevron${isExpandable ? "" : " summary-chevron-placeholder"}" aria-hidden="true">${isExpandable ? "?" : "?"}</span>
      `;

      return `
        <li class="category-summary-item">
          ${
            isExpandable
              ? `<details>
            <summary>${row}</summary>
            <ul>${details}</ul>
          </details>`
              : `<div class="category-summary-static">${row}</div>`
          }
        </li>
      `;
    })
    .join("");
}

function getChartColor(index) {
  const colors = ["#0a84ff", "#12bfa4", "#ffbe2e", "#af52de", "#ff6b3a", "#34c759"];
  return colors[index % colors.length];
}

function renderDebtList(debts) {
  if (!debts.length) {
    elements.debtList.innerHTML = `<li class="empty-state">????????</li>`;
    return;
  }

  elements.debtList.innerHTML = debts
    .map(
      (debt) => `
        <li>
          <span class="avatar">${escapeHtml(debt.friend.slice(-1))}</span>
          <div>
            <strong>${escapeHtml(debt.friend)}</strong>
            <p>${escapeHtml(debt.item)} ? ${formatDateLabel(debt.date)}</p>
          </div>
          <b>${formatMoney(debt.amount, debt.currency)}</b>
          <button class="delete-button" data-delete-debt="${debt.id}" aria-label="?? ${escapeHtml(debt.friend)}">x</button>
        </li>
      `
    )
    .join("");
}

function getCategoryClass(category) {
  const map = {
    ??: "food",
    ??: "transit",
    ??: "shopping",
    ??: "grocery",
  };
  return map[category] || "other";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    elements.offlineStatus.textContent = "???????";
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("./sw.js?v=17");
    elements.offlineStatus.textContent = "?????";

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshingForUpdate) return;
      refreshingForUpdate = true;
      setUpdateStatus("???????????", UPDATE_STATUS_HIDE_MS);
      window.setTimeout(() => window.location.reload(), 450);
    });

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateStatus("??????????", UPDATE_STATUS_HIDE_MS);
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    elements.offlineStatus.textContent = "?????";
    await checkForUpdates(false, registration);
    window.setInterval(() => checkForUpdates(false, registration), UPDATE_CHECK_INTERVAL);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdates(false, registration);
    });
  } catch {
    elements.offlineStatus.textContent = "????????";
  }
}

async function checkForUpdates(isManual = false, existingRegistration = null) {
  if (!("serviceWorker" in navigator)) return;

  const registration = existingRegistration || (await navigator.serviceWorker.getRegistration("./"));
  if (!registration) return;

  if (isManual) setUpdateStatus("??????", UPDATE_STATUS_HIDE_MS);

  try {
    await registration.update();

    if (registration.waiting) {
      setUpdateStatus("??????????", UPDATE_STATUS_HIDE_MS);
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    if (isManual) {
      setUpdateStatus("?????", 1600);
    }
  } catch {
    if (isManual) setUpdateStatus("????????", 1800);
  }
}

function setUpdateStatus(message, hideAfterMs = 0) {
  if (updateStatusTimer) {
    window.clearTimeout(updateStatusTimer);
    updateStatusTimer = 0;
  }

  elements.updateStatusText.textContent = message;
  elements.updateStatus.hidden = false;

  if (hideAfterMs > 0) {
    updateStatusTimer = window.setTimeout(() => {
      elements.updateStatus.hidden = true;
      updateStatusTimer = 0;
    }, hideAfterMs);
  }
}
