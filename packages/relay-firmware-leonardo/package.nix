{ callPackage }:

callPackage ../relay-firmware/package.nix {
  pname = "relay-firmware-leonardo";
  fqbn = "arduino:avr:leonardo";
}
