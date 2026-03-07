function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  const day = next.getUTCDay();
  next.setUTCDate(next.getUTCDate() - day);
  return next;
}

function buildDateMap(days) {
  const map = new Map();
  for (const day of days || []) {
    if (!day?.date) continue;
    map.set(day.date, day);
  }
  return map;
}

function percentile(sortedValues, fraction) {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((sortedValues.length - 1) * fraction);
  return sortedValues[index];
}

function createIntensityResolver(days) {
  const active = (days || [])
    .map((day) => Number(day.distance_m || 0))
    .filter((distance) => distance > 0)
    .sort((a, b) => a - b);

  if (active.length === 0) {
    return () => 0;
  }

  const q1 = percentile(active, 0.25);
  const q2 = percentile(active, 0.5);
  const q3 = percentile(active, 0.75);

  return (day) => {
    const distance = Number(day?.distance_m || 0);
    if (distance <= 0) return 0;
    if (distance <= q1) return 1;
    if (distance <= q2) return 2;
    if (distance <= q3) return 3;
    return 4;
  };
}

function buildGrid(daysByDate, totalDays = 365) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));

  const gridStart = startOfWeek(start);
  const cells = [];
  const cursor = new Date(gridStart);

  while (cursor <= end) {
    const key = toIsoDate(cursor);
    cells.push({
      date: key,
      weekday: cursor.getUTCDay(),
      month: cursor.getUTCMonth(),
      data:
        daysByDate.get(key) || {
          date: key,
          count: 0,
          distance_m: 0,
          moving_time_s: 0,
        },
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

function formatTooltip(day) {
  const runLabel = day.count === 1 ? "run" : "runs";
  const km = (Number(day.distance_m || 0) / 1000).toFixed(1);
  const minutes = Math.round(Number(day.moving_time_s || 0) / 60);
  return `${day.date}: ${day.count} ${runLabel}, ${km} km, ${minutes} min`;
}

module.exports = {
  buildDateMap,
  buildGrid,
  createIntensityResolver,
  formatTooltip,
  toIsoDate,
};
