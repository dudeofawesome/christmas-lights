import 'source-map-support/register.js';

import { LEDSService } from './leds.service.js';
import { LogicLevelShifterService } from './logic-level-shifter.service.js';
import { PatternService } from './pattern.service.js';
import { fill_list } from './light-segments.js';

async function main() {
  const segments = [
    fill_list(0, 35), // eave over garage door
    fill_list(36, 297), // eave over entry doors
    fill_list(298, 399), // eave over west face

    fill_list(439, 400), // gable north
    fill_list(479, 440), // gable south
  ];

  const logic_level_shifter_service = new LogicLevelShifterService();
  const leds_service = new LEDSService();
  const pattern_service = new PatternService(leds_service, segments);
}

main();
