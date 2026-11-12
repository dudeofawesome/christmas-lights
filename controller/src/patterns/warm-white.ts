import type { LEDSService } from '../leds.service.ts';
import { rgb_to_int } from '../utils/colorspaces.ts';
import type { Pattern } from './pattern.interface.ts';

export class WarmWhitePattern implements Pattern {
  static #warm_white = rgb_to_int(255, 142, 33);

  constructor(
    private leds_service: LEDSService,
    private segments: number[][],
  ) {}

  loop(time: number): void {
    let led_cursor = 0;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]!;

      for (let j = 0; j < segment.length; j++ && led_cursor++) {
        this.leds_service.set_led(segment[j]!, WarmWhitePattern.#warm_white);
      }
    }
  }
}
