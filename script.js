const STORAGE_KEY = "kai-expense-tracker-v1";

const defaultState = {
  expenses: [
    createExpense("咖啡", 85, "餐飲"),
    createExpense("捷運", 35, "交通"),
    createExpense("午餐", 120, "餐飲"),
  ],
  debts: [
    createDebt("阿明", "宵夜", 280),
    createDebt("小婷", "演唱會票", 1200, offsetDate(-2)),
    createDebt("阿豪", "計程車", 400, offsetDate(-7)),
  ],
};

let state = loadState();
let selectedMonth = new Date();

const tabButtons = document.querySelectorAll(".tab-bar button");
const screens = document.querySelectorAll(".screen");
const recentList = document.querySelector("#recent-list");
const recordsList = document.querySelector("#records-list");
const recordsTotal = document.querySelector("#records-total");
const monthTotal = document.querySelector("#month-total");
const todayTotal = document.querySelector("#today-total");
const debtList = document.querySelector("#debt-list");
const debtTotal = document.querySelector("#debt-total");
const debtCount = document.querySelector("#debt-count");
const selectedMonthLabel = document.querySelector("#selected-month-label");
const recordsListTitle = document.querySelector("#records-list-title");
const offlineStatus = document.querySelector("#offline-status");

document.querySelector("#expense-form").addEventListener("submit", addExpenseFromText);
document.querySelector("#debt-form").addEventListener("submit", addDebtFromForm);
document.querySelector("#prev-month").addEventListener("click", () => changeMonth(-1));
document.querySelector("#next-month").addEventListener("click", () => changeMonth(1));
document.querySelector("#clear-debts").addEventListener("click", clearDebts);
document.querySelector("#reset-data").addEventListener("click", resetData);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.target));
});

document.querySelectorAll("[data-target-tab]").forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.targetTab));
});

recentList.addEventListener("click", handleExpenseDelete);
recordsList.addEventListener("click", handleExpenseDelete);
debtList.addEventListener("click", handleDebtDelete);

render();
registerServiceWorker();

function createExpense(title, amount, category = "其他", date = new Date()) {
  return {
    id: crypto.randomUUID(),
    title,
    amount,
    category,
    date: new Date(date).toISOString(),
  };
}

function createDebt(friend, item, amount, date = new Date()) {
  return {
    id: crypto.randomUUID(),
    friend,
    item,
    amount,
    date: new Date(date).toISOString(),
  };
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(defaultState);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTwd(amount) {
  return `NT$ ${Number(amount).toLocaleString("zh-Hant-TW")}`;
}

function formatDateLabel(value) {
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return "今天";
  }

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
  if (/咖啡|午餐|晚餐|早餐|飲料|宵夜|餐|飯|麵/.test(title)) return "餐飲";
  if (/捷運|公車|交通|車|uber|計程車/i.test(title)) return "交通";
  if (/超市|全聯|家樂福|食材/.test(title)) return "食材";
  if (/便利|購物|衣|鞋|蝦皮/.test(title)) return "購物";
  return "其他";
}

function parseExpense(text) {
  const match = text.trim().match(/(.+?)\s*([0-9,]+)$/);
  if (!match) return null;

  const title = match[1].trim();
  const amount = Number(match[2].replaceAll(",", ""));

  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return createExpense(title, amount, inferCategory(title));
}

function addExpenseFromText(event) {
  event.preventDefault();
  const input = document.querySelector("#expense-input");
  const expense = parseExpense(input.value);

  if (!expense) {
    input.focus();
    return;
  }

  state.expenses.unshift(expense);
  saveState();
  input.value = "";
  render();
}

function addDebtFromForm(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const friend = String(formData.get("friend") || "").trim();
  const item = String(formData.get("item") || "").trim();
  const amount = Number(String(formData.get("amount") || "").replaceAll(",", ""));

  if (!friend || !item || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

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
  state = structuredClone(defaultState);
  selectedMonth = new Date();
  saveState();
  render();
}

function changeMonth(delta) {
  selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1);
  render();
}

function showTab(target) {
  tabButtons.forEach((item) => item.classList.toggle("active", item.dataset.target === target));
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === target);
  });
}

function render() {
  const nowKey = getMonthKey(new Date());
  const today = new Date().toDateString();
  const thisMonthExpenses = state.expenses.filter((expense) => getMonthKey(expense.date) === nowKey);
  const todayExpenses = state.expenses.filter((expense) => new Date(expense.date).toDateString() === today);
  const recentExpenses = state.expenses.slice(0, 4);
  const selectedExpenses = state.expenses.filter((expense) => getMonthKey(expense.date) === getSelectedMonthKey());
  const debtSum = state.debts.reduce((sum, debt) => sum + debt.amount, 0);

  monthTotal.textContent = formatTwd(sumAmounts(thisMonthExpenses));
  todayTotal.textContent = formatTwd(sumAmounts(todayExpenses));
  recordsTotal.textContent = formatTwd(sumAmounts(selectedExpenses));
  selectedMonthLabel.textContent = `${selectedMonth.getFullYear()} 年 ${selectedMonth.getMonth() + 1} 月`;
  recordsListTitle.textContent = `${selectedMonth.getMonth() + 1} 月明細`;
  debtTotal.textContent = formatTwd(debtSum);
  debtCount.textContent = `${state.debts.length} 筆未結清`;

  renderLatestExpense(state.expenses[0]);
  renderExpenseList(recentList, recentExpenses, "還沒有紀錄，先輸入「午餐 120」。");
  renderExpenseList(recordsList, selectedExpenses, "這個月份還沒有紀錄。");
  renderDebtList();
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function renderLatestExpense(expense) {
  if (!expense) return;

  document.querySelector("#latest-message span").textContent = `${expense.title} ${expense.amount}`;
  document.querySelector("#parsed-title").textContent = expense.title;
  document.querySelector("#parsed-amount").textContent = `-${formatTwd(expense.amount)}`;
  document.querySelector("#parsed-category").textContent = expense.category;
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
          <b>-${formatTwd(expense.amount)}</b>
          <button class="delete-button" data-delete-expense="${expense.id}" aria-label="刪除 ${escapeHtml(expense.title)}">×</button>
        </li>
      `
    )
    .join("");
}

function renderDebtList() {
  if (!state.debts.length) {
    debtList.innerHTML = `<li class="empty-state">目前沒有朋友欠款。</li>`;
    return;
  }

  debtList.innerHTML = state.debts
    .map(
      (debt) => `
        <li>
          <span class="avatar">${escapeHtml(debt.friend.slice(-1))}</span>
          <div>
            <strong>${escapeHtml(debt.friend)}</strong>
            <p>${escapeHtml(debt.item)} · ${formatDateLabel(debt.date)}</p>
          </div>
          <b>${formatTwd(debt.amount)}</b>
          <button class="delete-button" data-delete-debt="${debt.id}" aria-label="結清 ${escapeHtml(debt.friend)}">×</button>
        </li>
      `
    )
    .join("");
}

function getCategoryClass(category) {
  const map = {
    餐飲: "food",
    交通: "transit",
    購物: "shopping",
    食材: "grocery",
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
    offlineStatus.textContent = "不支援";
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
    offlineStatus.textContent = "已啟用";
  } catch {
    offlineStatus.textContent = "需用網站開啟";
  }
}
