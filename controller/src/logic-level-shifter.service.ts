import rpio from 'rpio';

import { LOGIC_LEVEL_SHIFTER_PIN, NO_GPIO } from './config.js';

export class LogicLevelShifterService {
  private pin = LOGIC_LEVEL_SHIFTER_PIN;

  constructor() {
    if (!NO_GPIO) {
      rpio.init({
        gpiomem: true,
        mapping: 'gpio',
      });
      rpio.open(this.pin, rpio.OUTPUT);
      rpio.write(this.pin, rpio.HIGH);

      process.on('SIGINT', () => {
        rpio.write(this.pin, rpio.LOW);
      });
    }
  }
}
