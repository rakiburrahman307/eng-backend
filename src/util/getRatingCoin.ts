const getRatingCoin = (rating: number) => {
  if (rating === 10) return 2500;
  if (rating >= 8) return 1500;
  if (rating >= 6) return 500;
  if (rating === 5) return 0;
  if (rating >= 3) return -1000;
  return -3000;
};


export { getRatingCoin };