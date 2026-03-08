function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateWindow(days) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const keys = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    keys.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { start, end, keys };
}

function getActivityDateKey(activity) {
  const source = activity?.start_date_local || activity?.start_date;
  if (!source || typeof source !== "string" || source.length < 10) {
    return null;
  }
  return source.slice(0, 10);
}

function aggregateRunsByDay(activities, options = {}) {
  const days = options.days || 365;
  const { keys } = buildDateWindow(days);

  const byDate = new Map(
    keys.map((date) => [
      date,
      { date, count: 0, distance_m: 0, moving_time_s: 0 },
    ])
  );

  for (const activity of activities) {
    if (activity?.type !== "Run") continue;
    const date = getActivityDateKey(activity);
    if (!date || !byDate.has(date)) continue;

    const day = byDate.get(date);
    day.count += 1;
    day.distance_m += Number(activity.distance || 0);
    day.moving_time_s += Number(activity.moving_time || 0);
  }

  return keys.map((date) => {
    const day = byDate.get(date);
    return {
      date: day.date,
      count: day.count,
      distance_m: Math.round(day.distance_m),
      moving_time_s: Math.round(day.moving_time_s),
    };
  });
}

function buildHeatmapPayload(activities, options = {}) {
  return {
    generatedAt: new Date().toISOString(),
    days: aggregateRunsByDay(activities, options),
  };
}

module.exports = {
  aggregateRunsByDay,
  buildHeatmapPayload,
};
