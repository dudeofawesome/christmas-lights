import { getSunset } from 'sunrise-sunset-js';

import {
  LATITUDE,
  LONGITUDE,
  LED_ALWAYS_ON,
  LED_OFF_HR,
  LED_ON_SUNSET_OFFSET_HR,
} from './config.js';
import type { PatternService } from './pattern.service.js';
import { date_to_fractional_hours } from './utils/time.js';

export class SchedulerService {
  // TODO: get the new sunset time daily
  static #sunset = getSunset(LATITUDE, LONGITUDE);

  constructor(private pattern_service: PatternService) {
    setImmediate(this.loop.bind(this), performance.now());
  }

  loop(time: number): NodeJS.Timeout {
    const fractional_hour = date_to_fractional_hours();

    if (process.argv[2] != null) {
      this.pattern_service.active_pattern = process.argv[2];
    } else if (SchedulerService.lights_should_be_on(fractional_hour)) {
      if (
        this.pattern_service.active_pattern === 'off' ||
        this.pattern_service.active_pattern == null
      ) {
        const pattern =
          this.pattern_service.patterns[
            Math.floor(Math.random() * this.pattern_service.patterns.length)
          ];
        console.log(`Starting new pattern: ${pattern}`);
        this.pattern_service.active_pattern = pattern;
      }
    } else {
      this.pattern_service.active_pattern = 'off';
    }

    return setTimeout(this.loop.bind(this), 1000, performance.now());
  }

  static get #light_on_time(): number {
    return date_to_fractional_hours(this.#sunset) + LED_ON_SUNSET_OFFSET_HR;
  }

  static get #light_off_time(): number {
    return LED_OFF_HR;
  }

  static lights_should_be_on(
    fractional_hour = date_to_fractional_hours(),
    light_on_time = this.#light_on_time,
    light_off_time = this.#light_off_time,
  ): boolean {
    if (LED_ALWAYS_ON) return true;
    else
      return light_off_time > light_on_time
        ? fractional_hour >= light_on_time && fractional_hour <= light_off_time
        : fractional_hour >= light_on_time || fractional_hour <= light_off_time;
  }
}
