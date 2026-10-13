# christmas-lights relay

Requires a 5V microcontroller

## Reproducible firmware

| Output                    | Board identifier                            |
| ------------------------- | ------------------------------------------- |
| `relay-firmware-leonardo` | `arduino:avr:leonardo`                      |
| `relay-firmware-promicro` | `SparkFun:avr:promicro:cpu=16MHzatmega32U4` |

Build on Linux, either directly or through the explicit devenv commands:

```sh
nix build .#relay-firmware-leonardo --out-link result-leonardo
nix build .#relay-firmware-promicro --out-link result-promicro
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

On Linux, the serial number can be matched by udev for a stable device path and by an NFD `NodeFeatureRule` for Kubernetes node discovery. The controller currently still requires `SERIAL_PORT`; firmware identity alone does not enable application discovery or configure Kubernetes.

## Manual upload

Build and choose the correct board output first. First identify the bootloader's serial port, then put the board into its existing bootloader (reset/double-reset connecting rst & gnd as appropriate)

```sh
# Leonardo
avrdude -p atmega32u4 -c avr109 -b 57600 \
  -P /dev/ttyACM0 -D -U flash:w:result-leonardo/relay.hex:i

# Pro Micro 5V / 16MHz
avrdude -p atmega32u4 -c avr109 -b 57600 \
  -P /dev/ttyACM0 -D -U flash:w:result-promicro/relay.hex:i
```

Replace `/dev/ttyACM0` with the actual bootloader port (macOS commonly uses `/dev/cu.usbmodem...`).
