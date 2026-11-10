export const led = {
  count: parseInt(process.env.LED_COUNT!),
};

export const relay = {
  serial_port: {
    path: process.env.SERIAL_PORT || undefined,
    baud_rate: parseInt(process.env.BAUD_RATE ?? '1000000'),
    buffer_size: parseInt(process.env.SERIAL_BUFFER_SIZE ?? '100'),
  },
  serial_number: process.env.RELAY_SERIAL_NUMBER || undefined,
};

export const control = {
  location: {
    lat: parseFloat(process.env.LATITUDE!),
    lon: parseFloat(process.env.LONGITUDE!),
  },

  always_on: process.env.LED_ALWAYS_ON === 'true',
  sunset: {
    offset_hr: parseFloat(process.env.LED_ON_SUNSET_OFFSET_HR!),
    off_hr: parseFloat(process.env.LED_OFF_HR!),
  },
};

export const debug = {
  print: {
    timings: process.env.PRINT_TIMINGS === 'true',
    led_array: process.env.PRINT_LED_ARRAY === 'true',
    serial: process.env.PRINT_SERIAL === 'true',
  },
  no_io: process.env.NO_IO === 'true',
};
