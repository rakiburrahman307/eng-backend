export const getLeagueStatus = (startDate: Date, endDate: Date) => {
  const now = new Date();

  if (now < startDate) return 'upcoming';
  if (now >= startDate && now <= endDate) return 'running';
  return 'finished';
};