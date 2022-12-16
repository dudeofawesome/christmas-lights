import { describe, expect, test } from '@jest/globals';
import { fill_list } from '../src/light-segments.js';

describe('light-segments:unit', () => {
  describe('fill_list', () => {
    test('0..10', () =>
      expect(fill_list(0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    test('10..0', () =>
      expect(fill_list(10, 0)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]));
    test('50..75', () =>
      expect(fill_list(50, 55)).toEqual([50, 51, 52, 53, 54, 55]));
  });
});
