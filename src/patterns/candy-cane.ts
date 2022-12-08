import { rgb_to_int } from '../utils/rgb-to-int.js';
import type { LEDSService } from '../leds.service.js';

export class CandyCanePattern {
  private period = 24;
  private squareness = 6;
  private width_factor = 0.3185;
  private speed_factor = 50;
  private anim_speed = 6;

  constructor(private leds_service: LEDSService, private segments: number[][]) {
    setImmediate(this.loop.bind(this), performance.now());
  }

  loop(time: number): NodeJS.Immediate {
    const x = time / this.speed_factor;

    for (const segment of this.segments) {
      for (const j of segment) {
        const saturation = this.curve(j + x) * 255;

        this.leds_service.channel.array[j] = rgb_to_int(
          255,
          255 - saturation,
          255 - saturation,
        );
      }
    }

    return setImmediate(this.loop.bind(this), performance.now());
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
