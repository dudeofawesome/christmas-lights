export function rgb_to_int(red: number, green: number, blue: number): number {
  return ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
}
