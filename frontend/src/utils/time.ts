/**
 * Formats decimal hours into human-readable "Xh Ym" (e.g. 0.85 -> "51m", 1.5 -> "1h 30m").
 */
export const formatHoursMinutes = (decimalHours: number): string => {
  if (!Number.isFinite(decimalHours) || decimalHours <= 0) return '0m';
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};
