/* eslint-disable no-undef */
import { formatDateOnly, formatDatetime, matchFileNameExtension } from './utils';

describe('formatDatetime', () => {
  test('Given Date Object, correctly formats UTC datetime to display in application', () => {
    const input = new Date(1651783817550);

    expect(formatDatetime(input)).toBe('2022-05-05 20:50:17 UTC');
  });
});

describe('matchFileNameExtension', () => {
  test('returns matched extension assuming a file name, else null', () => {
    const inputs = [
      'hello.txt',
      'rabbits.nc',
      'aliens.another',
      'yaaaa.foobar',
      'a-one-test.second.csv',
      'yet-ano_.ad.ds.xlsx',
      'yet-ano_.ad.ds.xls',
      'whatAbu.aas.tiff',
      'hello'
    ];

    const outputs = inputs.map(i => {
      const match = matchFileNameExtension(i);
      return match && match[0];
    });

    expect(outputs).toEqual([
      '.txt',
      '.nc',
      '.another',
      '.foobar',
      '.csv',
      '.xlsx',
      '.xls',
      '.tiff',
      null
    ]);
  });
});


describe('formatDateOnly', () => {
  test('formats ts to date, without time', () => {
    const result = formatDateOnly(1660656870);

    expect(result).toBe('1970-01-20');

  });
});
