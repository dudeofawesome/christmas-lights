import { hsl_to_int } from '../utils/colorspaces.ts';
import type { LEDSService } from '../leds.service.ts';
import type { Pattern } from './pattern.interface.ts';

export class TraditionalMulticolorPattern implements Pattern {
  /** hsl colors */
  #colors = [
    [0, 1, 0.5], // red
    [124, 0.8, 0.4], // green
    [243, 1, 0.4], // blue
    [43, 1, 0.57], // yellow
    // [46, 1, 0.88], // white
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
        const brightness = (Math.cos((segment[j]! + time / 400) / 2) + 4) / 5;

        this.leds_service.set_led(
          segment[j]!,
          hsl_to_int(color[0]!, color[1]!, color[2]! * brightness),
        );
      }
    }
  }
}
