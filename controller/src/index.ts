import 'source-map-support/register.js';

import { LEDSService } from './leds.service.ts';
import { PatternService } from './pattern.service.ts';
import { fill_list } from './light-segments.ts';
import { SchedulerService } from './scheduler.service.ts';
import { debug, relay } from './config.ts';
import { find_relay_port } from './relay-port.ts';

async function main() {
  const segments = [
    fill_list(0, 35), // eave over garage door
    fill_list(36, 297), // eave over entry doors
    fill_list(298, 399), // eave over west face

    fill_list(439, 400), // gable north
    fill_list(479, 440), // gable south
  ];

  const serial_port = debug.no_io
    ? undefined
    : await find_relay_port(relay.serial_port.path, relay.serial_number);
  const leds_service = new LEDSService(serial_port);
  const pattern_service = new PatternService(leds_service, segments);
  const schedule_service = new SchedulerService(pattern_service);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
