const STORAGE_KEY = "kai-expense-tracker-v1";

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
const parsedDate = document.querySelector("#parsed-date");

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

function getDefaultState() {
  return {
    expenses: [],
    debts: [],
  };
}

function createExpense(title, amount, category = "其他", date = new Date()) {
  return {
    id: createId(),
    title,
    amount,
    category,
    date: new Date(date).toISOString(),
  };
}

function createDebt(friend, item, amount, date = new Date()) {
  return {
    id: createId(),
    friend,
    item,
    amount,
    date: new Date(date).toISOString(),
  };
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
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
    expenses: value.expenses.filter((expense) => isValidExpense(expense) && !isSeedExpense(expense)),
    debts: value.debts.filter((debt) => isValidDebt(debt) && !isSeedDebt(debt)),
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
  const corruptMarkers = [
    "\uFFFD",
    "\u95AE",
    "\u875D",
    "\u7508",
    "\u649F",
    "\u929D",
    "\u761D",
    "\u876F",
    "\u769C",
    "\u5697",
  ];
  return corruptMarkers.some((marker) => text.includes(marker)) || /\?[\uE000-\uF8FF]/.test(text);
}

function isSeedExpense(expense) {
  const seeds = new Set(["早餐:85", "咖啡:85", "捷運:35", "午餐:120"]);
  return seeds.has(`${expense.title}:${Number(expense.amount)}`);
}

function isSeedDebt(debt) {
  const seeds = new Set(["阿明:咖啡:280", "小華:晚餐代墊:1200", "佳佳:電影票:400"]);
  return seeds.has(`${debt.friend}:${debt.item}:${Number(debt.amount)}`);
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
  if (/早餐|午餐|晚餐|咖啡|飲料|便當|餐|宵夜|甜點/.test(title)) return "餐飲";
  if (/捷運|公車|計程車|uber|高鐵|火車|停車|加油/i.test(title)) return "交通";
  if (/衣服|鞋|包|購物|蝦皮|momo|pchome/i.test(title)) return "購物";
  if (/超市|全聯|家樂福|日用品|藥局/.test(title)) return "生活";
  return "其他";
}

function parseExpense(text) {
  const match = text.trim().match(/(.+?)\s*([0-9,]+)$/);
  if (!match) return null;

  const title = match[1].trim();
  const amount = Number(match[2].replaceAll(",", ""));

  if (!title || !Number.isFinite(amount) || amount <= 0) return null;

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
  const debtSum = state.debts.reduce((sum, debt) => sum + Number(debt.amount), 0);

  monthTotal.textContent = formatTwd(sumAmounts(thisMonthExpenses));
  todayTotal.textContent = formatTwd(sumAmounts(todayExpenses));
  recordsTotal.textContent = formatTwd(sumAmounts(selectedExpenses));
  selectedMonthLabel.textContent = `${selectedMonth.getFullYear()} 年 ${selectedMonth.getMonth() + 1} 月`;
  recordsListTitle.textContent = `${selectedMonth.getMonth() + 1} 月紀錄`;
  debtTotal.textContent = formatTwd(debtSum);
  debtCount.textContent = `${state.debts.length} 筆未收`;

  renderLatestExpense(state.expenses[0]);
  renderExpenseList(recentList, recentExpenses, "目前沒有紀錄。");
  renderExpenseList(recordsList, selectedExpenses, "這個月份還沒有支出。");
  renderDebtList();
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}

function renderLatestExpense(expense) {
  if (!expense) {
    document.querySelector("#parsed-title").textContent = "尚未新增";
    document.querySelector("#parsed-amount").textContent = "NT$ 0";
    document.querySelector("#parsed-category").textContent = "-";
    parsedDate.textContent = "-";
    return;
  }

  document.querySelector("#parsed-title").textContent = expense.title;
  document.querySelector("#parsed-amount").textContent = `-${formatTwd(expense.amount)}`;
  document.querySelector("#parsed-category").textContent = expense.category;
  parsedDate.textContent = formatDateLabel(expense.date);
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
          <button class="delete-button" data-delete-expense="${expense.id}" aria-label="刪除 ${escapeHtml(expense.title)}">x</button>
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
          <button class="delete-button" data-delete-debt="${debt.id}" aria-label="刪除 ${escapeHtml(debt.friend)}">x</button>
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
    offlineStatus.textContent = "不支援離線";
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js?v=5");
    offlineStatus.textContent = "已可離線使用";
  } catch {
    offlineStatus.textContent = "離線功能尚未啟用";
  }
}
