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
#include "usb-identity.h"

RelayUSBIdentity relayUsbIdentity;
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

// Reserve SRAM for the USB stack, globals, and stack on the ATmega32U4.
const uint16_t MAX_LED_COUNT = 600;
const uint8_t READY = 0x10;
const uint8_t CHUNK_RECEIVED = 0x11;
const uint8_t FRAME_DISPLAYED = 0x12;
const uint8_t ERROR = 0x7f;
const unsigned long RECEIVE_TIMEOUT_MS = 2000;

// Declare our NeoPixel strip object:
Adafruit_NeoPixel strip(0, LED_PIN, NEO_RGB + NEO_KHZ800);
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
  strip.begin();  // INITIALIZE NeoPixel strip object (REQUIRED)
}

// Header: 'C', 'L', version 1, LED count (uint16 big-endian), chunk size.
uint8_t header[6];
uint8_t header_cursor = 0;
uint16_t frame_size = 0;
uint16_t frame_cursor = 0;
uint8_t chunk_size = 0;
uint8_t chunk_cursor = 0;
unsigned long last_byte_at = 0;

void release_empty_usb_receive_packet() {
#if defined(__AVR_ATmega32U4__) && defined(CDC_RX)
  // A host may send an empty packet after a full USB transfer. The AVR
  // core's Serial.available() cannot distinguish it from an idle endpoint.
  const uint8_t interrupt_state = SREG;
  cli();
  const uint8_t endpoint = UENUM;
  UENUM = CDC_RX;
  if ((UEINTX & _BV(RXOUTI)) && UEBCLX == 0) {
    // Use the same flag mask as ReleaseRX() in the Arduino AVR core.
    UEINTX = 0x6B;
  }
  UENUM = endpoint;
  SREG = interrupt_state;
#endif
}

void reset_session() {
  header_cursor = 0;
  frame_size = 0;
  frame_cursor = 0;
  chunk_cursor = 0;
}

void receive_header(uint8_t byte) {
  const uint8_t prefix[] = {0x43, 0x4c, 1};
  if (header_cursor < sizeof(prefix) && byte != prefix[header_cursor]) {
    header_cursor = byte == prefix[0] ? 1 : 0;
    return;
  }
  header[header_cursor++] = byte;
  if (header_cursor != sizeof(header)) return;
  header_cursor = 0;

  const uint16_t led_count = (uint16_t(header[3]) << 8) | header[4];
  chunk_size = header[5];
  if (led_count == 0 || led_count > MAX_LED_COUNT || chunk_size > 64) {
    Serial.write(ERROR);
    return;
  }

  strip.updateLength(led_count);
  if (strip.numPixels() != led_count || strip.getPixels() == nullptr) {
    Serial.write(ERROR);
    return;
  }
  frame_size = led_count * 3;
  strip.show();  // Clear the configured strip before acknowledging setup.
  Serial.write(READY);
}

void loop() {
  release_empty_usb_receive_packet();
  // The AVR core's Serial bool conversion sleeps 10 ms on every call.
  if (!Serial.dtr() && !Serial.rts()) {
    reset_session();
    return;
  }
  if ((header_cursor != 0 || frame_cursor != 0) &&
      millis() - last_byte_at >= RECEIVE_TIMEOUT_MS) {
    reset_session();
    Serial.write(ERROR);
  }

  while (Serial.available()) {
    const uint8_t byte = Serial.read();
    last_byte_at = millis();
    if (frame_size == 0) {
      receive_header(byte);
      continue;
    }

    // NEO_RGB uses the same byte order as the controller's RGB payload.
    strip.getPixels()[frame_cursor++] = byte;
    if (frame_cursor == frame_size) {
      strip.show();
      frame_cursor = 0;
      chunk_cursor = 0;
      Serial.write(FRAME_DISPLAYED);
    } else if (chunk_size != 0 && ++chunk_cursor == chunk_size) {
      chunk_cursor = 0;
      Serial.write(CHUNK_RECEIVED);
    }
  }
}
