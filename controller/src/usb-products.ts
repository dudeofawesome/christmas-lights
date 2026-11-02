import { execFile } from 'child_process';
import { readFile, realpath } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { promisify } from 'util';

const exec_file = promisify(execFile);

function is_missing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

export async function linux_usb_product(
  port: string,
  tty_root = '/sys/class/tty',
): Promise<string | undefined> {
  let device: string;
  try {
    device = await realpath(join(tty_root, basename(port), 'device'));
  } catch (error) {
    if (is_missing(error)) return undefined;
    throw error;
  }
  // CDC ACM and USB-to-serial drivers place the tty at different depths.
  while (device !== dirname(device)) {
    try {
      return (await readFile(join(device, 'product'), 'utf8')).trim();
    } catch (error) {
      if (!is_missing(error)) throw error;
    }
    device = dirname(device);
  }
  return undefined;
}

export function macos_usb_products(registry: string): Map<string, string> {
  const products = new Map<string, string>();
  const ancestors: { indent: number; product?: string }[] = [];
  // ioreg prints each node's properties before its children. Carry the USB
  // product down to the IOSerialBSDClient. SerialPort.list() reports the dial-in
  // path on macOS; also record the callout path used for explicit connections.
  for (const line of registry.split('\n')) {
    const node = /^[ |]*\+-o /.exec(line);
    if (node) {
      const indent = line.indexOf('+-o');
      while (
        ancestors.length &&
        ancestors[ancestors.length - 1]!.indent >= indent
      )
        ancestors.pop();
      ancestors.push({
        indent,
        product: ancestors[ancestors.length - 1]?.product,
      });
      continue;
    }
    const property =
      /^[ |]*"(USB Product Name|IOCalloutDevice|IODialinDevice)" = "([^"]*)"\s*$/.exec(
        line,
      );
    const current = ancestors[ancestors.length - 1];
    if (!property || !current) continue;
    if (property[1] === 'USB Product Name') current.product = property[2];
    else if (current.product) products.set(property[2]!, current.product);
  }
  return products;
}

export async function get_usb_products(
  ports: string[],
): Promise<Map<string, string>> {
  if (process.platform === 'linux') {
    const products = new Map<string, string>();
    await Promise.all(
      ports.map(async (port) => {
        const product = await linux_usb_product(port);
        if (product) products.set(port, product);
      }),
    );
    return products;
  }
  if (process.platform === 'darwin') {
    const { stdout } = await exec_file(
      '/usr/sbin/ioreg',
      ['-l', '-w', '0', '-r', '-c', 'IOUSBHostDevice'],
      { timeout: 10000, maxBuffer: 16 * 1024 * 1024 },
    );
    return macos_usb_products(stdout);
  }
  throw new Error(
    'USB product discovery is supported on Linux and macOS. Set SERIAL_PORT explicitly on this platform.',
  );
}
