import { int_to_rgb, hsl_to_int } from '../utils/colorspaces.js';
import type { LEDSService } from '../leds.service.js';
import type { Pattern } from './pattern.interface.js';
import chalk from 'chalk';

export class TraditionalMulticolorPattern implements Pattern {
  #colors = [
    hsl_to_int(300, 1, 0.48), // fuschia
    hsl_to_int(238, 1, 0.48), // blue
    hsl_to_int(0, 1, 0.5), // red
    hsl_to_int(124, 1, 0.41), // green
    hsl_to_int(51, 1, 0.78), // yellow
  ];

  constructor(
    private leds_service: LEDSService,
    private segments: number[][],
  ) {}

  loop(time: number): void {
    let led_cursor = 0;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]!;

      for (let j = 0; j < segment.length; j++ && led_cursor++) {
        this.leds_service.set_led(
          segment[j]!,
          this.#colors[led_cursor % this.#colors.length]!,
        );
      }
    }
  }
}
