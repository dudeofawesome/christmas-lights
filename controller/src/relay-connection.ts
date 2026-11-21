import type { SerialPort } from 'serialport';

const READY = 0x10;
const CHUNK_RECEIVED = 0x11;
const FRAME_DISPLAYED = 0x12;
const ERROR = 0x7f;

/** Protocol v1: a six-byte setup header, then fixed-length RGB frames. */
export class RelayConnection {
  private chunk_size: number;
  private failure?: Error;
  private reject_pending?: (error: Error) => void;

  constructor(
    private readonly serial: SerialPort,
    private readonly led_count: number,
    chunk_size?: number,
    private readonly timeout_ms = 3000,
  ) {
    if (!Number.isInteger(led_count) || led_count < 1 || led_count > 65535)
      throw new Error('LED_COUNT must be an integer between 1 and 65535');
    if (
      chunk_size !== undefined &&
      (!Number.isInteger(chunk_size) || chunk_size < 1)
    )
      throw new Error('SERIAL_BUFFER_SIZE must be a positive integer');
    // Zero requests a single acknowledgment per frame. Older relays reject it.
    this.chunk_size = Math.min(chunk_size ?? 0, 64);
    serial.on('error', (error: Error) => this.fail(error));
    serial.on('close', () => this.fail(new Error('Relay disconnected')));
  }

  private fail(error: Error): void {
    this.failure = error;
    this.reject_pending?.(error);
  }

  async initialize(): Promise<void> {
    if (!this.serial.isOpen) {
      await new Promise<void>((resolve, reject) => {
        this.serial.open((error) => (error ? reject(error) : resolve()));
      });
    }
    if (!(await this.configure())) {
      this.chunk_size = 64;
      await this.configure();
    }
  }

  private configure(): Promise<boolean> {
    const framing =
      this.chunk_size === 0
        ? 'whole frames'
        : `${this.chunk_size} bytes per chunk`;
    return this.exchange(
      Uint8Array.of(
        0x43,
        0x4c,
        1,
        this.led_count >> 8,
        this.led_count & 0xff,
        this.chunk_size,
      ),
      READY,
      `setup (${this.led_count} LEDs, ${framing})`,
      this.chunk_size === 0,
    );
  }

  async send_frame(frame: Uint8Array): Promise<void> {
    if (frame.length !== this.led_count * 3)
      throw new Error(`Expected ${this.led_count * 3} RGB bytes`);
    const write_size = this.chunk_size || frame.length;
    for (let offset = 0; offset < frame.length; offset += write_size) {
      const end = Math.min(offset + write_size, frame.length);
      await this.exchange(
        frame.subarray(offset, end),
        end === frame.length ? FRAME_DISPLAYED : CHUNK_RECEIVED,
        `frame bytes ${offset + 1}–${end} of ${frame.length}`,
      );
    }
  }

  private async exchange(
    bytes: Uint8Array,
    expected: number,
    stage: string,
    allow_rejection = false,
  ): Promise<boolean> {
    if (this.failure) throw this.failure;
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const poll_deadline = process.platform === 'darwin';
        let settled = false;
        const finish = (error?: Error, accepted = true) => {
          if (settled) return;
          settled = true;
          if (poll_deadline) clearInterval(timer);
          else clearTimeout(timer);
          this.serial.removeListener('data', on_data);
          this.reject_pending = undefined;
          if (error) reject(error);
          else resolve(accepted);
        };
        const on_data = (data: Buffer) => {
          if (allow_rejection && data.length === 1 && data[0] === ERROR) {
            finish(undefined, false);
          } else if (data.length !== 1 || data[0] !== expected) {
            finish(
              new Error(
                `Unexpected relay response 0x${data.toString(
                  'hex',
                )} during ${stage} (expected 0x${expected.toString(16)})`,
              ),
            );
          } else finish();
        };
        const on_timeout = () =>
          finish(
            new Error(
              `Timed out waiting for relay acknowledgment during ${stage}`,
            ),
          );
        const deadline = performance.now() + this.timeout_ms;
        // On macOS USB serial readiness can stall while Node is idle.
        // Check the deadline frequently there so short replies are delivered.
        const timer = poll_deadline
          ? setInterval(() => {
              if (performance.now() >= deadline) on_timeout();
            }, 2)
          : setTimeout(on_timeout, this.timeout_ms);
        this.reject_pending = finish;
        // Register before writing: the relay may reply immediately.
        this.serial.on('data', on_data);
        try {
          this.serial.write(bytes, (error) => {
            if (error) finish(error);
          });
        } catch (error) {
          finish(error as Error);
        }
      });
    } catch (error) {
      // Stop using the stream after losing framing or an acknowledgment.
      this.fail(error as Error);
      throw error;
    }
  }
}
