import ws281x from 'rpi-ws281x-native';

export class LEDSService {
  channel: any;
  private last_timestamp: number = performance.now();

  constructor() {
    this.channel = ws281x(parseInt(process.env.LED_COUNT!), {
      stripType: process.env.LED_TYPE! as any,
      gpio: parseInt(process.env.LED_PIN!),
    });

    process.on('SIGINT', () => {
      ws281x.reset();
      ws281x.finalize();
    });

    setImmediate(this.loop.bind(this), performance.now());
  }

  private loop(timestamp: number): NodeJS.Immediate {
    const delta = timestamp - this.last_timestamp;
    this.last_timestamp = timestamp;
    console.info(`${delta} ms`);

    ws281x.render();

    return setImmediate(this.loop.bind(this), performance.now());
  }
}
