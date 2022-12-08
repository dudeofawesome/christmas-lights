import { describe, expect, test } from '@jest/globals';
import { rgb_to_int } from '../../src/utils/rgb-to-int.js';

describe('rgb-to-int:unit', () => {
  describe('rgb_to_int', () => {
    test('max', () => expect(rgb_to_int(255, 255, 255)).toEqual(0xffffff));
    test('min', () => expect(rgb_to_int(0, 0, 0)).toEqual(0x000000));
    test('mid', () => expect(rgb_to_int(0, 128, 200)).toEqual(0x0080c8));
  });
});
