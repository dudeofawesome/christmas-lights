import ws281x from 'rpi-ws281x-native';
import chalk from 'chalk';

import {
  PRINT_LED_ARRAY,
  LED_COUNT,
  LED_TYPE,
  LED_PIN,
  NO_GPIO,
  PRINT_TIMINGS,
} from './config.js';
import { int_to_rgb } from './utils/colorspaces.js';

export class LEDSService {
  channel: {
    readonly count: number;
    readonly stripType: unknown;
    readonly invert: boolean;
    readonly gpio: number;
    brightness: number;
    array: Uint32Array;
    buffer: Buffer;
  };
  private last_timestamp: number = performance.now();

  constructor() {
    this.channel = ws281x(LED_COUNT, {
      stripType: LED_TYPE as any,
      gpio: LED_PIN,
    });
    if (!NO_GPIO) {
      process.on('SIGINT', () => {
        ws281x.reset();
        ws281x.finalize();
      });
    }

    setImmediate(this.loop.bind(this), performance.now());
  }

  private loop(timestamp: number): NodeJS.Immediate {
    if (PRINT_TIMINGS) {
      const delta = timestamp - this.last_timestamp;
      this.last_timestamp = timestamp;
      console.info(`${delta.toFixed(0)} ms`);
    }

    if (PRINT_LED_ARRAY) {
      process.stdout.cursorTo(0);
      process.stdout.write(
        Array.from(this.channel.array)
          .map((c) => chalk.rgb(...int_to_rgb(c)).bgBlack('•'))
          .join(''),
      );
    }

    if (!NO_GPIO) {
      ws281x.render();
    }

    return setImmediate(this.loop.bind(this), performance.now());
  }
}
