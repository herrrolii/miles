(function () {
  "use strict";

  var DEFAULT_WIDGET_CSS_URL = resolveDefaultWidgetCssUrl();

  var MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  });

  var MONTH_NAME_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  var KM_FORMATTER = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  function resolveDefaultWidgetCssUrl() {
    if (document.currentScript && document.currentScript.src) {
      return new URL("./run-heatmap.css", document.currentScript.src).toString();
    }
    return "run-heatmap.css";
  }

  function ensureShadowMount(host, options) {
    var shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
    var styleHref = (options && options.cssHref) || DEFAULT_WIDGET_CSS_URL;
    var stylesheet = shadowRoot.querySelector('link[data-rh-styles="true"]');
    var mount = shadowRoot.querySelector('[data-rh-mount="true"]');

    if (!stylesheet) {
      stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.setAttribute("data-rh-styles", "true");
      shadowRoot.appendChild(stylesheet);
    }

    if (stylesheet.getAttribute("href") !== styleHref) {
      stylesheet.setAttribute("href", styleHref);
    }

    if (!mount) {
      mount = document.createElement("div");
      mount.setAttribute("data-rh-mount", "true");
      shadowRoot.appendChild(mount);
    }

    return mount;
  }

  function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function parseIsoDate(dateString) {
    var parsed = new Date(dateString + "T00:00:00.000Z");
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function startOfTodayUtc() {
    var today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }

  function startOfWeek(date) {
    var next = new Date(date);
    next.setUTCHours(0, 0, 0, 0);
    next.setUTCDate(next.getUTCDate() - next.getUTCDay());
    return next;
  }

  function endOfWeek(date) {
    var next = new Date(date);
    next.setUTCHours(0, 0, 0, 0);
    next.setUTCDate(next.getUTCDate() + (6 - next.getUTCDay()));
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

  function zeroDay(date) {
    return {
      date: date,
      count: 0,
      distance_m: 0,
      moving_time_s: 0,
      inRange: false,
    };
  }

  function buildDaysMap(days) {
    var map = new Map();
    (days || []).forEach(function (day) {
      if (day && day.date) map.set(day.date, day);
    });
    return map;
  }

  function buildYearList(days, explicitYears) {
    if (Array.isArray(explicitYears) && explicitYears.length > 0) {
      return explicitYears.filter(function (year) {
        return Number.isFinite(Number(year));
      });
    }

    var years = new Set();
    (days || []).forEach(function (day) {
      if (!day || !day.date) return;
      years.add(Number(day.date.slice(0, 4)));
    });

    if (!years.size) {
      years.add(startOfTodayUtc().getUTCFullYear());
    }

    return Array.from(years).sort(function (a, b) {
      return b - a;
    });
  }

  function buildViewRange(view) {
    var today = startOfTodayUtc();

    if (view && view.type === "year") {
      var year = Number(view.year);
      var yearStart = new Date(Date.UTC(year, 0, 1));
      var yearEnd = new Date(Date.UTC(year, 11, 31));
      return { start: yearStart, end: yearEnd, mode: "year", year: year };
    }

    var end = today;
    var start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 364);
    return { start: start, end: end, mode: "last12Months" };
  }

  function buildGrid(daysMap, viewRange) {
    var start = viewRange.start;
    var end = viewRange.end;
    var gridStart = startOfWeek(start);
    var gridEnd = endOfWeek(end);
    var cursor = new Date(gridStart);
    var weeks = [];
    var currentWeek = [];
    var visibleDays = [];

    while (cursor <= gridEnd) {
      var date = toIsoDate(cursor);
      var day = daysMap.get(date) || zeroDay(date);
      var inRange = cursor >= start && cursor <= end;
      var enriched = {
        date: day.date,
        count: Number(day.count || 0),
        distance_m: Number(day.distance_m || 0),
        moving_time_s: Number(day.moving_time_s || 0),
        inRange: inRange,
      };
      currentWeek.push(enriched);
      if (inRange) visibleDays.push(enriched);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (currentWeek.length) {
      weeks.push(currentWeek);
    }

    return {
      weeks: weeks,
      visibleDays: visibleDays,
    };
  }

  function getMonthKey(day) {
    return day.date.slice(0, 7);
  }

  function getMonthLabel(monthKey) {
    var date = parseIsoDate(monthKey + "-01");
    if (!date) return "";
    return MONTH_FORMATTER.format(date);
  }

  function collectVisibleMonthKeys(weeks) {
    var seen = new Set();
    var keys = [];

    for (var i = 0; i < weeks.length; i += 1) {
      var week = weeks[i];
      for (var j = 0; j < week.length; j += 1) {
        var day = week[j];
        if (!day.inRange) continue;
        var key = getMonthKey(day);
        if (seen.has(key)) continue;
        seen.add(key);
        keys.push(key);
      }
    }

    return keys;
  }

  function weekIsExclusiveForMonth(week, monthKey) {
    for (var i = 0; i < week.length; i += 1) {
      if (getMonthKey(week[i]) !== monthKey) return false;
    }
    return true;
  }

  function weekContainsMonthStart(week, monthKey) {
    for (var i = 0; i < week.length; i += 1) {
      var day = week[i];
      if (!day.inRange) continue;
      if (getMonthKey(day) !== monthKey) continue;
      if (day.date.slice(8, 10) === "01") return true;
    }
    return false;
  }

  function weekContainsMonth(week, monthKey) {
    for (var i = 0; i < week.length; i += 1) {
      var day = week[i];
      if (!day.inRange) continue;
      if (getMonthKey(day) === monthKey) return true;
    }
    return false;
  }

  function buildMonthLabels(weeks) {
    var labels = new Array(weeks.length).fill("");
    var monthKeys = collectVisibleMonthKeys(weeks);

    for (var m = 0; m < monthKeys.length; m += 1) {
      var monthKey = monthKeys[m];
      var labelIndex = -1;

      for (var i = 0; i < weeks.length; i += 1) {
        if (weekIsExclusiveForMonth(weeks[i], monthKey)) {
          labelIndex = i;
          break;
        }
      }

      if (labelIndex < 0) {
        for (var j = 0; j < weeks.length; j += 1) {
          if (weekContainsMonthStart(weeks[j], monthKey)) {
            labelIndex = j;
            break;
          }
        }
      }

      if (labelIndex < 0) {
        for (var k = 0; k < weeks.length; k += 1) {
          if (weekContainsMonth(weeks[k], monthKey)) {
            labelIndex = k;
            break;
          }
        }
      }

      if (labelIndex >= 0) {
        labels[labelIndex] = getMonthLabel(monthKey);
      }
    }

    return labels;
  }

  function formatDistanceKm(distanceM) {
    var km = Number(distanceM || 0) / 1000;
    return KM_FORMATTER.format(km);
  }

  function formatSummary(viewRange, visibleDays) {
    var totalDistance = visibleDays.reduce(function (sum, day) {
      return sum + Number(day.distance_m || 0);
    }, 0);

    if (viewRange.mode === "year") {
      return formatDistanceKm(totalDistance) + " km ran in " + String(viewRange.year);
    }

    return formatDistanceKm(totalDistance) + " km ran in the last year";
  }

  function formatOrdinalDay(dayNumber) {
    var n = Number(dayNumber || 0);
    var mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return String(n) + "th";
    var mod10 = n % 10;
    if (mod10 === 1) return String(n) + "st";
    if (mod10 === 2) return String(n) + "nd";
    if (mod10 === 3) return String(n) + "rd";
    return String(n) + "th";
  }

  function formatTooltip(day) {
    var date = parseIsoDate(day.date);
    if (!date) return "";
    var dateLabel = MONTH_NAME_FORMATTER.format(date) + " " + formatOrdinalDay(date.getUTCDate());
    var distance = Number(day.distance_m || 0);
    if (distance <= 0) {
      return "No running on " + dateLabel + ".";
    }
    return formatDistanceKm(distance) + " km on " + dateLabel + ".";
  }

  function createTooltip(root) {
    var tooltip = document.createElement("div");
    tooltip.className = "rh-tooltip";
    root.appendChild(tooltip);
    return tooltip;
  }

  function showTooltip(root, tooltip, event, content) {
    tooltip.textContent = content;
    tooltip.classList.add("is-visible");

    var rootRect = root.getBoundingClientRect();
    var left = event.clientX - rootRect.left + 10;
    var top = event.clientY - rootRect.top - 36;

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip(tooltip) {
    tooltip.classList.remove("is-visible");
  }

  function renderError(container, message) {
    container.innerHTML = "";
    var error = document.createElement("div");
    error.className = "rh-error";
    error.textContent = message;
    container.appendChild(error);
  }

  function resolveInitialView(years, options) {
    var defaultYear = Number(options && options.defaultYear);
    if (defaultYear && years.indexOf(defaultYear) >= 0) {
      return { type: "year", year: defaultYear };
    }

    return { type: "last12Months" };
  }

  function renderLegend(root) {
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
    root.appendChild(legend);
  }

  function renderHeatmap(container, payload, options) {
    var days = (payload && payload.days) || [];
    var years = buildYearList(days, payload && payload.years);
    var daysMap = buildDaysMap(days);
    var theme = (options && options.theme) || "light";
    var state = {
      view: resolveInitialView(years, options || {}),
    };

    function renderView() {
      var viewRange = buildViewRange(state.view);
      var gridData = buildGrid(daysMap, viewRange);
      var visibleDays = gridData.visibleDays;
      var intensity = createIntensityResolver(visibleDays);
      var monthLabels = buildMonthLabels(gridData.weeks);

      container.innerHTML = "";

      var root = document.createElement("div");
      root.className = "rh-root rh-theme-" + theme;

      var layout = document.createElement("div");
      layout.className = "rh-layout";

      var content = document.createElement("div");
      content.className = "rh-content";

      var header = document.createElement("h2");
      header.className = "rh-title";
      header.textContent = formatSummary(viewRange, visibleDays);
      content.appendChild(header);

      var graphWrap = document.createElement("div");
      graphWrap.className = "rh-graph-wrap";

      var scroll = document.createElement("div");
      scroll.className = "rh-scroll";

      var scrollContent = document.createElement("div");
      scrollContent.className = "rh-scroll-content";

      var months = document.createElement("div");
      months.className = "rh-months";
      monthLabels.forEach(function (label) {
        var month = document.createElement("span");
        month.className = "rh-month";
        month.textContent = label;
        months.appendChild(month);
      });
      scrollContent.appendChild(months);

      var graphBody = document.createElement("div");
      graphBody.className = "rh-graph-body";

      var weekdays = document.createElement("div");
      weekdays.className = "rh-weekdays";
      weekdays.innerHTML = "<span>Mon</span><span>Wed</span><span>Fri</span>";
      graphBody.appendChild(weekdays);

      var grid = document.createElement("div");
      grid.className = "rh-grid";
      grid.setAttribute("role", "grid");
      gridData.weeks.forEach(function (week) {
        var weekEl = document.createElement("div");
        weekEl.className = "rh-week";

        week.forEach(function (day) {
          var cell = document.createElement("div");
          cell.className = "rh-cell rh-level-" + intensity(day);
          if (!day.inRange) {
            cell.classList.add("rh-cell-muted");
          } else {
            var tooltipText = formatTooltip(day);
            cell.setAttribute("tabindex", "0");
            cell.setAttribute("aria-label", tooltipText);
            cell.dataset.tooltip = tooltipText;
          }
          weekEl.appendChild(cell);
        });

        grid.appendChild(weekEl);
      });
      graphBody.appendChild(grid);
      scrollContent.appendChild(graphBody);
      scroll.appendChild(scrollContent);
      graphWrap.appendChild(scroll);

      var yearsNav = document.createElement("nav");
      yearsNav.className = "rh-years";
      yearsNav.setAttribute("aria-label", "Year selector");

      var yearList = document.createElement("ul");
      yearList.className = "rh-year-list";
      yearsNav.appendChild(yearList);

      function makeYearButton(label, isActive, onClick, ariaLabel) {
        var item = document.createElement("li");
        item.className = "rh-year-item";

        var button = document.createElement("button");
        button.type = "button";
        button.className = "rh-year" + (isActive ? " is-active" : "");
        button.textContent = label;
        if (ariaLabel) {
          button.setAttribute("aria-label", ariaLabel);
        }
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
        if (isActive) {
          button.setAttribute("aria-current", "true");
        }
        button.addEventListener("click", onClick);
        item.appendChild(button);
        yearList.appendChild(item);
      }

      makeYearButton(
        "-",
        state.view.type === "last12Months",
        function () {
          state.view = { type: "last12Months" };
          renderView();
        },
        "Last 12 months"
      );

      years.forEach(function (year) {
        makeYearButton(
          String(year),
          state.view.type === "year" && Number(state.view.year) === Number(year),
          function () {
            state.view = { type: "year", year: Number(year) };
            renderView();
          }
        );
      });

      if (years.length > 5) {
        yearList.classList.add("is-scrollable");
      }

      var card = document.createElement("div");
      card.className = "rh-card";
      card.appendChild(graphWrap);
      renderLegend(card);
      content.appendChild(card);

      layout.appendChild(content);
      layout.appendChild(yearsNav);
      root.appendChild(layout);

      var tooltip = createTooltip(root);
      root.addEventListener("mousemove", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains("rh-cell")) return;
        if (!target.dataset.tooltip) return;
        showTooltip(root, tooltip, event, target.dataset.tooltip);
      });
      root.addEventListener("mouseover", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains("rh-cell")) return;
        if (!target.dataset.tooltip) return;
        showTooltip(root, tooltip, event, target.dataset.tooltip);
      });
      root.addEventListener("mouseout", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains("rh-cell")) {
          hideTooltip(tooltip);
        }
      });
      root.addEventListener("focusin", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!target.classList.contains("rh-cell")) return;
        if (!target.dataset.tooltip) return;

        var rect = target.getBoundingClientRect();
        showTooltip(
          root,
          tooltip,
          { clientX: rect.left + rect.width / 2, clientY: rect.top },
          target.dataset.tooltip
        );
      });
      root.addEventListener("focusout", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains("rh-cell")) {
          hideTooltip(tooltip);
        }
      });

      container.appendChild(root);
    }

    renderView();
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
        return ["data-url", "theme", "default-year", "css-href"];
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
        var options = {
          dataUrl: this.getAttribute("data-url") || "/heatmap-data.json",
          theme: this.getAttribute("theme") || "light",
          defaultYear: this.getAttribute("default-year"),
          cssHref: this.getAttribute("css-href") || DEFAULT_WIDGET_CSS_URL,
        };
        loadAndRender(ensureShadowMount(this, options), options);
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
