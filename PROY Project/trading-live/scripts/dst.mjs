// Cálculo de DST en fechas de calendario UTC, sin depender del huso horario
// de la máquina que corre el script (todos los timestamps de get_trendbars
// vienen en UTC).

function nthWeekdayUTC(year, month, weekday, n) {
  // month: 0-indexado. weekday: 0=domingo..6=sábado. n: 1ª, 2ª, ... ocurrencia.
  const d = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - d.getUTCDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}

function lastWeekdayUTC(year, month, weekday) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)); // último día del mes
  const diff = (lastDay.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(year, month, lastDay.getUTCDate() - diff));
}

// EE.UU.: DST (EDT) empieza 2º domingo de marzo 2:00 hora local (07:00 UTC en
// EST) y termina 1er domingo de noviembre 2:00 hora local (06:00 UTC en EDT).
export function isUsDst(date) {
  const y = date.getUTCFullYear();
  const start = new Date(nthWeekdayUTC(y, 2, 0, 2).getTime() + 7 * 3600 * 1000);
  const end = new Date(nthWeekdayUTC(y, 10, 0, 1).getTime() + 6 * 3600 * 1000);
  return date >= start && date < end;
}

// Reino Unido: BST empieza último domingo de marzo 1:00 UTC y termina último
// domingo de octubre 1:00 UTC.
export function isUkDst(date) {
  const y = date.getUTCFullYear();
  const start = new Date(lastWeekdayUTC(y, 2, 0).getTime() + 1 * 3600 * 1000);
  const end = new Date(lastWeekdayUTC(y, 9, 0).getTime() + 1 * 3600 * 1000);
  return date >= start && date < end;
}
