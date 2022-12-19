import { promisify } from 'util';
import { SerialPort } from 'serialport';
import chalk from 'chalk';

import {
  PRINT_LED_ARRAY,
  LED_COUNT,
  PRINT_TIMINGS,
  SERIAL_PORT,
  BAUD_RATE,
  SERIAL_BUFFER_SIZE,
} from './config.js';
import { int_to_rgb } from './utils/colorspaces.js';

const FRAME_END_SEQUENCE = new Uint8Array([0x01]);
const SUBFRAME_END_SEQUENCE = new Uint8Array([0x03]);

export class LEDSService {
  private leds_array = new Uint8Array(LED_COUNT * 3);
  private serial = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
  private last_timestamp: number = performance.now();

  private serial_write: (data: string | Buffer | Uint8Array) => Promise<void> =
    promisify(this.serial.write.bind(this.serial));
  private serial_drain = promisify(this.serial.drain.bind(this.serial));

  constructor() {
    console.log(this.serial.path, this.serial.baudRate);
    this.serial.setEncoding('binary');
    setImmediate(this.loop.bind(this), performance.now());

    this.serial.on('data', (data) => {
      process.stdout.write(data.toString('ascii'));
    });
  }

  private async loop(timestamp: number): Promise<NodeJS.Timeout> {
    if (PRINT_TIMINGS) {
      const delta = timestamp - this.last_timestamp;
      this.last_timestamp = timestamp;
      console.info(`${delta.toFixed(0)} ms`);
    }

    if (PRINT_LED_ARRAY) {
      process.stdout.cursorTo(0);
      process.stdout.write(this.led_array_to_string());
    }

    // write LED array data to serial in SERIAL_BUFFER_SIZE chunks
    for (
      let cursor = 0;
      cursor < this.leds_array.length;
      cursor += SERIAL_BUFFER_SIZE
    ) {
      const subframe = this.leds_array.subarray(
        cursor,
        Math.min(cursor + SERIAL_BUFFER_SIZE, this.leds_array.length),
      );

      console.log(`subframe size: ${subframe.length} bytes`);

      // TODO: it's possible this drain call doesn't actually wait for the drain to occur
      if (!this.serial.write(subframe)) await this.serial_drain();
      if (!this.serial.write(SUBFRAME_END_SEQUENCE)) await this.serial_drain();

      /**
       * Wait for Arduino to ack the end of a subframe, indicating that the
       * serial buffer should be cleared.
       */
      await new Promise<void>((res) => {
        const listener = (data: string) => {
          if (data[0] === `${SUBFRAME_END_SEQUENCE[0]}`) {
            this.serial.removeListener('data', listener);
            return res();
          }
        };
        this.serial.addListener('data', listener);

        this.serial.write(SUBFRAME_END_SEQUENCE);
        console.log('waiting for SUBFRAME_END ack');
      });

      console.log('got SUBFRAME_END ack');
    }
    // TODO: it's possible this drain call doesn't actually wait for the drain to occur
    if (!this.serial.write(FRAME_END_SEQUENCE)) await this.serial_drain();

    return setTimeout(this.loop.bind(this), 1000 / 60, performance.now());
  }

  public set_led(led: number, color: [number, number, number]): void;
  public set_led(led: number, color: number): void;
  public set_led(led: number, color: number | [number, number, number]): void {
    if (typeof color === 'number') {
      // convert color to rgb array
      color = int_to_rgb(color);
    }

    // TODO: this could probably be more efficient.
    color = color.map((c) => Math.round(c)) as [number, number, number];

    // 0x01 is used to delimit a new frame, so we can't use it as a value.
    if (color[0] === FRAME_END_SEQUENCE[0]) color[0] = 0;
    if (color[1] === FRAME_END_SEQUENCE[0]) color[1] = 0;
    if (color[2] === FRAME_END_SEQUENCE[0]) color[2] = 0;

    // 0x01 is used to delimit a new subframe, so we can't use it as a value.
    if (color[0] === SUBFRAME_END_SEQUENCE[0]) color[0] = 2;
    if (color[1] === SUBFRAME_END_SEQUENCE[0]) color[1] = 2;
    if (color[2] === SUBFRAME_END_SEQUENCE[0]) color[2] = 2;

    this.leds_array[led * 3 + 0] = color[0];
    this.leds_array[led * 3 + 1] = color[1];
    this.leds_array[led * 3 + 2] = color[2];
  }

  private led_array_to_string(): string {
    let str: string = '';
    for (let i = 0; i < LED_COUNT * 3; i += 3) {
      str += chalk
        .rgb(
          this.leds_array[i + 0] ?? 0,
          this.leds_array[i + 1] ?? 0,
          this.leds_array[i + 2] ?? 0,
        )
        .bgBlack('•');
    }
    return str;
  }
}
