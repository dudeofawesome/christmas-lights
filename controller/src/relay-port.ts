import { SerialPort } from 'serialport';
import { get_usb_products } from './usb-products.js';

const RELAY_PRODUCT = 'Christmas Lights Relay';

export async function find_relay_port(
  serial_port: string | undefined,
  serial_number?: string,
): Promise<string> {
  if (serial_port) return serial_port;

  const ports = await SerialPort.list();
  const products = ports.length
    ? await get_usb_products(ports.map((port) => port.path))
    : new Map<string, string>();
  const matches = ports.filter(
    (port) =>
      products.get(port.path) === RELAY_PRODUCT &&
      (!serial_number || port.serialNumber === serial_number),
  );
  const identity =
    `USB product "${RELAY_PRODUCT}"` +
    (serial_number ? ` and serial number "${serial_number}"` : '');
  if (matches.length === 0) {
    throw new Error(
      `No relay with ${identity} found. ` +
        'Connect the relay with identifying firmware, check RELAY_SERIAL_NUMBER ' +
        'if set, or set SERIAL_PORT explicitly when USB metadata is unavailable.',
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple ports match relay ${identity}: ` +
        `${matches.map((port) => port.path).join(', ')}. ` +
        'Set RELAY_SERIAL_NUMBER to a unique relay serial number or set SERIAL_PORT explicitly.',
    );
  }
  return matches[0]!.path;
}
