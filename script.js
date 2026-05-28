const elements = {
  language: document.getElementById("language"),
  currency: document.getElementById("currency"),
  campaignStart: document.getElementById("campaign-start"),
  campaignEnd: document.getElementById("campaign-end"),
  totalRevenue: document.getElementById("total-revenue"),
  avgOrderValue: document.getElementById("avg-order-value"),
  leadResponseRate: document.getElementById("lead-response-rate"),
  prospectResponseRate: document.getElementById("prospect-response-rate"),
  leadResponseOutput: document.getElementById("lead-response-output"),
  prospectResponseOutput: document.getElementById("prospect-response-output"),
  prospectsValue: document.getElementById("prospects-value"),
  leadsValue: document.getElementById("leads-value"),
  customersValue: document.getElementById("customers-value"),
  prospectsRatio: document.getElementById("prospects-ratio"),
  leadsRatio: document.getElementById("leads-ratio"),
  customersRatio: document.getElementById("customers-ratio"),
  prospectsTrack: document.getElementById("prospects-track"),
  leadsTrack: document.getElementById("leads-track"),
  customersTrack: document.getElementById("customers-track"),
  currencyPrefix: document.getElementById("currency-prefix"),
  currencyPrefixAov: document.getElementById("currency-prefix-aov"),
  chart: document.getElementById("chart"),
};

const currencySymbols = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
};

const languageDefaults = {
  en: { start: "2026-05-08", end: "2026-11-04" },
  es: { start: "2026-05-08", end: "2026-11-04" },
  fr: { start: "2026-05-08", end: "2026-11-04" },
  de: { start: "2026-05-08", end: "2026-11-04" },
};

const state = {
  language: elements.language.value,
  currency: elements.currency.value,
  startDate: elements.campaignStart.value,
  endDate: elements.campaignEnd.value,
  revenue: Number(elements.totalRevenue.value),
  aov: Number(elements.avgOrderValue.value),
  leadRate: Number(elements.leadResponseRate.value),
  prospectRate: Number(elements.prospectResponseRate.value),
};

const formatters = new Map();

function getNumberFormatter(currency) {
  if (!formatters.has(currency)) {
    formatters.set(
      currency,
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
    );
  }
  return formatters.get(currency);
}

function formatCurrency(value) {
  return getNumberFormatter(state.currency).format(value);
}

function formatCount(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthName(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
}

function buildMonths(start, end) {
  const safeStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const safeEnd = new Date(end.getFullYear(), end.getMonth(), 1);
  const months = [];
  const cursor = new Date(safeStart);

  while (cursor <= safeEnd) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.length ? months : [new Date(start.getFullYear(), start.getMonth(), 1)];
}

function distributeValue(total, months) {
  const weights = months.map((_, index) => Math.pow(index + 1, 1.2));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  return weights.map((weight) => (total * weight) / weightSum);
}

function safeDivide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function computeValues() {
  const customers = safeDivide(state.revenue, Math.max(state.aov, 1));
  const leads = safeDivide(customers * 100, Math.max(state.leadRate, 1));
  const prospects = safeDivide(leads * 100, Math.max(state.prospectRate, 1));
  return { customers, leads, prospects };
}

function updateMetricCard(valueEl, ratioEl, trackEl, value, total) {
  const ratio = total > 0 ? (value / total) * 100 : 0;
  valueEl.textContent = formatCount(value);
  ratioEl.textContent = `${ratio.toFixed(ratio >= 10 ? 0 : 1)}%`;
  trackEl.style.width = `${Math.max(3, Math.min(100, ratio))}%`;
}

function renderChart(values) {
  const start = parseDate(elements.campaignStart.value);
  const end = parseDate(elements.campaignEnd.value);
  const months = start && end && end >= start ? buildMonths(start, end) : [new Date()];
  const prospectsSeries = distributeValue(values.prospects, months);
  const leadsSeries = distributeValue(values.leads, months);
  const customersSeries = distributeValue(values.customers, months);
  const maxValue = Math.max(...prospectsSeries, 1);

  elements.chart.innerHTML = months
    .map((month, index) => {
      const prospectWidth = Math.max(10, (prospectsSeries[index] / maxValue) * 100);
      const leadWidth = Math.max(10, (leadsSeries[index] / maxValue) * 100);
      const customerWidth = Math.max(10, (customersSeries[index] / maxValue) * 100);
      return `
        <div class="chart-row">
          <div class="chart-label">${monthName(month)}</div>
          <div class="chart-bar-shell">
            <div class="chart-bar" style="width:${prospectWidth}%" data-value="${formatCount(prospectsSeries[index])}"></div>
            <div class="chart-bar lead" style="width:${leadWidth}%; opacity:0.88; margin-top:-44px;" data-value="${formatCount(leadsSeries[index])}"></div>
            <div class="chart-bar customer" style="width:${customerWidth}%; opacity:0.8; margin-top:-44px;" data-value="${formatCount(customersSeries[index])}"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function syncInputs() {
  state.language = elements.language.value;
  state.currency = elements.currency.value;
  state.startDate = elements.campaignStart.value;
  state.endDate = elements.campaignEnd.value;
  state.revenue = Number(elements.totalRevenue.value) || 0;
  state.aov = Number(elements.avgOrderValue.value) || 0;
  state.leadRate = Number(elements.leadResponseRate.value) || 1;
  state.prospectRate = Number(elements.prospectResponseRate.value) || 1;

  const currencySymbol = currencySymbols[state.currency] || "$";
  elements.currencyPrefix.textContent = currencySymbol;
  elements.currencyPrefixAov.textContent = currencySymbol;
  elements.leadResponseOutput.textContent = `${state.leadRate}%`;
  elements.prospectResponseOutput.textContent = `${state.prospectRate}%`;

  const values = computeValues();
  updateMetricCard(elements.prospectsValue, elements.prospectsRatio, elements.prospectsTrack, values.prospects, values.prospects || 1);
  updateMetricCard(elements.leadsValue, elements.leadsRatio, elements.leadsTrack, values.leads, values.prospects || 1);
  updateMetricCard(elements.customersValue, elements.customersRatio, elements.customersTrack, values.customers, values.prospects || 1);
  renderChart(values);
}

function initializeDates() {
  const defaults = languageDefaults[elements.language.value] || languageDefaults.en;
  if (!elements.campaignStart.value) {
    elements.campaignStart.value = defaults.start;
  }
  if (!elements.campaignEnd.value) {
    elements.campaignEnd.value = defaults.end;
  }
}

["input", "change"].forEach((eventName) => {
  elements.language.addEventListener(eventName, () => {
    initializeDates();
    syncInputs();
  });
  elements.currency.addEventListener(eventName, syncInputs);
  elements.campaignStart.addEventListener(eventName, syncInputs);
  elements.campaignEnd.addEventListener(eventName, syncInputs);
  elements.totalRevenue.addEventListener(eventName, syncInputs);
  elements.avgOrderValue.addEventListener(eventName, syncInputs);
  elements.leadResponseRate.addEventListener(eventName, syncInputs);
  elements.prospectResponseRate.addEventListener(eventName, syncInputs);
});

initializeDates();
syncInputs();
