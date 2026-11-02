import { describe, expect, test } from '@jest/globals';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { linux_usb_product, macos_usb_products } from '../src/usb-products.js';

describe('USB product metadata', () => {
  test('walks Linux sysfs parents for both ACM and USB serial devices', async () => {
    const root = await mkdtemp(join(tmpdir(), 'relay-sysfs-'));
    try {
      const tty_root = join(root, 'class/tty');
      for (const [name, suffix, product] of [
        ['ttyACM0', '1-1:1.0', 'Christmas Lights Relay'],
        ['ttyUSB0', '1-1:1.0/ttyUSB0', 'Other Device'],
      ]) {
        const usb_device = join(root, 'devices', name!);
        const interface_path = join(usb_device, suffix!);
        const tty = join(tty_root, name!);
        await mkdir(interface_path, { recursive: true });
        await mkdir(tty, { recursive: true });
        await symlink(interface_path, join(tty, 'device'));
        await writeFile(join(usb_device, 'product'), product + '\n');
        expect(await linux_usb_product('/dev/' + name, tty_root)).toBe(product);
      }
      expect(await linux_usb_product('/dev/ttyS0', tty_root)).toBeUndefined();
      const plain = join(tty_root, 'ttyS1');
      await mkdir(plain, { recursive: true });
      await symlink(join(root, 'devices'), join(plain, 'device'));
      expect(await linux_usb_product('/dev/ttyS1', tty_root)).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('maps macOS dial-in and callout ports to USB products without leaking to siblings', () => {
    const registry = `+-o USB Hub <class IOUSBHostDevice>
  | {
  |   "USB Product Name" = "Hub"
  | }
  +-o relay <class IOUSBHostDevice>
  | | {
  | |   "USB Product Name" = "Christmas Lights Relay"
  | | }
  | +-o interface <class IOUSBHostInterface>
  |   +-o driver <class AppleUSBCDCACMData>
  |     +-o client <class IOSerialBSDClient>
  |         {
  |           "IOCalloutDevice" = "/dev/cu.usbmodem1"
  |           "IODialinDevice" = "/dev/tty.usbmodem1"
  |         }
  +-o other <class IOUSBHostDevice>
    | {
    |   "USB Product Name" = "Other Device"
    | }
    +-o client <class IOSerialBSDClient>
        {
          "IOCalloutDevice" = "/dev/cu.usbmodem2"
        }
+-o unknown <class IOUSBHostDevice>
  +-o client <class IOSerialBSDClient>
      {
        "IOCalloutDevice" = "/dev/cu.unknown"
      }
`;
    expect(macos_usb_products(registry)).toEqual(
      new Map([
        ['/dev/cu.usbmodem1', 'Christmas Lights Relay'],
        ['/dev/tty.usbmodem1', 'Christmas Lights Relay'],
        ['/dev/cu.usbmodem2', 'Other Device'],
      ]),
    );
    expect(macos_usb_products('')).toEqual(new Map());
  });
});
