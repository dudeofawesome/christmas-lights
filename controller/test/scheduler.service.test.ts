import { describe, expect, test } from '@jest/globals';
import { SchedulerService } from '../src/scheduler.service.js';

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
  });
});
