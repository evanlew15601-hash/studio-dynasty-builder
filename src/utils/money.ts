export function formatMoney(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  return `${sign}$${abs.toLocaleString()}`;
}

function formatCompactValue(value: number, maxFractionDigits: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
}

export function formatMoneyCompact(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);

  if (abs >= 1_000_000_000) {
    return `${sign}$${formatCompactValue(abs / 1_000_000_000, 1)}B`;
  }

  if (abs >= 1_000_000) {
    return `${sign}$${formatCompactValue(abs / 1_000_000, 1)}M`;
  }

  if (abs >= 1_000) {
    return `${sign}$${formatCompactValue(abs / 1_000, 0)}k`;
  }

  return `${sign}$${abs.toLocaleString()}`;
}
