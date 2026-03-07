const {
  buildDateMap,
  buildGrid,
  createIntensityResolver,
  formatTooltip,
} = require("./utils");

function createCell(documentRef, day, level) {
  const cell = documentRef.createElement("div");
  cell.className = `rh-cell rh-level-${level}`;
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-label", formatTooltip(day));
  cell.title = formatTooltip(day);
  return cell;
}

function renderHeatmap(container, payload, options = {}) {
  const days = payload?.days || [];
  const daysByDate = buildDateMap(days);
  const weeks = buildGrid(daysByDate, options.days || 365);
  const intensity = createIntensityResolver(days);

  const doc = container.ownerDocument;
  container.innerHTML = "";

  const root = doc.createElement("div");
  root.className = `rh-root rh-theme-${options.theme || "light"}`;

  const grid = doc.createElement("div");
  grid.className = "rh-grid";
  grid.setAttribute("role", "grid");

  for (const week of weeks) {
    const weekColumn = doc.createElement("div");
    weekColumn.className = "rh-week";

    for (const entry of week) {
      weekColumn.appendChild(createCell(doc, entry.data, intensity(entry.data)));
    }

    grid.appendChild(weekColumn);
  }

  const legend = doc.createElement("div");
  legend.className = "rh-legend";
  legend.innerHTML = `
    <span>Less</span>
    <span class="rh-cell rh-level-0"></span>
    <span class="rh-cell rh-level-1"></span>
    <span class="rh-cell rh-level-2"></span>
    <span class="rh-cell rh-level-3"></span>
    <span class="rh-cell rh-level-4"></span>
    <span>More</span>
  `;

  root.appendChild(grid);
  root.appendChild(legend);
  container.appendChild(root);
}

module.exports = {
  renderHeatmap,
};
