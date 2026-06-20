(() => {
  const imageFor = (name) => window.__mascotImages?.[name] || "";
  const screens = () => document.querySelectorAll(".screen");
  const tabButtons = () => document.querySelectorAll(".tab-bar button");
  const logo = (name, target) => `<button class="mascot-button" type="button" data-mascot-target="${target}" aria-label="${target === "settings" ? "\u958B\u555F\u8A2D\u5B9A" : "\u56DE\u5230\u9996\u9801"}"><img src="${imageFor(name)}" alt="" /></button>`;

  function showScreen(target) {
    screens().forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === target));
    tabButtons().forEach((button) => button.classList.toggle("active", button.dataset.target === target));
    const active = document.querySelector(`[data-screen="${target}"]`);
    if (active) active.scrollTop = 0;
  }

  function replaceHeader(selector, name, options = {}) {
    const header = document.querySelector(selector);
    if (!header) return;
    header.classList.add("mascot-topbar");
    header.innerHTML = logo(name, "settings") + (options.trailing || "");
  }

  function addSettings() {
    const shell = document.querySelector(".phone-shell");
    if (!shell || document.querySelector("[data-screen='settings']")) return;
    const section = document.createElement("section");
    section.className = "screen settings-screen";
    section.dataset.screen = "settings";
    section.innerHTML = `
      <header class="top-bar mascot-topbar settings-topbar">${logo("home", "home")}</header>
      <section class="settings-panel">
        <h2>\u5E63\u5225</h2>
        <div class="settings-currency-picker" aria-label="\u5E63\u5225">
          <button type="button" data-settings-currency="TWD">TWD</button>
          <button type="button" data-settings-currency="USD">USD</button>
          <button type="button" data-settings-currency="JPY">JPY</button>
        </div>
      </section>
      <section class="settings-panel">
        <h2>\u8CC7\u6599\u7BA1\u7406</h2>
        <button class="settings-row-button" type="button" id="mascot-export-csv">\u532F\u51FA CSV</button>
        <button class="settings-row-button danger" type="button" id="mascot-reset-data">\u6E05\u9664\u8CC7\u6599</button>
      </section>
      <section class="settings-panel">
        <h2>\u95DC\u65BC</h2>
        <div class="settings-info-row"><span>\u7248\u672C\u865F</span><strong>v31</strong></div>
        <button class="settings-row-button" type="button" id="mascot-feedback">\u610F\u898B\u56DE\u994B</button>
      </section>`;
    shell.insertBefore(section, shell.querySelector(".tab-bar"));

    section.querySelectorAll("[data-settings-currency]").forEach((button) => {
      button.addEventListener("click", () => setCurrency(button.dataset.settingsCurrency));
    });
    section.querySelector("#mascot-export-csv").addEventListener("click", exportCsv);
    section.querySelector("#mascot-reset-data").addEventListener("click", () => document.querySelector("#reset-data")?.click());
    section.querySelector("#mascot-feedback").addEventListener("click", () => { window.location.href = "mailto:?subject=%E8%9B%8B%E9%BB%83%E5%B0%8F%E5%B8%B3%E6%84%8F%E8%A6%8B%E5%9B%9E%E9%A5%8B"; });
  }

  function setCurrency(currency) {
    document.querySelectorAll("[data-settings-currency]").forEach((button) => button.classList.toggle("active", button.dataset.settingsCurrency === currency));
    if (currency === "USD") return;
    const state = JSON.parse(localStorage.getItem("kai-expense-tracker-v1") || "{}");
    state.currency = currency;
    localStorage.setItem("kai-expense-tracker-v1", JSON.stringify(state));
    window.location.reload();
  }

  function escapeCsv(value) { const text = String(value ?? ""); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
  function exportCsv() {
    const state = JSON.parse(localStorage.getItem("kai-expense-tracker-v1") || "{}");
    const rows = [["type", "date", "title", "category_or_friend", "item", "amount", "currency"], ...(state.expenses || []).map((item) => ["expense", item.date, item.title, item.category, "", item.amount, item.currency]), ...(state.incomes || []).map((item) => ["income", item.date, item.title, item.category || "", "", item.amount, item.currency]), ...(state.debts || []).map((item) => ["debt", item.date, "", item.friend, item.item, item.amount, item.currency])];
    const blob = new Blob([`\ufeff${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `kai-expense-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  addSettings();
  replaceHeader(".home-screen .top-bar", "home");
  replaceHeader("[data-screen='records'] .top-bar", "records");
  replaceHeader("[data-screen='debts'] .top-bar", "debts");
  replaceHeader(".asset-topbar", "assets");
  replaceHeader(".split-topbar", "split", { trailing: '<strong id="split-expense-count">0 \u7B46</strong>' });
  document.querySelectorAll("[data-mascot-target]").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.mascotTarget)));
  const currency = JSON.parse(localStorage.getItem("kai-expense-tracker-v1") || "{}").currency || "TWD";
  document.querySelectorAll("[data-settings-currency]").forEach((button) => button.classList.toggle("active", button.dataset.settingsCurrency === currency));
})();

