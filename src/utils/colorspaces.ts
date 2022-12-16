export function rgb_to_int(red: number, green: number, blue: number): number {
  return ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
}

export function int_to_rgb(int: number): [number, number, number] {
  return [(int & 0xff0000) >> 16, (int & 0x00ff00) >> 8, int & 0x0000ff];
}
