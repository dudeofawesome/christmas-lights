import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { SerialPort } from 'serialport';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { find_relay_port } from '../src/relay-port.js';
import * as usb from '../src/usb-products.js';

function devices(
  entries: { path: string; serialNumber?: string; product?: string }[],
) {
  jest.spyOn(SerialPort, 'list').mockResolvedValue(
    entries.map((entry) => ({
      path: entry.path,
      serialNumber: entry.serialNumber,
      manufacturer: undefined,
      pnpId: undefined,
      locationId: undefined,
      vendorId: undefined,
      productId: undefined,
    })),
  );
  jest
    .spyOn(usb, 'get_usb_products')
    .mockResolvedValue(
      new Map(
        entries.map((entry) => [entry.path, entry.product || 'Other Device']),
      ),
    );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('relay port discovery', () => {
  test('discovers Linux ACM and USB serial relays using sysfs product metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'relay-discovery-'));
    try {
      const tty_root = join(root, 'class/tty');
      devices([
        { path: '/dev/ttyACM0', serialNumber: 'relay-one' },
        { path: '/dev/ttyUSB0', serialNumber: 'relay-two' },
        { path: '/dev/ttyS0' },
      ]);
      for (const [name, suffix] of [
        ['ttyACM0', '1-1:1.0'],
        ['ttyUSB0', '1-1:1.0/ttyUSB0'],
      ] as const) {
        const device = join(root, 'devices', name);
        const tty = join(tty_root, name);
        await mkdir(join(device, suffix), { recursive: true });
        await mkdir(tty, { recursive: true });
        await symlink(join(device, suffix), join(tty, 'device'));
        await writeFile(join(device, 'product'), 'Christmas Lights Relay\n');
      }
      jest.spyOn(usb, 'get_usb_products').mockImplementation(async (ports) => {
        const products = new Map<string, string>();
        for (const path of ports) {
          const product = await usb.linux_usb_product(path, tty_root);
          if (product) products.set(path, product);
        }
        return products;
      });
      await expect(find_relay_port(undefined, 'relay-one')).resolves.toBe(
        '/dev/ttyACM0',
      );
      await expect(find_relay_port(undefined, 'relay-two')).resolves.toBe(
        '/dev/ttyUSB0',
      );
      await expect(find_relay_port(undefined)).rejects.toThrow(
        'Multiple ports match relay USB product "Christmas Lights Relay"',
      );
      await rm(join(tty_root, 'ttyUSB0'), { recursive: true });
      await expect(find_relay_port(undefined)).resolves.toBe('/dev/ttyACM0');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('matches macOS dial-in paths returned by SerialPort.list to registry metadata', async () => {
    devices([
      {
        path: '/dev/tty.usbmodem2101',
        serialNumber: 'christmas-lights-001',
      },
    ]);
    jest.spyOn(usb, 'get_usb_products').mockResolvedValue(
      usb.macos_usb_products(`+-o relay <class IOUSBHostDevice>
  | {
  |   "USB Product Name" = "Christmas Lights Relay"
  | }
  +-o interface <class IOUSBHostInterface>
    +-o client <class IOSerialBSDClient>
        {
          "IOCalloutDevice" = "/dev/cu.usbmodem2101"
          "IODialinDevice" = "/dev/tty.usbmodem2101"
        }
`),
    );
    await expect(find_relay_port(undefined)).resolves.toBe(
      '/dev/tty.usbmodem2101',
    );
    await expect(
      find_relay_port(undefined, 'christmas-lights-001'),
    ).resolves.toBe('/dev/tty.usbmodem2101');
  });

  test('uses an explicit port without enumerating devices or USB metadata', async () => {
    const list = jest.spyOn(SerialPort, 'list');
    const products = jest.spyOn(usb, 'get_usb_products');
    await expect(find_relay_port('/dev/christmas-lights')).resolves.toBe(
      '/dev/christmas-lights',
    );
    expect(list).not.toHaveBeenCalled();
    expect(products).not.toHaveBeenCalled();
  });

  test.each([undefined, ''])(
    'discovers by product when SERIAL_PORT is %p',
    async (path) => {
      devices([
        { path: '/dev/ttyACM0', serialNumber: 'christmas-lights-001' },
        { path: '/dev/ttyS0' },
        {
          path: '/dev/ttyACM1',
          serialNumber: 'any-serial-number',
          product: 'Christmas Lights Relay',
        },
      ]);
      await expect(find_relay_port(path)).resolves.toBe('/dev/ttyACM1');
    },
  );

  test('accepts a relay even without a reported serial number', async () => {
    devices([{ path: '/dev/ttyACM0', product: 'Christmas Lights Relay' }]);
    await expect(find_relay_port(undefined, '')).resolves.toBe('/dev/ttyACM0');
  });

  test('uses an optional serial number to choose among relays', async () => {
    devices([
      {
        path: '/dev/cu.usbmodem1',
        serialNumber: 'christmas-lights-001',
        product: 'Christmas Lights Relay',
      },
      {
        path: '/dev/cu.usbmodem2',
        serialNumber: 'christmas-lights-002',
        product: 'Christmas Lights Relay',
      },
    ]);
    await expect(
      find_relay_port(undefined, 'christmas-lights-002'),
    ).resolves.toBe('/dev/cu.usbmodem2');
  });

  test('does not match a different product with the requested serial number', async () => {
    devices([{ path: '/dev/ttyACM0', serialNumber: 'christmas-lights-001' }]);
    await expect(
      find_relay_port(undefined, 'christmas-lights-001'),
    ).rejects.toThrow(
      'No relay with USB product "Christmas Lights Relay" and serial number "christmas-lights-001" found',
    );
  });

  test('does not fall back to another relay if the requested serial is missing', async () => {
    devices([
      {
        path: '/dev/ttyACM0',
        serialNumber: 'christmas-lights-002',
        product: 'Christmas Lights Relay',
      },
    ]);
    await expect(
      find_relay_port(undefined, 'christmas-lights-001'),
    ).rejects.toThrow(
      'No relay with USB product "Christmas Lights Relay" and serial number "christmas-lights-001" found',
    );
  });

  test('fails clearly when no relay is present', async () => {
    devices([]);
    await expect(find_relay_port(undefined)).rejects.toThrow(
      'No relay with USB product "Christmas Lights Relay" found',
    );
    expect(usb.get_usb_products).not.toHaveBeenCalled();
  });

  test('refuses to choose between relays without a serial filter', async () => {
    devices([
      {
        path: '/dev/ttyACM0',
        serialNumber: 'one',
        product: 'Christmas Lights Relay',
      },
      {
        path: '/dev/ttyACM1',
        serialNumber: 'two',
        product: 'Christmas Lights Relay',
      },
    ]);
    await expect(find_relay_port(undefined)).rejects.toThrow(
      'Multiple ports match relay USB product "Christmas Lights Relay": /dev/ttyACM0, /dev/ttyACM1',
    );
  });

  test('refuses duplicate identities even with a serial filter', async () => {
    devices([
      {
        path: '/dev/ttyACM0',
        serialNumber: 'same',
        product: 'Christmas Lights Relay',
      },
      {
        path: '/dev/ttyACM1',
        serialNumber: 'same',
        product: 'Christmas Lights Relay',
      },
    ]);
    await expect(find_relay_port(undefined, 'same')).rejects.toThrow(
      'Multiple ports match relay USB product "Christmas Lights Relay" and serial number "same"',
    );
  });

  test('propagates device enumeration failures', async () => {
    jest
      .spyOn(SerialPort, 'list')
      .mockRejectedValue(new Error('Cannot list ports'));
    await expect(find_relay_port(undefined)).rejects.toThrow(
      'Cannot list ports',
    );
  });

  test('propagates USB metadata failures', async () => {
    devices([{ path: '/dev/ttyACM0' }]);
    jest
      .spyOn(usb, 'get_usb_products')
      .mockRejectedValue(new Error('Cannot read USB metadata'));
    await expect(find_relay_port(undefined)).rejects.toThrow(
      'Cannot read USB metadata',
    );
  });
});
