import { int_to_rgb, hsl_to_int } from '../utils/colorspaces.js';
import type { LEDSService } from '../leds.service.js';
import type { Pattern } from './pattern.interface.js';

export class TraditionalMulticolorPattern implements Pattern {
  /** hsl colors */
  #colors = [
    [300, 1, 0.48], // fuschia
    [238, 1, 0.48], // blue
    [0, 1, 0.5], // red
    [124, 1, 0.41], // green
    [51, 1, 0.78], // yellow
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
        const color = this.#colors[led_cursor % this.#colors.length]!;
        const brightness = (Math.cos((segment[j]! + time / 800) / 2) + 2) / 3;

        this.leds_service.set_led(
          segment[j]!,
          hsl_to_int(color[0]!, color[1]!, color[2]! * brightness),
        );
      }
    }
  }
}
