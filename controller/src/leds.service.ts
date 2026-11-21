import { promisify } from 'util';
import { SerialPort } from 'serialport';
import chalk from 'chalk';

import { debug, control, led, relay } from './config.ts';
import { int_to_rgb } from './utils/colorspaces.ts';
import { gamma_correct } from './utils/gamma.ts';
import { RelayConnection } from './relay-connection.ts';

function noop() {}
const cursorTo = promisify(
  process.stdout.cursorTo?.bind(process.stdout) ?? noop,
);
const moveCursor = promisify(
  process.stdout.moveCursor?.bind(process.stdout) ?? noop,
);

export class LEDSService {
  private leds_array = new Uint8Array(led.count * 3);
  private serial?: SerialPort;
  private last_timestamp: number = performance.now();

  private connection?: RelayConnection;

  constructor(serial_port?: string) {
    if (!debug.no_io) {
      if (!serial_port) throw new Error('A relay serial port is required');
      this.serial = new SerialPort({
        path: serial_port,
        baudRate: relay.serial_port.baud_rate,
        autoOpen: false,
      });
      console.log(this.serial.path, this.serial.baudRate);
      this.connection = new RelayConnection(
        this.serial,
        led.count,
        relay.serial_port.buffer_size,
      );
    }

    setImmediate(() => {
      this.start().catch((error: unknown) => this.stop(error));
    });

    if (debug.print.serial && !debug.no_io) {
      this.serial!.on('data', (data) => {
        console.log(`relay response: ${data.toString('hex')}`);
      });
    }
  }

  private async start(): Promise<void> {
    await this.connection?.initialize();
    await this.loop(performance.now());
  }

  private stop(error: unknown): void {
    console.error('Relay communication failed:', error);
    this.serial?.destroy();
    process.exit(1);
  }

  private async loop(timestamp: number): Promise<void> {
    if (debug.print.timings) {
      const delta = timestamp - this.last_timestamp;
      this.last_timestamp = timestamp;
      console.info(`${delta.toFixed(0)} ms`);
    }

    if (debug.print.led_array && process.stdout.isTTY) {
      await cursorTo(0);
      await moveCursor(
        0,
        -Math.abs(Math.floor((led.count - 1) / process.stdout.columns)),
      );
      process.stdout.write(this.led_array_to_string());
    }

    if (!debug.no_io) {
      await this.connection!.send_frame(
        this.leds_array.map((pixel) => gamma_correct(pixel)),
      );
    }

    const next_frame = () => {
      this.loop(performance.now()).catch((error: unknown) => this.stop(error));
    };
    const delay = 1000 / 60 - (performance.now() - timestamp);
    if (delay > 0) setTimeout(next_frame, delay);
    else setImmediate(next_frame);
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

    this.leds_array[led * 3 + 0] = color[0];
    this.leds_array[led * 3 + 1] = color[1];
    this.leds_array[led * 3 + 2] = color[2];
  }

  private led_array_to_string(): string {
    let str: string = '';
    for (let i = 0; i < led.count * 3; i += 3) {
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
