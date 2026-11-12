import { led } from '../config.ts';

export function gamma_correct(
  channel: number,
  gamma: number = led.gamma,
): number {
  const normalized = Math.max(0, Math.min(255, channel)) / 255;
  return Math.round(255 * normalized ** gamma);
}
