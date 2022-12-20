# Christmas Lights

## Installation

1. Setup systemd unit

```sh
$ sudo systemctl enable "$PWD/controller/christmas-lights.service"
$ sudo systemctl start christmas-lights.service
```

-   https://github.com/beyondscreen/node-rpi-ws281x-native#known-issues
-   https://github.com/jperkin/node-rpio#important-system-requirements
