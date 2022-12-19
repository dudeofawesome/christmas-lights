import { rgb_to_int, int_to_rgb, hsl_to_int } from '../utils/colorspaces.js';
import type { LEDSService } from '../leds.service.js';
import type { Pattern } from './pattern.interface.js';
import { PRINT_LED_ARRAY } from '../config.js';
import chalk from 'chalk';

export class GingerbreadHousePattern implements Pattern {
  private colors = [
    hsl_to_int(0, 1, 0.5), // red
    hsl_to_int(124, 1, 0.41), // green
    hsl_to_int(238, 1, 0.48), // blue
    hsl_to_int(51, 1, 0.78), // yellow
    hsl_to_int(300, 1, 0.48), // fuschia
  ];
  private color_duration = 10 * 60 * 1000; // 10 minutes
  // private color_duration = 1000; // 1 second

  private segment_colors: number[] = [];
  private start_time!: number;

  constructor(private leds_service: LEDSService, private segments: number[][]) {
    this.assign_colors();
  }

  loop(time: number): void {
    if (time - this.start_time > this.color_duration) {
      this.assign_colors();
    }

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]!;

      for (let j = 0; j < segment.length; j++) {
        this.leds_service.set_led(segment[j]!, this.segment_colors[i]!);
      }
    }
  }

  private assign_colors() {
    // reset last color change time
    this.start_time = performance.now();

    for (let i = 0; i < this.segments.length; i++) {
      let rand_color_index!: number;
      while (
        rand_color_index == null ||
        this.segment_colors[i - 1] === this.colors[rand_color_index]
      ) {
        rand_color_index = Math.floor(Math.random() * this.colors.length);
      }

      this.segment_colors[i] = this.colors[rand_color_index]!;
    }

    if (PRINT_LED_ARRAY) {
      console.log(
        '\n' +
          this.segment_colors
            .map((c) =>
              chalk
                .rgb(...int_to_rgb(c))
                .bgBlack(`rgb(${int_to_rgb(c).join(',')})`),
            )
            .join('\n'),
      );
    }
  }
}
