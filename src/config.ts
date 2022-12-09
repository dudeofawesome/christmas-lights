export const LED_COUNT = parseInt(process.env.LED_COUNT!);
export const LED_TYPE = process.env.LED_TYPE;
export const LED_PIN = parseInt(process.env.LED_PIN!);
export const LOGIC_LEVEL_SHIFTER_PIN = parseInt(
  process.env.LOGIC_LEVEL_SHIFTER_PIN!,
);

export const PRINT_LED_ARRAY = process.env.PRINT_LED_ARRAY === 'true';
export const NO_GPIO = process.env.NO_GPIO === 'true';
