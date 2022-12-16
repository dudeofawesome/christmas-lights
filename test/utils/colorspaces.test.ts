import { describe, expect, test } from '@jest/globals';
import { rgb_to_int, int_to_rgb } from '../../src/utils/colorspaces.js';

describe('colorspaces:unit', () => {
  describe('rgb_to_int', () => {
    test('max', () => expect(rgb_to_int(255, 255, 255)).toEqual(0xffffff));
    test('min', () => expect(rgb_to_int(0, 0, 0)).toEqual(0x000000));
    test('mid', () => expect(rgb_to_int(0, 128, 200)).toEqual(0x0080c8));
  });

  describe('int_to_rgb', () => {
    test('max', () => expect(int_to_rgb(0xffffff)).toEqual([255, 255, 255]));
    test('min', () => expect(int_to_rgb(0x000000)).toEqual([0, 0, 0]));
    test('mid', () => expect(int_to_rgb(0x0080c8)).toEqual([0, 128, 200]));
  });
});
