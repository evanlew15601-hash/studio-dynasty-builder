import { describe, expect, it } from 'vitest';
import { formatFestivalBidAmount, parseFestivalBidAmount } from '@/utils/festivalMarketplace';

describe('festival marketplace bidding helpers', () => {
  it('parses exact dollar and shorthand bid formats', () => {
    expect(parseFestivalBidAmount('2500000')).toBe(2_500_000);
    expect(parseFestivalBidAmount('2,500,000')).toBe(2_500_000);
    expect(parseFestivalBidAmount('$2.5M')).toBe(2_500_000);
    expect(parseFestivalBidAmount('2.5 million')).toBe(2_500_000);
    expect(parseFestivalBidAmount('750k')).toBe(750_000);
  });

  it('rejects ambiguous or invalid bid input instead of silently underbidding', () => {
    expect(parseFestivalBidAmount('2.5mm')).toBe(0);
    expect(parseFestivalBidAmount('abc')).toBe(0);
    expect(parseFestivalBidAmount('')).toBe(0);
  });

  it('formats suggested winning bids back into an easy editable input string', () => {
    expect(formatFestivalBidAmount(2_500_000)).toBe('$2.500M');
    expect(formatFestivalBidAmount(750_000)).toBe('$750.0K');
  });
});
