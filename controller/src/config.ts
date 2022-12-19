export const LED_COUNT = parseInt(process.env.LED_COUNT!);
export const LED_TYPE = process.env.LED_TYPE;
export const LED_PIN = parseInt(process.env.LED_PIN!);
export const LOGIC_LEVEL_SHIFTER_PIN = parseInt(
  process.env.LOGIC_LEVEL_SHIFTER_PIN!,
);

export const PRINT_TIMINGS = process.env.PRINT_TIMINGS === 'true';
export const PRINT_LED_ARRAY = process.env.PRINT_LED_ARRAY === 'true';
export const PRINT_SERIAL = process.env.PRINT_SERIAL === 'true';

export const NO_GPIO = process.env.NO_GPIO === 'true';

export const SERIAL_PORT = process.env.SERIAL_PORT!;
export const BAUD_RATE = parseInt(process.env.BAUD_RATE!);
export const SERIAL_BUFFER_SIZE = parseInt(process.env.SERIAL_BUFFER_SIZE!);
