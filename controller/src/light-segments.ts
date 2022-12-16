export function fill_list(start: number, stop: number): number[] {
  return Array(Math.abs(stop - start) + 1)
    .fill(null)
    .map((_, i) => (start < stop ? start + i : start - i));
}
