import ws281x from 'rpi-ws281x-native';
import chalk from 'chalk';

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

  private PRINT_LED_ARRAY = process.env.PRINT_LED_ARRAY === 'true';

  constructor() {
    this.channel = ws281x(parseInt(process.env.LED_COUNT!), {
      stripType: process.env.LED_TYPE! as any,
      gpio: parseInt(process.env.LED_PIN!),
    });

    process.on('SIGINT', () => {
      ws281x.reset();
      ws281x.finalize();
    });

    setImmediate(this.loop.bind(this), performance.now());
  }

  private loop(timestamp: number): NodeJS.Immediate {
    const delta = timestamp - this.last_timestamp;
    this.last_timestamp = timestamp;
    //console.info(`${delta} ms`);

    if (this.PRINT_LED_ARRAY) {
      console.log(
        Array.from(this.channel.array)
          .map((c) => chalk.hex(`#${c.toString(16)}`)('•'))
          .join(''),
      );
    }

    ws281x.render();

    return setImmediate(this.loop.bind(this), performance.now());
  }
}
