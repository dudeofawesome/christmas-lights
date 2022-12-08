import rpio from 'rpio';

export class LogicLevelShifterService {
  private pin = parseInt(process.env.LOGIC_LEVEL_SHIFTER_PIN!);

  constructor() {
    rpio.init({
      gpiomem: true,
      mapping: 'gpio',
    });
    rpio.open(this.pin, rpio.OUTPUT);
    rpio.write(this.pin, rpio.HIGH);

    process.on('SIGINT', () => {
      rpio.write(this.pin, rpio.LOW);
    });
  }
}
