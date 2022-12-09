import ws281x from 'rpi-ws281x-native';
import chalk from 'chalk';

import {
  PRINT_LED_ARRAY,
  LED_COUNT,
  LED_TYPE,
  LED_PIN,
  NO_GPIO,
} from './config.js';

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
    const delta = timestamp - this.last_timestamp;
    this.last_timestamp = timestamp;
    //console.info(`${delta} ms`);

    if (PRINT_LED_ARRAY) {
      console.log(
        Array.from(this.channel.array)
          .map((c) => chalk.hex(`#${c.toString(16)}`).bgBlack('•'))
          .join(''),
      );
    }

    if (!NO_GPIO) {
      ws281x.render();
    }

    return setImmediate(this.loop.bind(this), performance.now());
  }
}
