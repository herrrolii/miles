function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getActivityDateKey(activity) {
  const source = activity?.start_date_local || activity?.start_date;
  if (!source || typeof source !== "string" || source.length < 10) {
    return null;
  }
  return source.slice(0, 10);
}

function startOfTodayUtc() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

function getDefaultStartDate(today) {
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 364);
  return start;
}

function buildDateKeys(startDate, endDate) {
  const keys = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    keys.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function aggregateActivityTotals(activities) {
  const byDate = new Map();

  for (const activity of activities) {
    if (activity?.type !== "Run") continue;
    const date = getActivityDateKey(activity);
    if (!date) continue;

    const current = byDate.get(date) || {
      date,
      count: 0,
      distance_m: 0,
      moving_time_s: 0,
    };

    current.count += 1;
    current.distance_m += Number(activity.distance || 0);
    current.moving_time_s += Number(activity.moving_time || 0);
    byDate.set(date, current);
  }

  return byDate;
}

function pickStartDateFromActivities(byDate, today) {
  const keys = Array.from(byDate.keys()).sort();
  if (!keys.length) {
    return getDefaultStartDate(today);
  }

  const earliest = parseIsoDate(keys[0]);
  return earliest || getDefaultStartDate(today);
}

function aggregateRunsByDay(activities) {
  const today = startOfTodayUtc();
  const totalsByDate = aggregateActivityTotals(activities);
  const startDate = pickStartDateFromActivities(totalsByDate, today);
  const keys = buildDateKeys(startDate, today);

  return keys.map((date) => {
    const day = totalsByDate.get(date);
    if (!day) {
      return { date, count: 0, distance_m: 0, moving_time_s: 0 };
    }

    return {
      date: day.date,
      count: day.count,
      distance_m: Math.round(day.distance_m),
      moving_time_s: Math.round(day.moving_time_s),
    };
  });
}

function summarizeLast12Months(days) {
  if (!days.length) {
    return { total_distance_m: 0, total_runs: 0, total_moving_time_s: 0 };
  }

  const end = parseIsoDate(days[days.length - 1].date);
  if (!end) {
    return { total_distance_m: 0, total_runs: 0, total_moving_time_s: 0 };
  }

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  const startKey = toIsoDate(start);

  return days.reduce(
    (summary, day) => {
      if (day.date < startKey) return summary;
      summary.total_distance_m += Number(day.distance_m || 0);
      summary.total_runs += Number(day.count || 0);
      summary.total_moving_time_s += Number(day.moving_time_s || 0);
      return summary;
    },
    { total_distance_m: 0, total_runs: 0, total_moving_time_s: 0 }
  );
}

function listYears(days) {
  if (!days.length) {
    return [new Date().getUTCFullYear()];
  }

  const startYear = Number(days[0].date.slice(0, 4));
  const endYear = Number(days[days.length - 1].date.slice(0, 4));
  const years = [];

  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }

  return years;
}

function buildHeatmapPayload(activities) {
  const days = aggregateRunsByDay(activities);

  return {
    generatedAt: new Date().toISOString(),
    years: listYears(days),
    summary: {
      last12Months: summarizeLast12Months(days),
    },
    days,
  };
}

module.exports = {
  aggregateRunsByDay,
  buildHeatmapPayload,
};
