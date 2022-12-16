import { describe, expect, test } from '@jest/globals';
import {
  rgb_to_int,
  int_to_rgb,
  hsl_to_int,
} from '../../src/utils/colorspaces.js';

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

  describe('hsl_to_int', () => {
    test('min', () => expect(hsl_to_int(0, 0, 0)).toEqual(0x000000));
    test('min', () => expect(hsl_to_int(360, 0, 0)).toEqual(0x000000));

    test('max', () => expect(hsl_to_int(0, 0, 1)).toEqual(0xffffff));
    test('max', () => expect(hsl_to_int(0, 1, 1)).toEqual(0xffffff));

    test('mid', () => expect(hsl_to_int(180, 0.5, 0.5)).toEqual(0x40bfbf));
  });
});
