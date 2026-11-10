import { led } from '../config.js';
import type { LEDSService } from '../leds.service.js';
import type { Pattern } from './pattern.interface.js';

export class OffPattern implements Pattern {
  constructor(private leds_service: LEDSService) {}

  loop(time: number): void {
    for (let i = 0; i < led.count; i++) {
      this.leds_service.set_led(i, 0x000000);
    }
  }
}
