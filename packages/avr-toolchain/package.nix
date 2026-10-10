{ runCommand, pkgsCross }:

let
  avr = pkgsCross.avr.buildPackages;
in
runCommand "arduino-avr-toolchain" { } ''
  mkdir -p "$out/bin"
  ln -s ${avr.gcc}/bin/* "$out/bin/"
  # The GCC wrapper omits the LTO-aware archive helpers.
  ln -s ${avr.gcc.cc}/bin/avr-gcc-ar "$out/bin/avr-gcc-ar"
  ln -s ${avr.gcc.cc}/bin/avr-gcc-ranlib "$out/bin/avr-gcc-ranlib"
  for tool in ${avr.binutils}/bin/*; do
    name=$(basename "$tool")
    if [ ! -e "$out/bin/$name" ]; then
      ln -s "$tool" "$out/bin/$name"
    fi
  done
''
