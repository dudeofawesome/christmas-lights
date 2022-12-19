export const LED_COUNT = parseInt(process.env.LED_COUNT!);
export const LED_ON_SUNSET_OFFSET_HR = parseFloat(
  process.env.LED_ON_SUNSET_OFFSET_HR!,
);
export const LED_OFF_HR = parseFloat(process.env.LED_OFF_HR!);
export const LATITUDE = parseFloat(process.env.LATITUDE!);
export const LONGITUDE = parseFloat(process.env.LONGITUDE!);

export const PRINT_TIMINGS = process.env.PRINT_TIMINGS === 'true';
export const PRINT_LED_ARRAY = process.env.PRINT_LED_ARRAY === 'true';
export const PRINT_SERIAL = process.env.PRINT_SERIAL === 'true';

export const NO_IO = process.env.NO_IO === 'true';

export const SERIAL_PORT = process.env.SERIAL_PORT!;
export const BAUD_RATE = parseInt(process.env.BAUD_RATE!);
export const SERIAL_BUFFER_SIZE = parseInt(process.env.SERIAL_BUFFER_SIZE!);
