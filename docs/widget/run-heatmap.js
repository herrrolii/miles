(function () {
  "use strict";

  function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function startOfWeek(date) {
    var next = new Date(date);
    next.setUTCHours(0, 0, 0, 0);
    next.setUTCDate(next.getUTCDate() - next.getUTCDay());
    return next;
  }

  function percentile(sortedValues, fraction) {
    if (!sortedValues.length) return 0;
    var index = Math.floor((sortedValues.length - 1) * fraction);
    return sortedValues[index];
  }

  function createIntensityResolver(days) {
    var distances = (days || [])
      .map(function (day) {
        return Number(day.distance_m || 0);
      })
      .filter(function (distance) {
        return distance > 0;
      })
      .sort(function (a, b) {
        return a - b;
      });

    if (!distances.length) {
      return function () {
        return 0;
      };
    }

    var q1 = percentile(distances, 0.25);
    var q2 = percentile(distances, 0.5);
    var q3 = percentile(distances, 0.75);

    return function (day) {
      var distance = Number((day && day.distance_m) || 0);
      if (distance <= 0) return 0;
      if (distance <= q1) return 1;
      if (distance <= q2) return 2;
      if (distance <= q3) return 3;
      return 4;
    };
  }

  function buildDaysMap(days) {
    var map = new Map();
    (days || []).forEach(function (day) {
      if (day && day.date) map.set(day.date, day);
    });
    return map;
  }

  function buildGrid(daysMap, totalDays) {
    var end = new Date();
    end.setUTCHours(0, 0, 0, 0);

    var start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (totalDays - 1));

    var gridStart = startOfWeek(start);
    var cursor = new Date(gridStart);
    var weeks = [];
    var currentWeek = [];

    while (cursor <= end) {
      var date = toIsoDate(cursor);
      currentWeek.push(
        daysMap.get(date) || {
          date: date,
          count: 0,
          distance_m: 0,
          moving_time_s: 0,
        }
      );

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (currentWeek.length) {
      weeks.push(currentWeek);
    }

    return weeks;
  }

  function formatTooltip(day) {
    var runLabel = day.count === 1 ? "run" : "runs";
    var km = (Number(day.distance_m || 0) / 1000).toFixed(1);
    var minutes = Math.round(Number(day.moving_time_s || 0) / 60);
    return day.date + ": " + day.count + " " + runLabel + ", " + km + " km, " + minutes + " min";
  }

  function renderError(container, message) {
    container.innerHTML = "";
    var error = document.createElement("div");
    error.className = "rh-error";
    error.textContent = message;
    container.appendChild(error);
  }

  function renderHeatmap(container, payload, options) {
    var days = (payload && payload.days) || [];
    var theme = (options && options.theme) || "light";
    var totalDays = (options && options.days) || 365;
    var intensity = createIntensityResolver(days);
    var weeks = buildGrid(buildDaysMap(days), totalDays);

    container.innerHTML = "";

    var root = document.createElement("div");
    root.className = "rh-root rh-theme-" + theme;

    var grid = document.createElement("div");
    grid.className = "rh-grid";

    weeks.forEach(function (week) {
      var weekEl = document.createElement("div");
      weekEl.className = "rh-week";

      week.forEach(function (day) {
        var cell = document.createElement("div");
        cell.className = "rh-cell rh-level-" + intensity(day);
        cell.title = formatTooltip(day);
        cell.setAttribute("aria-label", formatTooltip(day));
        weekEl.appendChild(cell);
      });

      grid.appendChild(weekEl);
    });

    var legend = document.createElement("div");
    legend.className = "rh-legend";
    legend.innerHTML =
      "<span>Less</span>" +
      '<span class="rh-cell rh-level-0"></span>' +
      '<span class="rh-cell rh-level-1"></span>' +
      '<span class="rh-cell rh-level-2"></span>' +
      '<span class="rh-cell rh-level-3"></span>' +
      '<span class="rh-cell rh-level-4"></span>' +
      "<span>More</span>";

    root.appendChild(grid);
    root.appendChild(legend);
    container.appendChild(root);
  }

  function loadAndRender(container, options) {
    var dataUrl = (options && options.dataUrl) || "/heatmap-data.json";

    return fetch(dataUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch heatmap data (" + response.status + ")");
        }
        return response.json();
      })
      .then(function (payload) {
        renderHeatmap(container, payload, options || {});
      })
      .catch(function (error) {
        renderError(container, error.message);
      });
  }

  function mountHeatmap(container, options) {
    if (!container) {
      throw new Error("mountHeatmap requires a target element.");
    }
    return loadAndRender(container, options || {});
  }

  function defineCustomElement() {
    if (!("customElements" in window)) return;
    if (customElements.get("run-heatmap")) return;

    class RunHeatmapElement extends HTMLElement {
      static get observedAttributes() {
        return ["data-url", "theme", "days"];
      }

      connectedCallback() {
        this.render();
      }

      attributeChangedCallback() {
        if (this.isConnected) {
          this.render();
        }
      }

      render() {
        var days = Number(this.getAttribute("days") || 365);
        var options = {
          dataUrl: this.getAttribute("data-url") || "/heatmap-data.json",
          theme: this.getAttribute("theme") || "light",
          days: Number.isFinite(days) && days > 0 ? days : 365,
        };
        loadAndRender(this, options);
      }
    }

    customElements.define("run-heatmap", RunHeatmapElement);
  }

  defineCustomElement();

  window.RunHeatmap = {
    mount: mountHeatmap,
    render: renderHeatmap,
  };
})();
