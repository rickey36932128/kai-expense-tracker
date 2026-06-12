const STORAGE_KEY = "kai-expense-tracker-v1";
const APP_VERSION = "v13";
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
const UPDATE_STATUS_HIDE_MS = 2200;
const DEFAULT_CURRENCY = "TWD";
const CURRENCY_OPTIONS = new Set(["TWD", "JPY"]);

const elements = {};
let state = loadState();
let selectedMonth = new Date();
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

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.target));
  });

  document.querySelectorAll("[data-target-tab]").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.targetTab));
  });

  elements.recentList.addEventListener("click", handleExpenseDelete);
  elements.recordsList.addEventListener("click", handleExpenseDelete);
  elements.debtList.addEventListener("click", handleDebtDelete);

  saveState();
  render();
  registerServiceWorker();
}

function getDefaultState() {
  return {
    expenses: [],
    debts: [],
    currency: DEFAULT_CURRENCY,
  };
}

function preventDoubleTapZoom(event) {
  event.preventDefault();
}

function createExpense(title, amount, category = "其他", date = new Date()) {
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
  const seeds = new Set(["咖啡:85", "早餐:85", "捷運:35", "午餐:120"]);
  return seeds.has(`${expense.title}:${Number(expense.amount)}`);
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

function getCurrencyLabel(currency = getCurrency()) {
  return currency === "JPY" ? "¥" : "NT$";
}\n
function formatMoney(amount, currency = getCurrency()) {
  return `${getCurrencyLabel(currency)} ${Number(amount).toLocaleString(currency === "JPY" ? "ja-JP" : "zh-Hant-TW")}`;
}

function formatDateLabel(value) {
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) return "今天";

  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function getMonthKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedMonthKey() {
  return getMonthKey(selectedMonth);
}

function inferCategory(title) {
  if (/早餐|午餐|晚餐|咖啡|飲料|便當|餐|麵|飯|宵夜/i.test(title)) return "飲食";
  if (/捷運|公車|高鐵|uber|計程車|油錢|停車/i.test(title)) return "交通";
  if (/網購|衣服|鞋|momo|pchome|蝦皮|購物/i.test(title)) return "購物";
  if (/全聯|家樂福|超市|日用品|衛生紙/i.test(title)) return "生活";
  return "其他";
}

function parseExpense(text) {
  const value = text.trim();
  const textFirstMatch = value.match(/^(.+?)\s*([0-9,]+)$/);
  const amountFirstMatch = value.match(/^([0-9,]+)\s*(.+?)$/);

  const title = textFirstMatch ? textFirstMatch[1].trim() : amountFirstMatch?.[2].trim();
  const amountText = textFirstMatch ? textFirstMatch[2] : amountFirstMatch?.[1];

  if (!title || !amountText) return null;

  const amount = Number(amountText.replaceAll(",", ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return createExpense(title, amount, inferCategory(title));
}

function addExpenseFromText(event) {
  event.preventDefault();
  const expense = parseExpense(elements.expenseInput.value);

  if (!expense) {
    elements.expenseInput.focus();
    elements.expenseInput.classList.add("is-invalid");
    window.setTimeout(() => elements.expenseInput.classList.remove("is-invalid"), 500);
    return;
  }

  state.expenses.unshift(expense);
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

function handleExpenseDelete(event) {
  const button = event.target.closest("[data-delete-expense]");
  if (!button) return;

  state.expenses = state.expenses.filter((expense) => expense.id !== button.dataset.deleteExpense);
  saveState();
  render();
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
  const currencyDebts = state.debts.filter((debt) => debt.currency === currency);
  const thisMonthExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === nowKey);
  const todayExpenses = currencyExpenses.filter((expense) => new Date(expense.date).toDateString() === today);
  const recentExpenses = currencyExpenses.slice(0, 4);
  const selectedExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === getSelectedMonthKey());
  const debtSum = currencyDebts.reduce((sum, debt) => sum + Number(debt.amount), 0);

  elements.monthTotal.textContent = formatMoney(sumAmounts(thisMonthExpenses));
  elements.todayTotal.textContent = formatMoney(sumAmounts(todayExpenses));
  elements.recordsTotal.textContent = formatMoney(sumAmounts(selectedExpenses));
  elements.selectedMonthLabel.textContent = `${selectedMonth.getFullYear()} 年 ${selectedMonth.getMonth() + 1} 月`;
  elements.recordsListTitle.textContent = `${selectedMonth.getMonth() + 1} 月紀錄`;
  elements.debtTotal.textContent = formatMoney(debtSum);
  elements.debtCount.textContent = `${currencyDebts.length} 筆`;
  elements.settingsCurrency.textContent = currency;
  elements.currencyButtons.forEach((button) => button.classList.toggle("active", button.dataset.currency === currency));

  renderLatestExpense(currencyExpenses[0]);
  renderExpenseList(elements.recentList, recentExpenses, "目前沒有紀錄");
  renderExpenseList(elements.recordsList, selectedExpenses, "這個月還沒有支出");
  renderDebtList(currencyDebts);
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}

function renderLatestExpense(expense) {
  if (!expense) {
    document.querySelector("#parsed-title").textContent = "尚未新增";
    document.querySelector("#parsed-amount").textContent = formatMoney(0);
    document.querySelector("#parsed-category").textContent = "-";
    elements.parsedDate.textContent = "-";
    return;
  }

  document.querySelector("#parsed-title").textContent = expense.title;
  document.querySelector("#parsed-amount").textContent = `-${formatMoney(expense.amount, expense.currency)}`;
  document.querySelector("#parsed-category").textContent = expense.category;
  elements.parsedDate.textContent = formatDateLabel(expense.date);
}

function renderExpenseList(target, expenses, emptyText) {
  if (!expenses.length) {
    target.innerHTML = `<li class="empty-state">${emptyText}</li>`;
    return;
  }

  target.innerHTML = expenses
    .map(
      (expense) => `
        <li>
          <span class="category-dot ${getCategoryClass(expense.category)}"></span>
          <div>
            <strong>${escapeHtml(expense.title)}</strong>
            <p>${escapeHtml(expense.category)} · ${formatDateLabel(expense.date)}</p>
          </div>
          <b>-${formatMoney(expense.amount, expense.currency)}</b>
          <button class="delete-button" data-delete-expense="${expense.id}" aria-label="刪除 ${escapeHtml(expense.title)}">x</button>
        </li>
      `
    )
    .join("");
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
    交通: "transit",
    購物: "shopping",
    生活: "grocery",
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
    const registration = await navigator.serviceWorker.register("./sw.js?v=13");
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
