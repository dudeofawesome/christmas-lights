#pragma once

#include <Arduino.h>
#include <PluggableUSB.h>

#define RELAY_USB_PRODUCT "Christmas Lights Relay"
#define RELAY_USB_SERIAL "christmas-lights-001"

// Register before main() attaches USB, without adding interfaces or endpoints.
class RelayUSBIdentity : public PluggableUSBModule {
public:
  RelayUSBIdentity() : PluggableUSBModule(0, 0, nullptr) {
    PluggableUSB().plug(this);
  }

protected:
  bool setup(USBSetup&) override { return false; }
  int getInterface(uint8_t*) override { return 0; }
  uint8_t getShortName(char*) override { return 0; }

  int getDescriptor(USBSetup& request) override {
    if (request.wValueH != USB_STRING_DESCRIPTOR_TYPE) return 0;

    static const char product[] PROGMEM = RELAY_USB_PRODUCT;
    static const char serial[] PROGMEM = RELAY_USB_SERIAL;
    const char* text;
    uint8_t length;
    if (request.wValueL == IPRODUCT) {
      text = product;
      length = sizeof(product) - 1;
    } else if (request.wValueL == ISERIAL) {
      text = serial;
      length = sizeof(serial) - 1;
    } else {
      return 0;
    }

    // USB string descriptors contain a two-byte header and UTF-16LE text.
    const uint8_t header[] = {
      static_cast<uint8_t>(2 + 2 * length), USB_STRING_DESCRIPTOR_TYPE
    };
    if (USB_SendControl(0, header, sizeof(header)) < 0) return -1;
    for (uint8_t i = 0; i < length; ++i) {
      const uint8_t character[] = { pgm_read_byte(text + i), 0 };
      if (USB_SendControl(0, character, sizeof(character)) < 0) return -1;
    }
    return header[0];
  }
};

static_assert(sizeof(RELAY_USB_PRODUCT) > 1 && sizeof(RELAY_USB_PRODUCT) <= 127,
              "USB product must contain 1-126 ASCII characters");
static_assert(sizeof(RELAY_USB_SERIAL) > 1 && sizeof(RELAY_USB_SERIAL) <= 127,
              "USB serial must contain 1-126 ASCII characters");
