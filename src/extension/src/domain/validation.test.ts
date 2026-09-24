import { describe, expect, it } from 'vitest';

import { validateForm, type FormValues } from './validation';

const valid: FormValues = {
  workDate: '2026-09-23',
  hours: '1.5',
  activity: 'Development',
  timeCode: 'VH-DEV-LKA',
  note: 'Implemented validation',
};

describe('validateForm', () => {
  it('accepts a valid time log', () => expect(validateForm(valid, '2026-09-23')).toEqual({}));

  it.each(['0', '-1', '24.01', 'not-a-number'])('rejects invalid hours: %s', (hours) => {
    expect(validateForm({ ...valid, hours }, '2026-09-23').hours).toBeTruthy();
  });

  it('rejects future dates', () => {
    expect(validateForm({ ...valid, workDate: '2026-09-24' }, '2026-09-23').workDate).toMatch(
      /future/,
    );
  });

  it('rejects an unsupported time code', () => {
    expect(
      validateForm(
        { ...valid, timeCode: 'INVALID' as FormValues['timeCode'] },
        '2026-09-23',
      ).timeCode,
    ).toMatch(/supported/);
  });
});
