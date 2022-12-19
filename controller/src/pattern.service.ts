import type { LEDSService } from './leds.service.js';
import type { Pattern } from './patterns/pattern.interface.js';
import { CandyCanePattern } from './patterns/candy-cane.js';
import { GingerbreadHousePattern } from './patterns/gingerbread-house.js';

export class PatternService {
  #patterns: Map<string, Pattern> = new Map();
  #active_pattern?: Pattern;

  constructor(leds_service: LEDSService, segments: number[][]) {
    this.#patterns.set(
      'candy-cane',
      new CandyCanePattern(leds_service, segments),
    );
    this.#patterns.set(
      'gingerbread-house',
      new GingerbreadHousePattern(leds_service, segments),
    );

    this.#active_pattern = this.#patterns.get('candy-cane');

    setImmediate(this.loop.bind(this), performance.now());
  }

  loop(time: number): NodeJS.Immediate {
    this.#active_pattern?.loop(time);

    return setImmediate(this.loop.bind(this), performance.now());
  }

  get active_pattern(): string {
    return Array.from(this.#patterns.entries()).find(
      ([name, pattern]) => pattern === this.#active_pattern,
    )?.[0]!;
  }
  set active_pattern(pattern_name: string) {
    this.#active_pattern = this.#patterns.get(pattern_name);
  }
}
