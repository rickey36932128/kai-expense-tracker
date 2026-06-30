const STORAGE_KEY = "kai-expense-tracker-v1";
const APP_VERSION = "v46";
const CACHE_REPAIR_KEY = "kai-cache-repair-v46";
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
const UPDATE_STATUS_HIDE_MS = 2200;
const DEFAULT_CURRENCY = "TWD";
const CURRENCY_OPTIONS = new Set(["TWD", "JPY"]);
const EXPENSE_CATEGORY_RULES = [
  {
    category: "飲食",
    pattern: /三餐|早餐|早午餐|午餐|晚餐|宵夜|零食|飲料|咖啡|茶|便當|餐|麵|飯|火鍋|燒肉|甜點|蛋糕|麵包|冰淇淋|漢堡|食物|吃/i,
  },
  {
    category: "購物",
    pattern: /衣服|服裝|上衣|褲|裙|外套|內衣|襪|鞋|球鞋|靴|帽|包|配件|飾品|穿搭/i,
  },
  {
    category: "住宿",
    pattern: /住宿|房租|租金|水電|電費|水費|瓦斯|管理費|家具|床|桌|椅|沙發|衣櫃|家電/i,
  },
  {
    category: "交通",
    pattern: /交通|交通費|加油|油錢|停車|停車費|車票|捷運|公車|高鐵|台鐵|火車|客運|計程車|uber|taxi|機票|車資/i,
  },
  {
    category: "教育",
    pattern: /教育|書|書籍|課程|學費|補習|教材|文具|學習用品|講座|考試|證照/i,
  },
  {
    category: "娛樂",
    pattern: /娛樂|旅遊|旅行|運動|電影|影票|遊戲|演唱會|展覽|門票|健身|球|唱歌|ktv|酒吧|按摩|露營|飯店|民宿/i,
  },
];
const LEGACY_EXPENSE_CATEGORY_MAP = {
  衣服: "購物",
  生活: "住宿",
  其他: "娛樂",
};
const ASSET_CATEGORIES = [
  { key: "bank", label: "銀行存款" },
  { key: "twStocks", label: "台股" },
  { key: "usStocks", label: "美股" },
  { key: "funds", label: "基金" },
];
const LIABILITY_CATEGORIES = [
  { key: "creditCard", label: "信用卡未繳款" },
  { key: "loan", label: "信貸" },
];

const elements = {};
let state = loadState();
let selectedMonth = new Date();
let activeEntryType = "expense";
let activeAnalysisType = "expense";
let refreshingForUpdate = false;
let updateStatusTimer = 0;
let entrySuccessTimer = 0;
let splitPersonDraftId = 5;

document.addEventListener("DOMContentLoaded", init);

function init() {
  elements.tabButtons = document.querySelectorAll(".tab-bar button");
  elements.screens = document.querySelectorAll(".screen");
  elements.recentList = document.querySelector("#recent-list");
  elements.homeRecentList = document.querySelector("#home-recent-list");
  elements.recordsList = document.querySelector("#records-list");
  elements.recordsTotal = document.querySelector("#records-total");
  elements.monthTotal = document.querySelector("#month-total");
  elements.dailyAverage = document.querySelector("#daily-average");
  elements.monthCompare = document.querySelector("#month-compare");
  elements.budgetRemaining = document.querySelector("#budget-remaining");
  elements.budgetSpent = document.querySelector("#budget-spent");
  elements.budgetPercent = document.querySelector("#budget-percent");
  elements.budgetProgress = document.querySelector(".budget-progress");
  elements.budgetProgressFill = document.querySelector("#budget-progress-fill");
  elements.budgetEditTrigger = document.querySelector("#budget-edit-trigger");
  elements.budgetEditSheet = document.querySelector("#budget-edit-sheet");
  elements.budgetEditForm = document.querySelector("#budget-edit-form");
  elements.budgetEditInput = document.querySelector("#budget-edit-input");
  elements.budgetEditLabel = document.querySelector("#budget-edit-label");
  elements.budgetEditClose = document.querySelector("#budget-edit-close");
  elements.budgetEditCancel = document.querySelector("#budget-edit-cancel");
  elements.debtList = document.querySelector("#debt-list");
  elements.debtTotal = document.querySelector("#debt-total");
  elements.debtCount = document.querySelector("#debt-count");
  elements.assetMonthAction = document.querySelector("#asset-month-action");
  elements.netWorthTotal = document.querySelector("#net-worth-total");
  elements.netWorthChange = document.querySelector("#net-worth-change");
  elements.assetTotal = document.querySelector("#asset-total");
  elements.liabilityTotal = document.querySelector("#liability-total");
  elements.assetDetailTitle = document.querySelector("#asset-detail-title");
  elements.liabilityDetailTitle = document.querySelector("#liability-detail-title");
  elements.assetDetailTotal = document.querySelector("#asset-detail-total");
  elements.liabilityDetailTotal = document.querySelector("#liability-detail-total");
  elements.assetDetailList = document.querySelector("#asset-detail-list");
  elements.liabilityDetailList = document.querySelector("#liability-detail-list");
  elements.assetTrendChart = document.querySelector("#asset-trend-chart");
  elements.assetEditSheet = document.querySelector("#asset-edit-sheet");
  elements.assetEditForm = document.querySelector("#asset-edit-form");
  elements.assetEditClose = document.querySelector("#asset-edit-close");
  elements.assetEditCancel = document.querySelector("#asset-edit-cancel");
  elements.assetEditMonth = document.querySelector("#asset-edit-month");
  elements.assetEditAssetTitle = document.querySelector("#asset-edit-asset-title");
  elements.assetEditLiabilityTitle = document.querySelector("#asset-edit-liability-title");
  elements.assetInputs = Object.fromEntries(
    [...ASSET_CATEGORIES, ...LIABILITY_CATEGORIES].map((category) => [category.key, document.querySelector(`#asset-input-${category.key}`)]),
  );
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
  elements.parsedCard = document.querySelector("#parsed-card");
  elements.parsedDate = document.querySelector("#parsed-date");
  elements.expenseForm = document.querySelector("#expense-form");
  elements.expenseInput = document.querySelector("#expense-input");
  elements.entrySuccess = document.querySelector("#entry-success");
  elements.debtForm = document.querySelector("#debt-form");
  elements.splitEventName = document.querySelector("#split-event-name");
  elements.splitPeopleCount = document.querySelector("#split-people-count");
  elements.splitExpenseCount = document.querySelector("#split-expense-count");
  elements.splitPeopleList = document.querySelector("#split-people-list");
  elements.splitAddPerson = document.querySelector("#split-add-person");
  elements.splitExpenseForm = document.querySelector("#split-expense-form");
  elements.splitExpenseTitle = document.querySelector("#split-expense-title");
  elements.splitExpenseAmount = document.querySelector("#split-expense-amount");
  elements.splitExpensePayer = document.querySelector("#split-expense-payer");
  elements.splitExpenseNote = document.querySelector("#split-expense-note");
  elements.splitShareList = document.querySelector("#split-share-list");
  elements.splitSelectAll = document.querySelector("#split-select-all");
  elements.splitClearAll = document.querySelector("#split-clear-all");
  elements.splitClearSettlement = document.querySelector("#split-clear-settlement");
  elements.splitCurrentEvent = document.querySelector("#split-current-event");
  elements.splitSettlementTitle = document.querySelector("#split-settlement-title");
  elements.splitTotal = document.querySelector("#split-total");
  elements.splitAverage = document.querySelector("#split-average");
  elements.splitPaidList = document.querySelector("#split-paid-list");
  elements.splitSuggestionList = document.querySelector("#split-suggestion-list");
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
  elements.splitEventName.addEventListener("input", updateSplitEventName);
  elements.splitAddPerson.addEventListener("click", addSplitPerson);
  elements.splitPeopleList.addEventListener("change", handleSplitPersonInput);
  elements.splitPeopleList.addEventListener("click", handleSplitPersonRemove);
  elements.splitExpenseForm.addEventListener("submit", addSplitExpense);
  document.querySelectorAll("input[name='split-method']").forEach((input) => {
    input.addEventListener("change", renderSplitShareList);
  });
  elements.splitSelectAll.addEventListener("click", () => setSplitShareSelection(true));
  elements.splitClearAll.addEventListener("click", () => setSplitShareSelection(false));
  elements.splitClearSettlement.addEventListener("click", clearSplitSettlement);
  document.querySelector("#prev-month").addEventListener("click", () => changeMonth(-1));
  document.querySelector("#next-month").addEventListener("click", () => changeMonth(1));
  document.querySelector("#clear-debts").addEventListener("click", clearDebts);
  document.querySelector("#reset-data").addEventListener("click", resetData);
  elements.assetMonthAction.addEventListener("click", openAssetEditor);
  elements.assetEditForm.addEventListener("submit", saveAssetSnapshot);
  elements.assetEditClose.addEventListener("click", closeAssetEditor);
  elements.assetEditCancel.addEventListener("click", closeAssetEditor);
  elements.assetEditSheet.addEventListener("click", (event) => {
    if (event.target === elements.assetEditSheet) closeAssetEditor();
  });
  elements.budgetEditTrigger.addEventListener("click", openBudgetEditor);
  elements.budgetEditForm.addEventListener("submit", saveBudget);
  elements.budgetEditClose.addEventListener("click", closeBudgetEditor);
  elements.budgetEditCancel.addEventListener("click", closeBudgetEditor);
  elements.budgetEditSheet.addEventListener("click", (event) => {
    if (event.target === elements.budgetEditSheet) closeBudgetEditor();
  });
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
  document.querySelectorAll("[data-quick-category]").forEach((button) => {
    button.addEventListener("click", () => prepareQuickExpense(button.dataset.quickCategory));
  });

  if (elements.recentList) elements.recentList.addEventListener("click", handleExpenseListClick);
  if (elements.homeRecentList) elements.homeRecentList.addEventListener("click", handleExpenseListClick);
  if (elements.parsedCard) {
    elements.parsedCard.addEventListener("click", openLatestCardEditor);
    elements.parsedCard.addEventListener("keydown", handleLatestCardKeydown);
  }
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
  repairAppCache();
  registerServiceWorker();
}

function getDefaultState() {
  return {
    expenses: [],
    incomes: [],
    debts: [],
    assetSnapshots: {},
    splitBill: getDefaultSplitBill(),
    budgets: getDefaultBudgets(),
    currency: DEFAULT_CURRENCY,
  };
}

function getDefaultBudgets() {
  return { TWD: 5000, JPY: 50000 };
}

function getDefaultSplitBill() {
  return {
    eventName: "台中兩天一夜",
    people: ["A", "B", "C", "D"],
    expenses: [
      {
        id: "demo-dinner",
        title: "晚餐",
        amount: 2400,
        payer: "A",
        method: "equal",
        participants: ["A", "B", "C"],
        note: "",
      },
      {
        id: "demo-hotel",
        title: "住宿",
        amount: 2600,
        payer: "C",
        method: "equal",
        participants: ["A", "B", "C", "D"],
        note: "",
      },
      {
        id: "demo-ticket",
        title: "車票",
        amount: 2000,
        payer: "B",
        method: "equal",
        participants: ["A", "B", "C", "D"],
        note: "",
      },
      {
        id: "demo-rental",
        title: "租車",
        amount: 1600,
        payer: "A",
        method: "equal",
        participants: ["A", "B", "C", "D"],
        note: "",
      },
    ],
  };
}

function preventDoubleTapZoom(event) {
  event.preventDefault();
}

function createExpense(title, amount, category = "飲食", date = new Date()) {
  return createMoneyItem(title, amount, category, date);
}

function createIncome(title, amount, category = "其他", date = new Date()) {
  return createMoneyItem(title, amount, category, date);
}

function createMoneyItem(title, amount, category = "飲食", date = new Date()) {
  return {
    id: createId(),
    title,
    amount,
    category,
    currency: getCurrency(),
    date: new Date(date).toISOString(),
    createdAt: new Date().toISOString(),
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
    expenses: value.expenses.filter((expense) => isValidExpense(expense) && !isSeedExpense(expense)).map(normalizeExpenseItem),
    incomes: Array.isArray(value.incomes) ? value.incomes.filter(isValidMoneyItem).map(normalizeMoneyItem) : [],
    debts: value.debts.filter((debt) => isValidDebt(debt) && !isSeedDebt(debt)).map(normalizeMoneyItem),
    assetSnapshots: normalizeAssetSnapshots(value.assetSnapshots),
    splitBill: normalizeSplitBill(value.splitBill),
    budgets: normalizeBudgets(value.budgets),
    currency: CURRENCY_OPTIONS.has(value.currency) ? value.currency : DEFAULT_CURRENCY,
  };
}

function normalizeBudgets(value) {
  const defaults = getDefaultBudgets();
  const source = value && typeof value === "object" ? value : {};

  return Object.fromEntries(
    [...CURRENCY_OPTIONS].map((currency) => {
      const amount = Number(source[currency]);
      return [currency, Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : defaults[currency]];
    }),
  );
}

function normalizeMoneyItem(item) {
  return {
    ...item,
    currency: CURRENCY_OPTIONS.has(item.currency) ? item.currency : DEFAULT_CURRENCY,
  };
}

function normalizeExpenseItem(item) {
  const normalized = normalizeMoneyItem(item);

  return {
    ...normalized,
    category: normalizeExpenseCategory(normalized.category, normalized.title),
  };
}

function normalizeExpenseCategory(category, title) {
  const matchedCategory = matchExpenseCategory(title);
  if (matchedCategory) return matchedCategory;
  if (EXPENSE_CATEGORY_RULES.some((rule) => rule.category === category)) return category;
  if (LEGACY_EXPENSE_CATEGORY_MAP[category]) return LEGACY_EXPENSE_CATEGORY_MAP[category];
  return inferCategory(title);
}

function normalizeAssetSnapshots(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([month, snapshot]) => /^\d{4}-\d{2}$/.test(month) && snapshot && typeof snapshot === "object")
      .map(([month, snapshot]) => [
        month,
        {
          updatedAt: typeof snapshot.updatedAt === "string" ? snapshot.updatedAt : "",
          assets: normalizeAssetGroup(snapshot.assets, ASSET_CATEGORIES),
          liabilities: normalizeAssetGroup(snapshot.liabilities, LIABILITY_CATEGORIES),
        },
      ]),
  );
}

function normalizeAssetGroup(value, categories) {
  const source = value && typeof value === "object" ? value : {};

  return Object.fromEntries(
    categories.map((category) => {
      const amount = Number(source[category.key]);
      return [category.key, Number.isFinite(amount) && amount > 0 ? amount : 0];
    }),
  );
}

function normalizeSplitBill(value) {
  const fallback = getDefaultSplitBill();
  if (!value || typeof value !== "object") return fallback;

  const people = Array.isArray(value.people)
    ? value.people.map((person) => String(person || "").trim()).filter(Boolean).slice(0, 12)
    : fallback.people;
  const safePeople = people.length ? Array.from(new Set(people)) : fallback.people;
  const expenses = Array.isArray(value.expenses)
    ? value.expenses
        .map((expense) => normalizeSplitExpense(expense, safePeople))
        .filter(Boolean)
    : fallback.expenses;

  return {
    eventName: String(value.eventName || fallback.eventName).trim() || fallback.eventName,
    people: safePeople,
    expenses,
  };
}

function normalizeSplitExpense(expense, people) {
  if (!expense || typeof expense !== "object") return null;

  const title = String(expense.title || "").trim();
  const amount = Number(expense.amount);
  const payer = people.includes(expense.payer) ? expense.payer : people[0];
  const participants = Array.isArray(expense.participants)
    ? expense.participants.filter((person) => people.includes(person))
    : people;

  if (!title || !Number.isFinite(amount) || amount <= 0 || !payer || !participants.length) return null;

  return {
    id: typeof expense.id === "string" ? expense.id : createId(),
    title,
    amount: Math.round(amount),
    payer,
    method: ["equal", "amount", "ratio"].includes(expense.method) ? expense.method : "equal",
    participants,
    customShares: normalizeSplitCustomShares(expense.customShares, people),
    note: typeof expense.note === "string" ? expense.note : "",
  };
}

function normalizeSplitCustomShares(value, people) {
  const source = value && typeof value === "object" ? value : {};

  return Object.fromEntries(
    people.map((person) => {
      const amount = Number(source[person]);
      return [person, Number.isFinite(amount) && amount > 0 ? amount : 0];
    }),
  );
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
  return typeof expense.id === "string" && expense.id.startsWith("seed-");
}

function isSeedDebt(debt) {
  const seeds = new Set(["阿明:咖啡:280", "小美:電影票:1200", "家豪:宵夜:400"]);
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

function getBudget(currency = getCurrency()) {
  return Number(state.budgets?.[currency]) || 0;
}

function openBudgetEditor() {
  const currency = getCurrency();
  elements.budgetEditLabel.textContent = `${getCurrencyLabel(currency)} 預算金額`;
  elements.budgetEditInput.value = getBudget(currency).toLocaleString("en-US");
  elements.budgetEditSheet.hidden = false;
  elements.budgetEditInput.focus();
  elements.budgetEditInput.select();
}

function closeBudgetEditor() {
  elements.budgetEditSheet.hidden = true;
  elements.budgetEditForm.reset();
}

function saveBudget(event) {
  event.preventDefault();
  const amount = parseNonNegativeAmountInput(elements.budgetEditInput.value);
  if (amount === null) {
    elements.budgetEditInput.classList.add("is-invalid");
    elements.budgetEditInput.focus();
    return;
  }

  state.budgets = { ...state.budgets, [getCurrency()]: amount };
  saveState();
  closeBudgetEditor();
  render();
}

function prepareQuickExpense(category) {
  if (!category) return;
  activeEntryType = "expense";
  elements.expenseInput.value = category;
  renderModeButtons();
  elements.expenseInput.focus();
  elements.expenseInput.setSelectionRange(category.length, category.length);
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
  return currency === "JPY" ? "¥" : "NT$";
}

function formatMoney(amount, currency = getCurrency()) {
  return `${getCurrencyLabel(currency)} ${Number(amount).toLocaleString(currency === "JPY" ? "ja-JP" : "zh-Hant-TW")}`;
}

function formatDateLabel(value) {
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) return "今天";

  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function formatShortDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--";

  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatFullDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`;
}

function getMonthKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedMonthKey() {
  return getMonthKey(selectedMonth);
}

function inferCategory(title) {
  return matchExpenseCategory(title) || "娛樂";
}

function matchExpenseCategory(title) {
  const matchedRule = EXPENSE_CATEGORY_RULES.find((rule) => rule.pattern.test(title));
  return matchedRule?.category || "";
}

function inferIncomeCategory(title) {
  if (/薪水|薪資|工資|收入|salary|pay/i.test(title)) return "薪資";
  if (/獎金|bonus|紅包|禮金/i.test(title)) return "獎金";
  if (/退款|退費|退貨/i.test(title)) return "退款";
  if (/利息|股息|投資|分潤/i.test(title)) return "投資";
  return "其他收入";
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
  showEntrySuccess(item);
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

function openLatestCardEditor() {
  const id = elements.parsedCard.dataset.editMoney;
  if (!id) return;

  openMoneyEditor(id, elements.parsedCard.dataset.editMoneyType || "expense");
}

function handleLatestCardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (!elements.parsedCard.dataset.editMoney) return;

  event.preventDefault();
  openLatestCardEditor();
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
  elements.expenseEditMeta.textContent = `${expense.category} · ${formatDateLabel(expense.date)}`;
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
  elements.expenseEditMeta.textContent = "備註";
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
  record.category = nextType === "income" ? inferIncomeCategory(record.title) : inferCategory(record.title);

  if (nextType !== originalType) {
    source.splice(recordIndex, 1);
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
  const currency = getCurrency();
  const currencyExpenses = state.expenses.filter((expense) => expense.currency === currency);
  const currencyIncomes = state.incomes.filter((income) => income.currency === currency);
  const currencyDebts = state.debts.filter((debt) => debt.currency === currency);
  const thisMonthExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === nowKey);
  const recentTransactions = combineTransactions(currencyExpenses, currencyIncomes).slice(0, 2);
  const selectedExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === getSelectedMonthKey());
  const selectedIncomes = currencyIncomes.filter((income) => getMonthKey(income.date) === getSelectedMonthKey());
  const selectedAnalysisItems = activeAnalysisType === "income" ? selectedIncomes : selectedExpenses;
  const monthExpenseTotal = sumAmounts(selectedExpenses);
  const monthIncomeTotal = sumAmounts(selectedIncomes);
  const monthBalance = monthIncomeTotal - monthExpenseTotal;
  const debtSum = currencyDebts.reduce((sum, debt) => sum + Number(debt.amount), 0);

  const elapsedDays = Math.max(1, new Date().getDate());
  const thisMonthTotal = sumAmounts(thisMonthExpenses);
  elements.monthTotal.textContent = formatMoney(thisMonthTotal);
  elements.dailyAverage.textContent = formatMoney(thisMonthTotal / elapsedDays);
  const now = new Date();
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, elapsedDays, 23, 59, 59);
  const previousPeriodTotal = sumAmounts(
    currencyExpenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= previousStart && expenseDate <= previousEnd;
    })
  );
  const comparison = previousPeriodTotal ? Math.round(((thisMonthTotal - previousPeriodTotal) / previousPeriodTotal) * 100) : 0;
  elements.monthCompare.textContent = `${comparison > 0 ? "+" : ""}${comparison}%`;
  elements.monthCompare.classList.toggle("is-down", comparison < 0);
  elements.monthCompare.classList.toggle("is-up", comparison > 0);
  renderHomeBudget(thisMonthTotal, currency);
  elements.recordsTotal.textContent = formatChartTotal(sumAmounts(selectedAnalysisItems), activeAnalysisType);
  elements.monthBalance.textContent = formatSignedMoney(monthBalance, currency);
  elements.recordsExpenseTotal.textContent = formatPlainNumber(monthExpenseTotal);
  elements.recordsIncomeTotal.textContent = formatPlainNumber(monthIncomeTotal);
  elements.analysisCurrency.textContent = currency;
  elements.chartCurrency.textContent = getCurrencyLabel(currency);
  elements.chartTotalLabel.textContent = activeAnalysisType === "income" ? "總收入" : "總支出";
  elements.selectedMonthLabel.textContent = `${selectedMonth.getFullYear()} 年 ${selectedMonth.getMonth() + 1} 月`;
  elements.recordsListTitle.textContent = `${selectedMonth.getMonth() + 1} 月${activeAnalysisType === "income" ? "收入" : "支出"}分類`;
  elements.debtTotal.textContent = formatMoney(debtSum);
  elements.debtCount.textContent = `${currencyDebts.length} 筆`;
  elements.settingsCurrency.textContent = currency;
  renderModeButtons();

  renderLatestTransaction(recentTransactions[0]);
  if (elements.recentList) renderTransactionList(elements.recentList, recentTransactions, "目前沒有紀錄");
  if (elements.homeRecentList) renderHomeRecentList(recentTransactions);
  renderCategoryAnalysis(selectedAnalysisItems, activeAnalysisType);
  renderDebtList(currencyDebts);
  renderAssets(currency);
  renderSplitBill();
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

function renderHomeBudget(spent, currency) {
  const budget = getBudget(currency);
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const progress = Math.min(100, Math.max(0, percent));

  elements.budgetRemaining.textContent = remaining >= 0 ? formatMoney(remaining, currency) : `超出 ${formatMoney(Math.abs(remaining), currency)}`;
  elements.budgetRemaining.classList.toggle("is-over-budget", remaining < 0);
  elements.budgetPercent.textContent = `${percent}%`;
  elements.budgetEditTrigger.textContent = `預算 ${formatMoney(budget, currency)}`;
  elements.budgetProgress.setAttribute("aria-valuenow", String(progress));
  elements.budgetProgressFill.style.width = `${progress}%`;
  elements.budgetProgressFill.classList.toggle("is-over-budget", remaining < 0);
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
  ].sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a));
}

function getTransactionTimestamp(item) {
  const timestamp = new Date(item.createdAt || item.date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function renderHomeRecentList(transactions) {
  if (!transactions.length) {
    elements.homeRecentList.innerHTML = `
      <li class="home-recent-empty">
        <img src="${getHomeMascotSource()}" alt="蛋黃小帳吉祥物" />
        <strong>尚未新增任何紀錄</strong>
        <p>開始記帳吧，掌握每一筆開銷！</p>
      </li>
    `;
    return;
  }

  elements.homeRecentList.innerHTML = transactions
    .map(
      (item) => `
        <li class="home-recent-item" data-edit-money="${item.id}" data-edit-money-type="${item.type}" ${item.type === "expense" ? `data-edit-expense="${item.id}"` : ""}>
          <span class="home-recent-icon ${getHomeRecentIcon(item)}" aria-hidden="true"></span>
          <div class="home-recent-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <time>${formatHomeRecentTime(item)}</time>
          </div>
          <b class="${item.type === "income" ? "is-income" : ""}">${item.type === "income" ? "+" : ""}${formatMoney(item.amount, item.currency)}</b>
        </li>
      `,
    )
    .join("");
}

function getHomeRecentIcon(item) {
  const text = `${item.title} ${item.category}`;
  if (/飲料|咖啡|茶|果汁|奶茶/.test(text)) return "drink";
  if (/加油|油錢|停車|車票|計程車|交通/.test(text)) return "fuel";
  if (/購物|衣服|服裝|鞋子|配件/.test(text)) return "shopping";
  return "lunch";
}

function getHomeMascotSource() {
  return window.__mascotImages?.home || "";
}

function formatHomeRecentTime(item) {
  const date = new Date(item.createdAt || item.date);
  if (Number.isNaN(date.getTime())) return "--";

  const day = date.toDateString() === new Date().toDateString() ? "今天" : formatShortDateLabel(date);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${day} ${time}`;
}

function showEntrySuccess(item) {
  if (!elements.entrySuccess) return;

  if (entrySuccessTimer) window.clearTimeout(entrySuccessTimer);
  elements.entrySuccess.textContent = `✓ 已記錄 ${item.title} ${getCurrencyLabel(item.currency)}${Number(item.amount).toLocaleString(item.currency === "JPY" ? "ja-JP" : "zh-Hant-TW")}`;
  elements.entrySuccess.hidden = false;
  entrySuccessTimer = window.setTimeout(() => {
    elements.entrySuccess.hidden = true;
    entrySuccessTimer = 0;
  }, 2000);
}

function renderLatestTransaction(item) {
  if (!elements.parsedCard) return;

  if (!item) {
    document.querySelector("#parsed-title").textContent = "尚未新增";
    document.querySelector("#parsed-amount").textContent = formatMoney(0);
    document.querySelector("#parsed-category").textContent = "-";
    elements.parsedDate.textContent = "-";
    delete elements.parsedCard.dataset.editMoney;
    delete elements.parsedCard.dataset.editMoneyType;
    elements.parsedCard.classList.remove("is-editable");
    elements.parsedCard.removeAttribute("role");
    elements.parsedCard.removeAttribute("tabindex");
    elements.parsedCard.removeAttribute("aria-label");
    return;
  }

  elements.parsedCard.dataset.editMoney = item.id;
  elements.parsedCard.dataset.editMoneyType = item.type;
  elements.parsedCard.classList.add("is-editable");
  elements.parsedCard.setAttribute("role", "button");
  elements.parsedCard.setAttribute("tabindex", "0");
  elements.parsedCard.setAttribute("aria-label", `編輯 ${item.title}`);
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
            <p>${escapeHtml(item.category)} · ${formatDateLabel(item.date)}</p>
          </div>
          <b class="${item.type === "income" ? "income-amount" : ""}">${item.type === "income" ? "+" : "-"}${formatMoney(item.amount, item.currency)}</b>
          <button class="delete-button" type="button" data-delete-${item.type}="${item.id}" aria-label="刪除 ${escapeHtml(item.title)}">x</button>
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
    elements.chartLegend.innerHTML = `<p class="empty-chart">這個月還沒有${activeAnalysisType === "income" ? "收入" : "支出"}資料</p>`;
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
    elements.recordsList.innerHTML = `<li class="empty-state">這個月還沒有${type === "income" ? "收入" : "支出"}</li>`;
    return;
  }

  elements.recordsList.innerHTML = groups
    .map((group, index) => {
      const sign = type === "income" ? "+" : "-";
      const details = group.items
        .map(
          (item) => `
            <li class="category-detail-row" data-edit-money="${item.id}" data-edit-money-type="${type}">
              <span class="category-detail-title"><span>${formatShortDateLabel(item.date)}</span><i>│</i>${escapeHtml(item.title)}</span>
              <b>${sign}${formatPlainNumber(item.amount)}</b>
              <button class="category-detail-edit" type="button" data-edit-money="${item.id}" data-edit-money-type="${type}" aria-label="編輯 ${escapeHtml(item.title)}">＞</button>
            </li>
          `
        )
        .join("");
      const row = `
        <span class="category-summary-swatch" style="background:${getChartColor(index)}"></span>
        <strong>${escapeHtml(group.category)} <em>(${group.count}筆)</em></strong>
        <b class="summary-amount">${sign}${formatPlainNumber(group.amount)}</b>
        <span class="summary-chevron" aria-hidden="true">⌵</span>
      `;

      return `
        <li class="category-summary-item">
          <details>
            <summary>${row}</summary>
            <ul>${details}</ul>
          </details>
        </li>
      `;
    })
    .join("");
}

function getChartColor(index) {
  const colors = ["#0a84ff", "#12bfa4", "#ffbe2e", "#af52de", "#ff6b3a", "#34c759"];
  return colors[index % colors.length];
}

function renderAssets(currency) {
  if (!elements.netWorthTotal) return;

  const monthKey = getMonthKey(new Date());
  const previousKey = getOffsetMonthKey(new Date(), -1);
  const snapshot = getAssetSnapshot(monthKey);
  const previousSnapshot = getAssetSnapshot(previousKey);
  const hasCurrentSnapshot = Boolean(state.assetSnapshots?.[monthKey]);
  const assetTotal = sumAssetGroup(snapshot.assets);
  const liabilityTotal = sumAssetGroup(snapshot.liabilities);
  const netWorth = assetTotal - liabilityTotal;
  const previousNetWorth = sumAssetGroup(previousSnapshot.assets) - sumAssetGroup(previousSnapshot.liabilities);
  const change = netWorth - previousNetWorth;
  const changePercent = previousNetWorth ? (change / Math.abs(previousNetWorth)) * 100 : 0;
  const monthLabel = formatMonthHeading(monthKey);

  elements.assetMonthAction.textContent = hasCurrentSnapshot ? "編輯本月資產" : "本月資產尚未更新";
  elements.assetMonthAction.classList.toggle("is-empty", !hasCurrentSnapshot);
  elements.assetDetailTitle.textContent = `${monthLabel}資產明細`;
  elements.liabilityDetailTitle.textContent = `${monthLabel}負債明細`;
  elements.netWorthTotal.textContent = formatMoney(netWorth, currency);
  elements.netWorthChange.textContent = formatNetWorthChange(change, changePercent, currency);
  elements.netWorthChange.classList.toggle("is-negative", change < 0);
  elements.assetTotal.textContent = formatMoney(assetTotal, currency);
  elements.liabilityTotal.textContent = formatMoney(liabilityTotal, currency);
  elements.assetDetailTotal.textContent = formatMoney(assetTotal, currency);
  elements.liabilityDetailTotal.textContent = formatMoney(liabilityTotal, currency);

  renderAssetDetails(elements.assetDetailList, snapshot.assets, ASSET_CATEGORIES, currency);
  renderAssetDetails(elements.liabilityDetailList, snapshot.liabilities, LIABILITY_CATEGORIES, currency);
  renderAssetTrend(currency);
}

function openAssetEditor() {
  const monthKey = getMonthKey(new Date());
  const monthLabel = formatMonthHeading(monthKey);
  const snapshot = getAssetSnapshot(monthKey);

  elements.assetEditMonth.textContent = monthLabel;
  elements.assetEditAssetTitle.textContent = `${monthLabel}資產明細`;
  elements.assetEditLiabilityTitle.textContent = `${monthLabel}負債明細`;
  fillAssetInputs(snapshot.assets);
  fillAssetInputs(snapshot.liabilities);
  elements.assetEditSheet.hidden = false;
  elements.assetInputs.bank.focus();
}

function closeAssetEditor() {
  elements.assetEditSheet.hidden = true;
  elements.assetEditForm.reset();
}

function saveAssetSnapshot(event) {
  event.preventDefault();
  const monthKey = getMonthKey(new Date());
  const assets = readAssetInputs(ASSET_CATEGORIES);
  const liabilities = readAssetInputs(LIABILITY_CATEGORIES);

  if (!assets || !liabilities) return;

  state.assetSnapshots = {
    ...state.assetSnapshots,
    [monthKey]: {
      assets,
      liabilities,
      updatedAt: new Date().toISOString(),
    },
  };
  saveState();
  closeAssetEditor();
  render();
}

function fillAssetInputs(values) {
  Object.entries(values).forEach(([key, amount]) => {
    const input = elements.assetInputs[key];
    if (!input) return;
    input.value = amount > 0 ? Number(amount).toLocaleString("en-US") : "";
  });
}

function readAssetInputs(categories) {
  const values = {};

  for (const category of categories) {
    const input = elements.assetInputs[category.key];
    const amount = parseNonNegativeAmountInput(input.value);
    if (amount === null) {
      input.focus();
      input.classList.add("is-invalid");
      window.setTimeout(() => input.classList.remove("is-invalid"), 500);
      return null;
    }
    values[category.key] = amount;
  }

  return values;
}

function parseNonNegativeAmountInput(value) {
  const text = String(value || "").replaceAll(",", "").trim();
  if (!text) return 0;

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount);
}

function getAssetSnapshot(monthKey) {
  const snapshot = state.assetSnapshots?.[monthKey];
  return {
    assets: normalizeAssetGroup(snapshot?.assets, ASSET_CATEGORIES),
    liabilities: normalizeAssetGroup(snapshot?.liabilities, LIABILITY_CATEGORIES),
  };
}

function sumAssetGroup(group) {
  return Object.values(group).reduce((sum, amount) => sum + Number(amount), 0);
}

function formatNetWorthChange(amount, percent, currency) {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const percentSign = percent > 0 ? "+" : percent < 0 ? "-" : "";
  return `較上月 ${sign}${formatMoney(Math.abs(amount), currency)} ${percentSign}${Math.abs(percent).toFixed(1)}%`;
}

function renderAssetDetails(target, values, categories, currency) {
  target.innerHTML = categories
    .map(
      (category) => `
        <li>
          <span>${escapeHtml(category.label)}</span>
          <strong>${formatMoney(values[category.key] || 0, currency)}</strong>
        </li>
      `,
    )
    .join("");
}

function renderAssetTrend(currency) {
  const monthKeys = getRecentMonthKeys(6);
  const points = monthKeys.map((month) => {
    const snapshot = getAssetSnapshot(month);
    return {
      month,
      netWorth: sumAssetGroup(snapshot.assets) - sumAssetGroup(snapshot.liabilities),
    };
  });
  const max = Math.max(...points.map((point) => Math.abs(point.netWorth)), 1);

  elements.assetTrendChart.innerHTML = points
    .map((point) => {
      const height = Math.max(8, Math.round((Math.abs(point.netWorth) / max) * 110));
      return `
        <div class="asset-trend-point">
          <span>${formatMoney(point.netWorth, currency)}</span>
          <i style="height:${height}px"></i>
          <b>${formatTrendMonthLabel(point.month)}</b>
        </div>
      `;
    })
    .join("");
}

function getRecentMonthKeys(count) {
  return Array.from({ length: count }, (_, index) => getOffsetMonthKey(new Date(), index - count + 1));
}

function getOffsetMonthKey(value, offset) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + offset);
  return getMonthKey(date);
}

function formatTrendMonthLabel(monthKey) {
  const [, month] = monthKey.split("-");
  return `${Number(month)}月`;
}

function formatMonthHeading(monthKey) {
  const [, month] = monthKey.split("-");
  return `${Number(month)}月`;
}

function renderSplitBill() {
  if (!elements.splitEventName) return;

  const splitBill = state.splitBill;
  const settlement = calculateSplitSettlement(splitBill);

  elements.splitEventName.value = splitBill.eventName;
  elements.splitPeopleCount.textContent = `${splitBill.people.length} 人`;
  elements.splitExpenseCount.textContent = `${splitBill.expenses.length} 筆`;
  elements.splitCurrentEvent.textContent = splitBill.eventName;
  elements.splitSettlementTitle.textContent = splitBill.eventName;
  elements.splitTotal.textContent = formatSplitMoney(settlement.total);
  elements.splitAverage.textContent = splitBill.people.length ? formatSplitMoney(Math.round(settlement.total / splitBill.people.length)) : "$0";

  renderSplitPeople();
  renderSplitPayerOptions();
  renderSplitShareList();
  renderSplitPaidList(settlement.paid);
  renderSplitSuggestions(settlement.suggestions);
}

function renderSplitPeople() {
  elements.splitPeopleList.innerHTML = state.splitBill.people
    .map(
      (person, index) => `
        <label class="split-person-row">
          <span>${index + 1}</span>
          <input type="text" value="${escapeHtml(person)}" data-split-person-index="${index}" aria-label="參與人 ${index + 1}" />
          <button type="button" data-remove-split-person="${index}" aria-label="移除 ${escapeHtml(person)}">x</button>
        </label>
      `,
    )
    .join("");
}

function renderSplitPayerOptions() {
  const people = state.splitBill.people;
  const current = elements.splitExpensePayer.value || people[0] || "";
  elements.splitExpensePayer.innerHTML = people.map((person) => `<option value="${escapeHtml(person)}">${escapeHtml(person)}</option>`).join("");
  elements.splitExpensePayer.value = people.includes(current) ? current : people[0] || "";
}

function renderSplitShareList() {
  const checkedPeople = new Set(state.splitBill.people);
  const method = getSelectedSplitMethod();
  const inputPlaceholder = method === "ratio" ? "比例" : "金額";
  elements.splitShareList.classList.toggle("has-custom-shares", method !== "equal");

  elements.splitShareList.innerHTML = state.splitBill.people
    .map(
      (person) => `
        <label class="${method === "equal" ? "" : "has-custom-share"}">
          <span>
            <input type="checkbox" value="${escapeHtml(person)}" ${checkedPeople.has(person) ? "checked" : ""} />
            ${escapeHtml(person)}
          </span>
          ${method === "equal" ? "" : `<input class="split-custom-share" type="text" inputmode="numeric" data-split-share-value="${escapeHtml(person)}" placeholder="${inputPlaceholder}" />`}
        </label>
      `,
    )
    .join("");
}

function renderSplitPaidList(paid) {
  elements.splitPaidList.innerHTML = state.splitBill.people
    .map(
      (person) => `
        <li>
          <span>${escapeHtml(person)} 已付</span>
          <strong>${formatSplitMoney(paid[person] || 0)}</strong>
        </li>
      `,
    )
    .join("");
}

function clearSplitSettlement() {
  state.splitBill.expenses = [];
  saveState();
  renderSplitBill();
}

function renderSplitSuggestions(suggestions) {
  if (!suggestions.length) {
    elements.splitSuggestionList.innerHTML = `<li class="empty-state">目前不需要結算</li>`;
    return;
  }

  elements.splitSuggestionList.innerHTML = suggestions
    .map(
      (suggestion) => `
        <li>
          <span>${escapeHtml(suggestion.from)} 給 ${escapeHtml(suggestion.to)}</span>
          <strong>${formatSplitMoney(suggestion.amount)}</strong>
        </li>
      `,
    )
    .join("");
}

function updateSplitEventName() {
  state.splitBill.eventName = elements.splitEventName.value.trim() || "未命名活動";
  saveState();
  renderSplitBill();
}

function addSplitPerson() {
  const name = getNextSplitPersonName();
  state.splitBill.people.push(name);
  saveState();
  renderSplitBill();
}

function getNextSplitPersonName() {
  while (state.splitBill.people.includes(String.fromCharCode(64 + splitPersonDraftId))) {
    splitPersonDraftId += 1;
  }

  if (splitPersonDraftId <= 26) {
    const name = String.fromCharCode(64 + splitPersonDraftId);
    splitPersonDraftId += 1;
    return name;
  }

  return `成員${state.splitBill.people.length + 1}`;
}

function handleSplitPersonInput(event) {
  const input = event.target.closest("[data-split-person-index]");
  if (!input) return;

  const index = Number(input.dataset.splitPersonIndex);
  const previousName = state.splitBill.people[index];
  const nextName = input.value.trim();
  if (!previousName || !nextName) {
    renderSplitBill();
    return;
  }

  if (state.splitBill.people.includes(nextName) && nextName !== previousName) {
    input.value = previousName;
    return;
  }

  state.splitBill.people[index] = nextName;
  state.splitBill.expenses = state.splitBill.expenses.map((expense) => ({
    ...expense,
    payer: expense.payer === previousName ? nextName : expense.payer,
    participants: expense.participants.map((person) => (person === previousName ? nextName : person)),
  }));
  saveState();
  renderSplitBill();
}

function handleSplitPersonRemove(event) {
  const button = event.target.closest("[data-remove-split-person]");
  if (!button || state.splitBill.people.length <= 1) return;

  const index = Number(button.dataset.removeSplitPerson);
  const person = state.splitBill.people[index];
  state.splitBill.people.splice(index, 1);
  state.splitBill.expenses = state.splitBill.expenses
    .map((expense) => ({
      ...expense,
      payer: expense.payer === person ? state.splitBill.people[0] : expense.payer,
      participants: expense.participants.filter((participant) => participant !== person),
    }))
    .filter((expense) => expense.payer && expense.participants.length);
  saveState();
  renderSplitBill();
}

function addSplitExpense(event) {
  event.preventDefault();

  const title = elements.splitExpenseTitle.value.trim();
  const amount = parseAmountInput(elements.splitExpenseAmount.value);
  const payer = elements.splitExpensePayer.value;
  const method = getSelectedSplitMethod();
  const participants = getSelectedSplitParticipants();
  const customShares = readSplitCustomShares(participants, method);

  if (!title || amount === null || !payer || !participants.length || customShares === null) {
    elements.splitExpenseTitle.focus();
    return;
  }

  state.splitBill.expenses.unshift({
    id: createId(),
    title,
    amount,
    payer,
    method,
    participants,
    customShares,
    note: elements.splitExpenseNote.value.trim(),
  });
  saveState();
  elements.splitExpenseForm.reset();
  renderSplitBill();
}

function getSelectedSplitParticipants() {
  return [...elements.splitShareList.querySelectorAll("input:checked")].map((input) => input.value);
}

function getSelectedSplitMethod() {
  return document.querySelector("input[name='split-method']:checked")?.value || "equal";
}

function readSplitCustomShares(participants, method) {
  if (method === "equal") return {};

  const values = {};
  for (const person of participants) {
    const input = [...elements.splitShareList.querySelectorAll("[data-split-share-value]")].find((field) => field.dataset.splitShareValue === person);
    const amount = parseNonNegativeAmountInput(input?.value);
    if (!input || amount === null || amount <= 0) {
      input?.focus();
      input?.classList.add("is-invalid");
      window.setTimeout(() => input?.classList.remove("is-invalid"), 500);
      return null;
    }
    values[person] = amount;
  }

  return values;
}

function setSplitShareSelection(checked) {
  elements.splitShareList.querySelectorAll("input").forEach((input) => {
    input.checked = checked;
  });
}

function calculateSplitSettlement(splitBill) {
  const paid = Object.fromEntries(splitBill.people.map((person) => [person, 0]));
  const owed = Object.fromEntries(splitBill.people.map((person) => [person, 0]));
  const total = splitBill.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  splitBill.expenses.forEach((expense) => {
    const amount = Number(expense.amount);
    const participants = expense.participants.filter((person) => splitBill.people.includes(person));
    if (!paid[expense.payer] && paid[expense.payer] !== 0) paid[expense.payer] = 0;
    paid[expense.payer] += amount;
    if (!participants.length) return;

    const shares = getSplitExpenseShares(expense, participants, amount);
    Object.entries(shares).forEach(([person, share]) => {
      owed[person] += share;
    });
  });

  const balances = splitBill.people.map((person) => ({
    person,
    amount: Math.round((paid[person] || 0) - (owed[person] || 0)),
  }));
  const creditors = balances.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((item) => item.amount < 0)
    .map((item) => ({ person: item.person, amount: Math.abs(item.amount) }))
    .sort((a, b) => b.amount - a.amount);
  const suggestions = [];

  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtors[debtorIndex] && creditors[creditorIndex]) {
    const amount = Math.min(debtors[debtorIndex].amount, creditors[creditorIndex].amount);
    if (amount > 0) {
      suggestions.push({
        from: debtors[debtorIndex].person,
        to: creditors[creditorIndex].person,
        amount,
      });
    }

    debtors[debtorIndex].amount -= amount;
    creditors[creditorIndex].amount -= amount;
    if (debtors[debtorIndex].amount <= 0) debtorIndex += 1;
    if (creditors[creditorIndex].amount <= 0) creditorIndex += 1;
  }

  return { total, paid, owed, suggestions };
}

function getSplitExpenseShares(expense, participants, amount) {
  if (expense.method === "amount") {
    return Object.fromEntries(participants.map((person) => [person, Number(expense.customShares?.[person]) || 0]));
  }

  if (expense.method === "ratio") {
    const totalRatio = participants.reduce((sum, person) => sum + (Number(expense.customShares?.[person]) || 0), 0);
    if (totalRatio > 0) {
      return Object.fromEntries(participants.map((person) => [person, amount * ((Number(expense.customShares?.[person]) || 0) / totalRatio)]));
    }
  }

  const share = amount / participants.length;
  return Object.fromEntries(participants.map((person) => [person, share]));
}

function formatSplitMoney(amount) {
  return `$${Math.round(Number(amount) || 0).toLocaleString("en-US")}`;
}

function renderDebtList(debts) {
  if (!debts.length) {
    elements.debtList.innerHTML = `<li class="empty-state">目前沒有朋友欠款</li>`;
    return;
  }

  elements.debtList.innerHTML = debts
    .map(
      (debt) => `
        <li>
          <span class="avatar">${escapeHtml(debt.friend.slice(-1))}</span>
          <div>
            <strong>${escapeHtml(debt.friend)}</strong>
            <p>${escapeHtml(debt.item)} · ${formatDateLabel(debt.date)}</p>
          </div>
          <b>${formatMoney(debt.amount, debt.currency)}</b>
          <button class="delete-button" data-delete-debt="${debt.id}" aria-label="刪除 ${escapeHtml(debt.friend)}">x</button>
        </li>
      `
    )
    .join("");
}

function getCategoryClass(category) {
  const map = {
    飲食: "food",
    購物: "shopping",
    住宿: "housing",
    交通: "transit",
    教育: "education",
    娛樂: "entertainment",
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
    elements.offlineStatus.textContent = "此瀏覽器不支援";
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(`./sw.js?${APP_VERSION}`);
    elements.offlineStatus.textContent = "可離線使用";

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshingForUpdate) return;
      refreshingForUpdate = true;
      setUpdateStatus("更新完成，正在重新載入", UPDATE_STATUS_HIDE_MS);
      window.setTimeout(() => window.location.reload(), 450);
    });

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateStatus("新版已下載，正在安裝", UPDATE_STATUS_HIDE_MS);
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    elements.offlineStatus.textContent = "可離線使用";
    await checkForUpdates(false, registration);
    window.setInterval(() => checkForUpdates(false, registration), UPDATE_CHECK_INTERVAL);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdates(false, registration);
    });
  } catch {
    elements.offlineStatus.textContent = "離線功能尚未啟用";
  }
}

async function repairAppCache() {
  if (!("caches" in window)) return;
  if (localStorage.getItem(CACHE_REPAIR_KEY) === "done") return;

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("kai-expense-tracker-") && key !== `kai-expense-tracker-${APP_VERSION}`)
        .map((key) => caches.delete(key))
    );
    localStorage.setItem(CACHE_REPAIR_KEY, "done");
  } catch {
    // Cache cleanup is best-effort; local records stay in localStorage.
  }
}

async function checkForUpdates(isManual = false, existingRegistration = null) {
  if (!("serviceWorker" in navigator)) return;

  const registration = existingRegistration || (await navigator.serviceWorker.getRegistration("./"));
  if (!registration) return;

  if (isManual) setUpdateStatus("正在檢查更新", UPDATE_STATUS_HIDE_MS);

  try {
    await registration.update();

    if (registration.waiting) {
      setUpdateStatus("新版已下載，正在安裝", UPDATE_STATUS_HIDE_MS);
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    if (isManual) {
      setUpdateStatus("已是最新版", 1600);
    }
  } catch {
    if (isManual) setUpdateStatus("目前無法檢查更新", 1800);
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
