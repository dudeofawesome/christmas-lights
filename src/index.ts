import 'source-map-support/register.js';

import { LEDSService } from './leds.service.js';
import { LogicLevelShifterService } from './logic-level-shifter.service.js';
import { PatternService } from './pattern.service.js';
import { fill_list } from './light-segments.js';

async function main() {
  const segments = [
    fill_list(0, 33), // eave over garage door
    fill_list(34, 297), // eave over entry doors
    fill_list(298, 400), // eave over west face

    fill_list(440, 401), // gable north
    fill_list(480, 441), // gable south
  ];

  const logic_level_shifter_service = new LogicLevelShifterService();
  const leds_service = new LEDSService();
  const pattern_service = new PatternService(leds_service, segments);
}

main();
