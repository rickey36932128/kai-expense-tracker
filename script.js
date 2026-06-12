const STORAGE_KEY = "kai-expense-tracker-v1";
const APP_VERSION = "v11";
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
const DEFAULT_CURRENCY = "TWD";
const CURRENCY_OPTIONS = new Set(["TWD", "JPY"]);

let state = loadState();
let selectedMonth = new Date();
let refreshingForUpdate = false;
let updateStatusTimer = 0;
const el = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindElements();
  bindEvents();
  cleanAndSaveState();
  render();
  registerServiceWorker();
}

function bindElements() {
  el.tabButtons = document.querySelectorAll(".tab-bar button");
  el.screens = document.querySelectorAll(".screen");
  el.recentList = document.querySelector("#recent-list");
  el.recordsList = document.querySelector("#records-list");
  el.recordsTotal = document.querySelector("#records-total");
  el.monthTotal = document.querySelector("#month-total");
  el.todayTotal = document.querySelector("#today-total");
  el.debtList = document.querySelector("#debt-list");
  el.debtTotal = document.querySelector("#debt-total");
  el.debtCount = document.querySelector("#debt-count");
  el.selectedMonthLabel = document.querySelector("#selected-month-label");
  el.recordsListTitle = document.querySelector("#records-list-title");
  el.offlineStatus = document.querySelector("#offline-status");
  el.parsedDate = document.querySelector("#parsed-date");
  el.expenseForm = document.querySelector("#expense-form");
  el.expenseInput = document.querySelector("#expense-input");
  el.debtForm = document.querySelector("#debt-form");
  el.updateStatus = document.querySelector("#update-status");
  el.updateStatusText = document.querySelector("#update-status-text");
  el.checkUpdate = document.querySelector("#check-update");
  el.appVersion = document.querySelector("#app-version");
  el.settingsCurrency = document.querySelector("#settings-currency");
  el.currencyButtons = document.querySelectorAll("[data-currency]");
}

function bindEvents() {
  document.addEventListener("dblclick", preventDoubleTapZoom, { passive: false });
  el.expenseForm.addEventListener("submit", addExpenseFromText);
  el.expenseInput.addEventListener("keydown", handleExpenseInputKeydown);
  el.debtForm.addEventListener("submit", addDebtFromForm);
  document.querySelector("#prev-month").addEventListener("click", () => changeMonth(-1));
  document.querySelector("#next-month").addEventListener("click", () => changeMonth(1));
  document.querySelector("#clear-debts").addEventListener("click", clearDebts);
  document.querySelector("#reset-data").addEventListener("click", resetData);
  el.checkUpdate.addEventListener("click", () => checkForUpdates(true));
  el.appVersion.textContent = APP_VERSION;
  el.currencyButtons.forEach((button) => button.addEventListener("click", () => setCurrency(button.dataset.currency)));
  el.tabButtons.forEach((button) => button.addEventListener("click", () => showTab(button.dataset.target)));
  document.querySelectorAll("[data-target-tab]").forEach((button) => button.addEventListener("click", () => showTab(button.dataset.targetTab)));
  el.recentList.addEventListener("click", handleExpenseDelete);
  el.recordsList.addEventListener("click", handleExpenseDelete);
  el.debtList.addEventListener("click", handleDebtDelete);
}

function preventDoubleTapZoom(event) { event.preventDefault(); }
function getDefaultState() { return { expenses: [], debts: [], currency: DEFAULT_CURRENCY }; }
function createId() { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function createExpense(title, amount, category = "其他", date = new Date()) { return { id: createId(), title, amount, category, currency: getCurrency(), date: new Date(date).toISOString() }; }
function createDebt(friend, item, amount, date = new Date()) { return { id: createId(), friend, item, amount, currency: getCurrency(), date: new Date(date).toISOString() }; }
function loadState() { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return getDefaultState(); try { const parsed = JSON.parse(raw); if (!parsed || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.debts)) return getDefaultState(); return cleanState(parsed); } catch { return getDefaultState(); } }
function cleanState(value) { return { expenses: value.expenses.filter((expense) => isValidExpense(expense) && !isSeedExpense(expense)).map(normalizeMoneyItem), debts: value.debts.filter((debt) => isValidDebt(debt) && !isSeedDebt(debt)).map(normalizeMoneyItem), currency: CURRENCY_OPTIONS.has(value.currency) ? value.currency : DEFAULT_CURRENCY }; }
function normalizeMoneyItem(item) { return { ...item, currency: CURRENCY_OPTIONS.has(item.currency) ? item.currency : DEFAULT_CURRENCY }; }
function cleanAndSaveState() { state = cleanState(state); saveState(); }
function isValidExpense(expense) { return expense && typeof expense.title === "string" && Number.isFinite(Number(expense.amount)) && typeof expense.date === "string"; }
function isValidDebt(debt) { return debt && typeof debt.friend === "string" && typeof debt.item === "string" && Number.isFinite(Number(debt.amount)); }
function isSeedExpense(expense) { return new Set(["咖啡:85", "早餐:85", "捷運:35", "午餐:120"]).has(`${expense.title}:${Number(expense.amount)}`); }
function isSeedDebt(debt) { return new Set(["阿明:咖啡:280", "小美:電影票:1200", "家豪:宵夜:400"]).has(`${debt.friend}:${debt.item}:${Number(debt.amount)}`); }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getCurrency() { return CURRENCY_OPTIONS.has(state.currency) ? state.currency : DEFAULT_CURRENCY; }
function setCurrency(currency) { if (!CURRENCY_OPTIONS.has(currency)) return; state.currency = currency; saveState(); render(); }
function getCurrencyLabel(currency = getCurrency()) { return currency === "JPY" ? "¥" : "NT$"; }
function formatMoney(amount, currency = getCurrency()) { return `${getCurrencyLabel(currency)} ${Number(amount).toLocaleString(currency === "JPY" ? "ja-JP" : "zh-Hant-TW")}`; }
function formatDateLabel(value) { const date = new Date(value); return date.toDateString() === new Date().toDateString() ? "今天" : `${date.getMonth() + 1} 月 ${date.getDate()} 日`; }
function getMonthKey(value) { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function inferCategory(title) { if (/早餐|午餐|晚餐|咖啡|飲料|便當|餐|麵|飯|宵夜/i.test(title)) return "飲食"; if (/捷運|公車|高鐵|uber|計程車|油錢|停車/i.test(title)) return "交通"; if (/網購|衣服|鞋|momo|pchome|蝦皮|購物/i.test(title)) return "購物"; if (/全聯|家樂福|超市|日用品|衛生紙/i.test(title)) return "生活"; return "其他"; }
function parseExpense(text) { const value = text.trim(); const textFirstMatch = value.match(/^(.+?)\s*([0-9,]+)$/); const amountFirstMatch = value.match(/^([0-9,]+)\s*(.+?)$/); const title = textFirstMatch ? textFirstMatch[1].trim() : amountFirstMatch?.[2].trim(); const amountText = textFirstMatch ? textFirstMatch[2] : amountFirstMatch?.[1]; if (!title || !amountText) return null; const amount = Number(amountText.replaceAll(",", "")); return Number.isFinite(amount) && amount > 0 ? createExpense(title, amount, inferCategory(title)) : null; }
function addExpenseFromText(event) { event.preventDefault(); const expense = parseExpense(el.expenseInput.value); if (!expense) { el.expenseInput.focus(); el.expenseInput.classList.add("is-invalid"); window.setTimeout(() => el.expenseInput.classList.remove("is-invalid"), 500); return; } state.expenses.unshift(expense); saveState(); el.expenseInput.value = ""; el.expenseInput.focus(); render(); }
function handleExpenseInputKeydown(event) { if (event.key !== "Enter" || event.isComposing) return; event.preventDefault(); if (typeof el.expenseForm.requestSubmit === "function") el.expenseForm.requestSubmit(); else el.expenseForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }
function addDebtFromForm(event) { event.preventDefault(); const formData = new FormData(event.currentTarget); const friend = String(formData.get("friend") || "").trim(); const item = String(formData.get("item") || "").trim(); const amount = Number(String(formData.get("amount") || "").replaceAll(",", "")); if (!friend || !item || !Number.isFinite(amount) || amount <= 0) return; state.debts.unshift(createDebt(friend, item, amount)); saveState(); event.currentTarget.reset(); render(); }
function handleExpenseDelete(event) { const button = event.target.closest("[data-delete-expense]"); if (!button) return; state.expenses = state.expenses.filter((expense) => expense.id !== button.dataset.deleteExpense); saveState(); render(); }
function handleDebtDelete(event) { const button = event.target.closest("[data-delete-debt]"); if (!button) return; state.debts = state.debts.filter((debt) => debt.id !== button.dataset.deleteDebt); saveState(); render(); }
function clearDebts() { state.debts = []; saveState(); render(); }
function resetData() { state = getDefaultState(); selectedMonth = new Date(); saveState(); render(); }
function changeMonth(delta) { selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1); render(); }
function showTab(target) { el.tabButtons.forEach((item) => item.classList.toggle("active", item.dataset.target === target)); el.screens.forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === target)); }
function render() { const nowKey = getMonthKey(new Date()); const today = new Date().toDateString(); const monthKey = getMonthKey(selectedMonth); const currency = getCurrency(); const currencyExpenses = state.expenses.filter((expense) => expense.currency === currency); const currencyDebts = state.debts.filter((debt) => debt.currency === currency); const thisMonthExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === nowKey); const todayExpenses = currencyExpenses.filter((expense) => new Date(expense.date).toDateString() === today); const selectedExpenses = currencyExpenses.filter((expense) => getMonthKey(expense.date) === monthKey); const debtSum = currencyDebts.reduce((sum, debt) => sum + Number(debt.amount), 0); el.monthTotal.textContent = formatMoney(sumAmounts(thisMonthExpenses)); el.todayTotal.textContent = formatMoney(sumAmounts(todayExpenses)); el.recordsTotal.textContent = formatMoney(sumAmounts(selectedExpenses)); el.selectedMonthLabel.textContent = `${selectedMonth.getFullYear()} 年 ${selectedMonth.getMonth() + 1} 月`; el.recordsListTitle.textContent = `${selectedMonth.getMonth() + 1} 月紀錄`; el.debtTotal.textContent = formatMoney(debtSum); el.debtCount.textContent = `${currencyDebts.length} 筆`; el.settingsCurrency.textContent = currency; el.currencyButtons.forEach((button) => button.classList.toggle("active", button.dataset.currency === currency)); renderLatestExpense(currencyExpenses[0]); renderExpenseList(el.recentList, currencyExpenses.slice(0, 4), "目前沒有紀錄"); renderExpenseList(el.recordsList, selectedExpenses, "這個月還沒有支出"); renderDebtList(currencyDebts); }
function sumAmounts(items) { return items.reduce((sum, item) => sum + Number(item.amount), 0); }
function renderLatestExpense(expense) { document.querySelector("#parsed-title").textContent = expense ? expense.title : "尚未新增"; document.querySelector("#parsed-amount").textContent = expense ? `-${formatMoney(expense.amount, expense.currency)}` : formatMoney(0); document.querySelector("#parsed-category").textContent = expense ? expense.category : "-"; el.parsedDate.textContent = expense ? formatDateLabel(expense.date) : "-"; }
function renderExpenseList(target, expenses, emptyText) { if (!expenses.length) { target.innerHTML = `<li class="empty-state">${emptyText}</li>`; return; } target.innerHTML = expenses.map((expense) => `<li><span class="category-dot ${getCategoryClass(expense.category)}"></span><div><strong>${escapeHtml(expense.title)}</strong><p>${escapeHtml(expense.category)} · ${formatDateLabel(expense.date)}</p></div><b>-${formatMoney(expense.amount, expense.currency)}</b><button class="delete-button" data-delete-expense="${expense.id}" aria-label="刪除 ${escapeHtml(expense.title)}">x</button></li>`).join(""); }
function renderDebtList(debts) { if (!debts.length) { el.debtList.innerHTML = `<li class="empty-state">目前沒有朋友欠款</li>`; return; } el.debtList.innerHTML = debts.map((debt) => `<li><span class="avatar">${escapeHtml(debt.friend.slice(-1))}</span><div><strong>${escapeHtml(debt.friend)}</strong><p>${escapeHtml(debt.item)} · ${formatDateLabel(debt.date)}</p></div><b>${formatMoney(debt.amount, debt.currency)}</b><button class="delete-button" data-delete-debt="${debt.id}" aria-label="刪除 ${escapeHtml(debt.friend)}">x</button></li>`).join(""); }
function getCategoryClass(category) { return { 飲食: "food", 交通: "transit", 購物: "shopping", 生活: "grocery" }[category] || "other"; }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
async function registerServiceWorker() { if (!("serviceWorker" in navigator)) { el.offlineStatus.textContent = "此瀏覽器不支援"; return; } try { const registration = await navigator.serviceWorker.register("./sw.js?v=11"); el.offlineStatus.textContent = "可離線使用"; navigator.serviceWorker.addEventListener("controllerchange", () => { if (refreshingForUpdate) return; refreshingForUpdate = true; setUpdateStatus("更新完成，正在重新載入"); window.setTimeout(() => window.location.reload(), 450); }); registration.addEventListener("updatefound", () => { const worker = registration.installing; if (!worker) return; const shouldShowProgress = Boolean(navigator.serviceWorker.controller); if (shouldShowProgress) setUpdateStatus("正在下載新版"); worker.addEventListener("statechange", () => { if (worker.state === "installed" && navigator.serviceWorker.controller) { setUpdateStatus("新版已下載，正在安裝"); worker.postMessage({ type: "SKIP_WAITING" }); } }); }); await checkForUpdates(false, registration); window.setInterval(() => checkForUpdates(false, registration), UPDATE_CHECK_INTERVAL); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdates(false, registration); }); } catch { el.offlineStatus.textContent = "離線功能尚未啟用"; } }
async function checkForUpdates(isManual = false, existingRegistration = null) { if (!("serviceWorker" in navigator)) return; const registration = existingRegistration || (await navigator.serviceWorker.getRegistration("./")); if (!registration) return; if (isManual) setUpdateStatus("正在檢查更新"); try { await registration.update(); if (registration.waiting) { setUpdateStatus("新版已下載，正在安裝"); registration.waiting.postMessage({ type: "SKIP_WAITING" }); return; } if (isManual) setUpdateStatus("已是最新版", 1600); } catch { if (isManual) setUpdateStatus("目前無法檢查更新", 1800); } }
function setUpdateStatus(message, hideAfterMs = 0) { if (updateStatusTimer) { window.clearTimeout(updateStatusTimer); updateStatusTimer = 0; } el.updateStatusText.textContent = message; el.updateStatus.hidden = false; if (hideAfterMs > 0) updateStatusTimer = window.setTimeout(() => { el.updateStatus.hidden = true; updateStatusTimer = 0; }, hideAfterMs); }
