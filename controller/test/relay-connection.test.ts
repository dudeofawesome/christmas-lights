import { EventEmitter } from 'node:events';
import type { SerialPort } from 'serialport';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RelayConnection } from '../src/relay-connection.ts';

class MockPort extends EventEmitter {
  isOpen = false;
  writes: Buffer[] = [];
  respond?: (bytes: Buffer) => void;
  open_error?: Error;
  write_error?: Error;

  open(callback: (error?: Error) => void) {
    this.isOpen = !this.open_error;
    callback(this.open_error);
  }

  write(bytes: Uint8Array, callback: (error?: Error) => void) {
    const buffer = Buffer.from(bytes);
    this.writes.push(buffer);
    callback(this.write_error);
    if (!this.write_error) this.respond?.(buffer);
    return true;
  }

  reply(byte: number) {
    this.emit('data', Buffer.from([byte]));
  }
}

function connection(count = 2, chunk_size: number | null = 4) {
  const port = new MockPort();
  const relay = new RelayConnection(
    port as unknown as SerialPort,
    count,
    chunk_size ?? undefined,
  );
  return { port, relay };
}

afterEach(() => vi.useRealTimers());

describe('relay protocol', () => {
  test('defaults to one acknowledgment per complete frame', async () => {
    const { port, relay } = connection(600, null);
    port.respond = () => port.reply(0x10);
    await relay.initialize();
    expect(port.writes).toEqual([Buffer.from([0x43, 0x4c, 1, 2, 88, 0])]);

    const frame = Uint8Array.from({ length: 1800 }, (_, i) => i % 256);
    port.respond = () => port.reply(0x12);
    await relay.send_frame(frame);
    expect(port.writes.slice(1)).toEqual([Buffer.from(frame)]);
  });

  test('falls back to acknowledged chunks when older firmware rejects whole frames', async () => {
    const { port, relay } = connection(600, null);
    port.respond = (header) => port.reply(header[5] === 0 ? 0x7f : 0x10);
    await relay.initialize();
    expect(port.writes.map((header) => header[5])).toEqual([0, 64]);
    port.writes = [];
    port.respond = () => port.reply(port.writes.length === 29 ? 0x12 : 0x11);
    const frame = new Uint8Array(1800);
    await relay.send_frame(frame);
    expect(port.writes).toHaveLength(29);
    expect(Buffer.concat(port.writes)).toEqual(Buffer.from(frame));
  });

  test('configures the LED count as big-endian and caps USB chunks at 64 bytes', async () => {
    const { port, relay } = connection(600, 100);
    port.respond = () => port.reply(0x10);
    await relay.initialize();
    expect(port.isOpen).toBe(true);
    expect(port.writes).toEqual([Buffer.from([0x43, 0x4c, 1, 2, 88, 64])]);
    expect(port.listenerCount('data')).toBe(0);
  });

  test('sends every byte value unchanged, with no delimiters, across repeated frames', async () => {
    const { port, relay } = connection(256, 64);
    port.respond = () => port.reply(0x10);
    await relay.initialize();
    const frame = Uint8Array.from({ length: 768 }, (_, i) => i % 256);
    for (let repeat = 0; repeat < 2; repeat++) {
      port.writes = [];
      port.respond = () => port.reply(port.writes.length === 12 ? 0x12 : 0x11);
      await relay.send_frame(frame);
      expect(port.writes).toHaveLength(12);
      expect(Buffer.concat(port.writes)).toEqual(Buffer.from(frame));
    }
  });

  test('waits for each acknowledgment, including display of the final partial chunk', async () => {
    const { port, relay } = connection();
    port.respond = () => port.reply(0x10);
    await relay.initialize();
    port.respond = undefined;
    const sending = relay.send_frame(Uint8Array.of(0, 1, 2, 3, 4, 255));
    expect(port.writes).toHaveLength(2);
    port.reply(0x11);
    await vi.waitFor(() => expect(port.writes).toHaveLength(3));
    expect(port.writes[2]).toEqual(Buffer.from([4, 255]));
    port.reply(0x12);
    await sending;
    expect(port.listenerCount('data')).toBe(0);
  });

  test.each([0x7f, 0x11, 0x33])('rejects setup response %i', async (byte) => {
    const { port, relay } = connection();
    port.respond = () => port.reply(byte);
    await expect(relay.initialize()).rejects.toThrow(
      'Unexpected relay response',
    );
    expect(port.listenerCount('data')).toBe(0);
  });

  test('times out and refuses subsequent writes after losing synchronization', async () => {
    vi.useFakeTimers();
    const { port, relay } = connection();
    port.respond = () => port.reply(0x10);
    await relay.initialize();
    port.respond = undefined;
    const frame = new Uint8Array(6);
    const result = expect(relay.send_frame(frame)).rejects.toThrow('Timed out');
    await vi.advanceTimersByTimeAsync(3000);
    await result;
    expect(port.listenerCount('data')).toBe(0);
    await expect(relay.send_frame(frame)).rejects.toThrow('Timed out');
    expect(port.writes).toHaveLength(2);
  });

  test.each(['error', 'close'])(
    'rejects a pending transfer on %s',
    async (event) => {
      const { port, relay } = connection();
      const result = expect(relay.initialize()).rejects.toThrow(
        event === 'close' ? 'Relay disconnected' : 'USB failed',
      );
      await vi.waitFor(() => expect(port.writes).toHaveLength(1));
      port.emit(event, new Error('USB failed'));
      await result;
      expect(port.listenerCount('data')).toBe(0);
    },
  );

  test('reports open and write errors', async () => {
    const first = connection();
    first.port.open_error = new Error('Cannot open');
    await expect(first.relay.initialize()).rejects.toThrow('Cannot open');
    const second = connection();
    second.port.write_error = new Error('Cannot write');
    await expect(second.relay.initialize()).rejects.toThrow('Cannot write');
    expect(second.port.listenerCount('data')).toBe(0);
  });

  test.each([0, -1, NaN, 1.5, 65536])(
    'rejects invalid LED count %i',
    (count) => {
      expect(() => connection(count)).toThrow('LED_COUNT');
    },
  );

  test.each([0, -1, NaN, 1.5])('rejects invalid chunk size %i', (size) => {
    expect(() => connection(2, size)).toThrow('SERIAL_BUFFER_SIZE');
  });

  test('rejects a frame with the wrong length without writing', async () => {
    const { port, relay } = connection();
    await expect(relay.send_frame(new Uint8Array(5))).rejects.toThrow(
      'Expected 6 RGB bytes',
    );
    expect(port.writes).toHaveLength(0);
  });
});
