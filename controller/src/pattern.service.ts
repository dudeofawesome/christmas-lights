import type { LEDSService } from './leds.service.ts';
import type { Pattern } from './patterns/pattern.interface.ts';
import { CandyCanePattern } from './patterns/candy-cane.ts';
import { GingerbreadHousePattern } from './patterns/gingerbread-house.ts';
import { OffPattern } from './patterns/off.ts';
import { TraditionalMulticolorPattern } from './patterns/traditional-multicolor.ts';
import { WarmWhitePattern } from './patterns/warm-white.ts';

export class PatternService {
  #patterns: Map<string, Pattern> = new Map();
  #active_pattern?: Pattern;
  #active_pattern_name?: string;

  constructor(leds_service: LEDSService, segments: number[][]) {
    this.#patterns.set('off', new OffPattern(leds_service));
    this.#patterns.set(
      'candy-cane',
      new CandyCanePattern(leds_service, segments),
    );
    this.#patterns.set(
      'gingerbread-house',
      new GingerbreadHousePattern(leds_service, segments),
    );
    this.#patterns.set(
      'traditional-multicolor',
      new TraditionalMulticolorPattern(leds_service, segments),
    );
    this.#patterns.set(
      'warm-white',
      new WarmWhitePattern(leds_service, segments),
    );

    this.active_pattern = 'off';

    setImmediate(this.loop.bind(this), performance.now());
  }

  loop(time: number): NodeJS.Immediate {
    this.#active_pattern?.loop(time);

    return setImmediate(this.loop.bind(this), performance.now());
  }

  get active_pattern(): string | undefined {
    return this.#active_pattern_name;
  }
  set active_pattern(pattern_name: string | undefined) {
    this.#active_pattern = this.#patterns.get(pattern_name!);
    this.#active_pattern_name = pattern_name;
  }

  get patterns(): string[] {
    return Array.from(this.#patterns.keys());
  }
}
