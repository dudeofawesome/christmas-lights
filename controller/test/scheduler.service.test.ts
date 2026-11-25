import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { control, led } from '../src/config.ts';
import { SchedulerService } from '../src/scheduler.service.ts';
import { PatternService } from '../src/pattern.service.ts';

vi.mock('../src/config.ts', () => ({
  control: {
    location: { lat: 34, lon: -118 },
    always_on: false,
    sunset: { offset_hr: -0.5, off_hr: 2 },
  },
  led: { pattern: undefined },
}));

vi.mock('sunrise-sunset-js', () => ({
  getSunset: () => new Date(2026, 10, 20, 17, 30),
}));

describe('scheduler.service:unit', () => {
  describe('SchedulerService', () => {
    describe('lights_should_be_on', () => {
      test('17:00 - 23:00', () => {
        expect(SchedulerService.lights_should_be_on(10, 17, 23)).toEqual(false);
        expect(SchedulerService.lights_should_be_on(17, 17, 23)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(20, 17, 23)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(23, 17, 23)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(24, 17, 23)).toEqual(false);
        expect(SchedulerService.lights_should_be_on(0, 17, 23)).toEqual(false);
      });

      test('17:00 - 24:00', () => {
        expect(SchedulerService.lights_should_be_on(10, 17, 24)).toEqual(false);
        expect(SchedulerService.lights_should_be_on(17, 17, 24)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(20, 17, 24)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(24, 17, 24)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(0, 17, 24)).toEqual(false);
      });

      test('17:00 - 02:00', () => {
        expect(SchedulerService.lights_should_be_on(10, 17, 2)).toEqual(false);
        expect(SchedulerService.lights_should_be_on(17, 17, 2)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(20, 17, 2)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(2, 17, 2)).toEqual(true);
        expect(SchedulerService.lights_should_be_on(3, 17, 2)).toEqual(false);
      });
    });

    describe('active pattern', () => {
      const original_argv = process.argv;

      function start_scheduler() {
        const pattern_service = {
          active_pattern: 'off',
          patterns: ['off', 'candy-cane', 'warm-white'],
        } as PatternService;
        new SchedulerService(pattern_service);
        vi.advanceTimersByTime(0);
        return pattern_service;
      }

      beforeEach(() => {
        process.argv = original_argv.slice(0, 2);
        control.always_on = false;
        led.pattern = undefined;
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
      });

      afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        process.argv = original_argv;
      });

      test('starts at the sunset offset, keeps the pattern overnight, and selects again at the next window', () => {
        vi.setSystemTime(new Date(2026, 10, 20, 16, 59, 59));
        const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.4);
        const pattern_service = start_scheduler();
        expect(pattern_service.active_pattern).toBe('off');

        vi.advanceTimersByTime(1000);
        expect(pattern_service.active_pattern).toBe('candy-cane');

        vi.setSystemTime(new Date(2026, 10, 21, 1, 59, 59));
        vi.advanceTimersByTime(1000);
        expect(pattern_service.active_pattern).toBe('candy-cane');
        expect(random).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        expect(pattern_service.active_pattern).toBe('off');

        random.mockReturnValueOnce(0.99);
        vi.setSystemTime(new Date(2026, 10, 21, 16, 59, 59));
        vi.advanceTimersByTime(1000);
        expect(pattern_service.active_pattern).toBe('warm-white');
        expect(random).toHaveBeenCalledTimes(2);
      });

      test('selects a lit pattern on the first tick even when the random draw is zero', () => {
        vi.setSystemTime(new Date(2026, 10, 20, 18));
        vi.spyOn(Math, 'random').mockReturnValue(0);

        expect(start_scheduler().active_pattern).toBe('candy-cane');
      });

      test.each([
        [undefined, 'warm-white'],
        ['candy-cane', 'candy-cane'],
        ['off', 'off'],
      ])(
        'uses the configured pattern and gives CLI argument %s priority',
        (argument, expected) => {
          vi.setSystemTime(new Date(2026, 10, 20, 18));
          led.pattern = 'warm-white';
          if (argument !== undefined) process.argv.push(argument);
          const random = vi.spyOn(Math, 'random');
          const pattern_service = start_scheduler();

          expect(pattern_service.active_pattern).toBe(expected);

          vi.setSystemTime(new Date(2026, 10, 21, 12));
          vi.advanceTimersByTime(1000);
          expect(pattern_service.active_pattern).toBe('off');
          expect(random).not.toHaveBeenCalled();
        },
      );

      test('keeps lights on outside the scheduled window when always-on is enabled', () => {
        vi.setSystemTime(new Date(2026, 10, 20, 12));
        control.always_on = true;
        led.pattern = 'warm-white';
        const pattern_service = start_scheduler();

        expect(pattern_service.active_pattern).toBe('warm-white');
      });
    });
  });
});
