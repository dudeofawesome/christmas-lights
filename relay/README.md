# christmas-lights relay

Requires a 5V microcontroller

## Serial protocol

The controller and relay must both support protocol version 1. The serial baud rate is 1,000,000. On opening a connection, the controller sends a six-byte header:

| Bytes | Value |
| ----- | ----- |
| 0–1 | `43 4c` hex (`CL`) |
| 2 | Version: `01` |
| 3–4 | LED count, unsigned 16-bit big-endian |
| 5 | `0` for whole frames, or a chunk size of 1–64 bytes |

The relay allocates an RGB buffer for the requested count, clears the strip, and replies with the single byte `10` hex when ready. The AVR firmware accepts 1–600 LEDs to leave SRAM for USB and the stack; invalid counts, invalid chunk sizes, and allocation failures receive `7f` hex. Change the controller's `LED_COUNT` to select the strip length without rebuilding firmware within that limit.

Each frame is exactly `LED_COUNT * 3` raw bytes in RGB order, with all channel values from 0 through 255 available. By default the controller sends the whole frame in one write and waits for the relay to display it and reply with `12` hex. If older firmware rejects whole-frame mode with `7f`, the controller retries setup with 64-byte chunks. Chunked transfers require a reply of `11` hex after each intermediate chunk and `12` hex after the frame has been displayed. The final chunk may be shorter than the chunk size. Acknowledgments are binary bytes. Frames receive gamma correction in the controller before transmission.

A partial header or frame times out after two seconds without data. The relay discards the partial transfer, replies with `7f` hex, and waits for a new header. Disconnecting also resets the session. Incomplete frames are never displayed; the last displayed frame stays on the strip until a complete frame or new configuration arrives. The controller exits on an unexpected acknowledgment, disconnect, serial error, or three-second acknowledgment timeout; restart it to establish a new session.

Run host-side parser checks from the repository root with `devenv shell --quiet -- python3 scripts/test-relay.py`. These exercise the sketch using serial and pixel-buffer stubs; use firmware builds and hardware testing to verify AVR memory use and USB/LED timing.

## Reproducible firmware

| Output                    | Board identifier                            |
| ------------------------- | ------------------------------------------- |
| `relay-firmware-leonardo` | `arduino:avr:leonardo`                      |
| `relay-firmware-promicro` | `SparkFun:avr:promicro:cpu=16MHzatmega32U4` |

Build on Linux, either directly or through the explicit devenv commands:

```sh
nix build .#relay-firmware-leonardo --out-link result/leonardo
nix build .#relay-firmware-promicro --out-link result/promicro
```

On macOS, use a configured Linux builder and select a Linux output:

```sh
nix build .#packages.aarch64-linux.relay-firmware-promicro \
  --out-link result-promicro
```

Each result contains `relay.hex` (firmware only), `relay.elf`, `size.txt`, and `build.json`.

## USB identity

Both reproducible firmware builds advertise the USB product `Christmas Lights Relay` and serial number `christmas-lights-001`. The board's vendor/product IDs and manufacturer remain unchanged. The identity is recorded in `build.json` and applies while the relay firmware runs; the existing bootloader keeps its own USB identity.

The sketch registers a `PluggableUSBModule` from `usb-identity.h` before USB attaches, supplying product and serial string descriptors without patching the Arduino core. This also works when building the sketch in the Arduino IDE. Edit `RELAY_USB_PRODUCT` and `RELAY_USB_SERIAL` in that header to change the identity; assign a different serial number to each additional relay. Use 1-126 printable ASCII characters without quotes or backslashes. The Nix build reads these values for verification and `build.json`.

The controller discovers the relay by USB product name when `SERIAL_PORT` is unset, with an optional serial-number filter; see [controller configuration](../controller/README.md#configuration). On Linux, the serial number can also be matched by udev for a stable device path and by an NFD `NodeFeatureRule` for Kubernetes node discovery.

## Manual upload

Build and choose the correct board output first. First identify the bootloader's serial port, then put the board into its existing bootloader (reset/double-reset connecting rst & gnd as appropriate)

```sh
# Leonardo
avrdude -p atmega32u4 -c avr109 -b 57600 \
  -P /dev/ttyACM0 -D -U flash:w:result/leonardo/relay.hex:i

# Pro Micro 5V / 16MHz
avrdude -p atmega32u4 -c avr109 -b 57600 \
  -P /dev/ttyACM0 -D -U flash:w:result/promicro/relay.hex:i
```

Replace `/dev/ttyACM0` with the actual bootloader port (macOS commonly uses `/dev/cu.usbmodem...`).
