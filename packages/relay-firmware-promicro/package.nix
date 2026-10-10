{ callPackage }:

callPackage ../relay-firmware/package.nix {
  pname = "relay-firmware-promicro";
  fqbn = "SparkFun:avr:promicro:cpu=16MHzatmega32U4";
}
