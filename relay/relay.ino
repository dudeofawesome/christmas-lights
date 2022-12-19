// NEOPIXEL BEST PRACTICES for most reliable operation:
// - Add 1000 uF CAPACITOR between NeoPixel strip's + and - connections.
// - MINIMIZE WIRING LENGTH between microcontroller board and first pixel.
// - NeoPixel strip's DATA-IN should pass through a 300-500 OHM RESISTOR.
// - AVOID connecting NeoPixels on a LIVE CIRCUIT. If you must, ALWAYS
//   connect GROUND (-) first, then +, then data.
// - When using a 3.3V microcontroller with a 5V-powered NeoPixel strip,
//   a LOGIC-LEVEL CONVERTER on the data line is STRONGLY RECOMMENDED.
// (Skipping these may work OK on your workbench but can fail in the field)

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#ifdef __AVR__
#include <avr/power.h>  // Required for 16 MHz Adafruit Trinket
#endif

// Which pin on the Arduino is connected to the NeoPixels?
// On a Trinket or Gemma we suggest changing this to 1:
#if defined(ARDUINO_AVR_LEONARDO) || defined(ARDUINO_AVR_PROMICRO)
#define LED_PIN 6
#else
#error Unknown hardware platform
#endif

// How many NeoPixels are attached to the Arduino?
#define LED_COUNT 500
#define FRAME_DELIMITER 0x01
#define SUBFRAME_DELIMITER 0x03
// #define FRAME_DELIMITER (int)'z'
// #define SUBFRAME_DELIMITER (int)'y'

// Declare our NeoPixel strip object:
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_RGB + NEO_KHZ800);
// Argument 1 = Number of pixels in NeoPixel strip
// Argument 2 = Arduino pin number (most are valid)
// Argument 3 = Pixel type flags, add together as needed:
//   NEO_KHZ800  800 KHz bitstream (most NeoPixel products w/WS2812 LEDs)
//   NEO_KHZ400  400 KHz (classic 'v1' (not v2) FLORA pixels, WS2811 drivers)
//   NEO_GRB     Pixels are wired for GRB bitstream (most NeoPixel products)
//   NEO_RGB     Pixels are wired for RGB bitstream (v1 FLORA pixels, not v2)
//   NEO_RGBW    Pixels are wired for RGBW bitstream (NeoPixel RGBW products)

void setup() {
  Serial.begin(1000000);
  Serial.setTimeout(1000 / 30);
  // wait for serial to be ready
  while (!Serial) {}

  strip.begin();  // INITIALIZE NeoPixel strip object (REQUIRED)
  strip.show();
}

// x LEDs at 3 bytes per LED
const uint16_t BUFFER_SIZE = LED_COUNT * 3;
uint8_t* buffer = strip.getPixels();

void loop() {
  uint16_t cursor = 0;
  while (cursor < BUFFER_SIZE) {
    int16_t byte = Serial.read();

    if (byte == FRAME_DELIMITER) {
      break;
    } else if (byte == SUBFRAME_DELIMITER) {
      // clear serial buffer
      while (Serial.read() != -1) {};
      Serial.print(SUBFRAME_DELIMITER);
    } else if (byte != -1) {
      buffer[cursor] = byte;
      cursor++;
    }
  }
  Serial.print(SUBFRAME_DELIMITER);

  Serial.print("Frame received, including ");
  Serial.print(cursor);
  Serial.print(" bytes (out of an expected ");
  Serial.print(BUFFER_SIZE);
  Serial.println(").");

  // only display the frame if we received all expected bytes
  // TODO: we should probably also only display the frame if we got a FRAME_DELIMITER
  if (cursor == BUFFER_SIZE) {
    for (uint16_t i = 0; i < LED_COUNT; i++) {
      strip.setPixelColor(
        i,
        buffer[i * 3 + 0],
        buffer[i * 3 + 1],
        buffer[i * 3 + 2]);
    }
    strip.show();
  }
}
