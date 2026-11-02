import 'source-map-support/register.js';

import { LEDSService } from './leds.service.js';
import { PatternService } from './pattern.service.js';
import { fill_list } from './light-segments.js';
import { SchedulerService } from './scheduler.service.js';
import { NO_IO, SERIAL_PORT, RELAY_SERIAL_NUMBER } from './config.js';
import { find_relay_port } from './relay-port.js';

async function main() {
  const segments = [
    fill_list(0, 35), // eave over garage door
    fill_list(36, 297), // eave over entry doors
    fill_list(298, 399), // eave over west face

    fill_list(439, 400), // gable north
    fill_list(479, 440), // gable south
  ];

  const serial_port = NO_IO
    ? undefined
    : await find_relay_port(SERIAL_PORT, RELAY_SERIAL_NUMBER);
  const leds_service = new LEDSService(serial_port);
  const pattern_service = new PatternService(leds_service, segments);
  const schedule_service = new SchedulerService(pattern_service);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
