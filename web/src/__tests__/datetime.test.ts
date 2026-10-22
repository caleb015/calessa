import { toLocalDateTimeInput, fromLocalDateTimeInput } from '@/lib/datetime';

// jest.config.ts pins TZ to Asia/Manila (UTC+8).
describe('datetime-local conversions', () => {
  it('runs in Manila time', () => {
    expect(new Date('2027-01-01T00:00:00.000Z').getTimezoneOffset()).toBe(-480);
  });

  it('shows a stored UTC time as Manila local time in the picker', () => {
    // 07:00 UTC is 3:00 PM in Manila; the old toISOString().slice() showed 07:00.
    expect(toLocalDateTimeInput('2027-02-12T07:00:00.000Z')).toBe('2027-02-12T15:00');
  });

  it('rolls over to the next local day when needed', () => {
    expect(toLocalDateTimeInput('2026-12-31T17:00:00.000Z')).toBe('2027-01-01T01:00');
  });

  it('saves a picked local time as the matching UTC instant', () => {
    expect(fromLocalDateTimeInput('2027-02-12T15:00')).toBe('2027-02-12T07:00:00.000Z');
  });

  it('round-trips without shifting the time', () => {
    const picked = '2027-02-12T09:05';
    expect(toLocalDateTimeInput(fromLocalDateTimeInput(picked)!)).toBe(picked);
  });

  it('treats an empty picker value as cleared', () => {
    expect(fromLocalDateTimeInput('')).toBeNull();
  });
});
