import { rgb_to_int } from '../utils/colorspaces.js';
import type { LEDSService } from '../leds.service.js';
import type { Pattern } from './pattern.interface.js';

export class CandyCanePattern implements Pattern {
  private period = 24;
  private squareness = 6;
  private width_factor = 0.3185;
  private speed_factor = 500;

  constructor(
    private leds_service: LEDSService,
    private segments: number[][],
  ) {}

  loop(time: number): void {
    const x = time / this.speed_factor;

    for (const segment of this.segments) {
      // const forward = segment[0]! < segment.at(-1)!;
      const min = Math.min(segment[0]!, segment.at(-1)!);
      for (let i = 0; i < segment.length; i++) {
        const saturation = this.curve(i + min + x) * 255;

        this.leds_service.set_led(segment[i]!, [
          255,
          255 - saturation,
          255 - saturation,
        ]);
      }
    }
  }

  curve(x: number): number {
    const y =
      (Math.atan(
        this.squareness * Math.cos(x / (this.width_factor * (this.period / 2))),
      ) /
        Math.atan(this.squareness) +
        1) /
      2;
    return y;
  }
}
