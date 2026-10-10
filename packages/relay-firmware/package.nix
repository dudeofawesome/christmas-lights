{
  lib,
  stdenvNoCC,
  fetchzip,
  callPackage,
  arduino-cli,
  pkgsCross,
  python3,
  pname,
  fqbn,
}:

let
  cli = arduino-cli.pureGoPkg;
  arduino-ctags = callPackage ../arduino-ctags/package.nix { };
  avr = pkgsCross.avr.buildPackages;
  prefix = avr.gcc.targetPrefix;
  toolchain = callPackage ../avr-toolchain/package.nix { };
  arduinoCore = fetchzip {
    url = "https://github.com/arduino/ArduinoCore-avr/archive/refs/tags/1.8.6.tar.gz";
    hash = "sha256-wfqGrdDDGdxMiOc06BfOFzvaF0VpVPz+lmjPTkTfvdw=";
  };
  sparkfunBoards = fetchzip {
    url = "https://github.com/sparkfun/Arduino_Boards/archive/b2ccf64208ea990ce764fd60b109931296ad1350.tar.gz";
    hash = "sha256-avoVrOQxMs0On7xsrcBF/fKiZ/4VvFj8W46+egIqBFw=";
  };
  neopixel = fetchzip {
    url = "https://github.com/adafruit/Adafruit_NeoPixel/archive/refs/tags/1.15.2.tar.gz";
    hash = "sha256-xQLPZuIGSBrwO6Axjuu3u/x6idMLAVQuh2rjCJ2Mnvs=";
  };
in
stdenvNoCC.mkDerivation {
  inherit pname;
  version = "0.0.1";
  src = lib.fileset.toSource {
    root = ../../relay;
    fileset = ../../relay/relay.ino;
  };
  nativeBuildInputs = [
    cli
    avr.gcc
    avr.binutils
    arduino-ctags
    python3
  ];
  dontConfigure = true;
  # These are AVR artifacts, not host executables; retain ELF debug information.
  dontFixup = true;
  hardeningDisable = [ "all" ];
  buildPhase = ''
    runHook preBuild
    mkdir -p sketch/relay user/hardware/arduino/avr user/hardware/SparkFun/avr
    mkdir -p data downloads build
    # Preseed empty indexes: all board/library sources are supplied explicitly.
    printf '%s\n' '{"packages":[]}' > data/package_index.json
    printf '%s\n' '{"libraries":[]}' > data/library_index.json
    cp relay.ino sketch/relay/
    cp -r ${arduinoCore}/. user/hardware/arduino/avr/
    cp -r ${sparkfunBoards}/sparkfun/avr/. user/hardware/SparkFun/avr/
    chmod -R u+w user
    # No device-discovery tools are installed: compilation does not need attached hardware.
    cat > arduino-cli.yaml <<EOF
    directories:
      data: $PWD/data
      downloads: $PWD/downloads
      user: $PWD/user
    library:
      enable_unsafe_install: false
    EOF
    arduino-cli compile \
      --config-file "$PWD/arduino-cli.yaml" \
      --fqbn '${fqbn}' \
      --library ${neopixel} \
      --build-path "$PWD/build" \
      --build-property 'compiler.path=${toolchain}/bin/' \
      --build-property 'compiler.c.cmd=${prefix}gcc' \
      --build-property 'compiler.cpp.cmd=${prefix}g++' \
      --build-property 'compiler.cpp.extra_flags=-fno-use-cxa-atexit' \
      --build-property 'compiler.c.elf.cmd=${prefix}gcc' \
      --build-property 'compiler.ar.cmd=${prefix}gcc-ar' \
      --build-property 'compiler.objcopy.cmd=${prefix}objcopy' \
      --build-property 'compiler.elf2hex.cmd=${prefix}objcopy' \
      --build-property 'compiler.size.cmd=${prefix}size' \
      --build-property 'runtime.tools.ctags.path=${arduino-ctags}/bin' \
      sketch/relay
    runHook postBuild
  '';
  doCheck = true;
  checkPhase = ''
    runHook preCheck
    test -s build/relay.ino.hex
    test -s build/relay.ino.elf
    ${avr.binutils}/bin/${prefix}size -A build/relay.ino.elf > size.txt
    python3 - <<'PY'
    import pathlib
    sections = {}
    for line in pathlib.Path('size.txt').read_text().splitlines():
        fields = line.split()
        if fields and fields[0].startswith('.'):
            sections[fields[0]] = int(fields[1])
    flash = sum(sections.get(s, 0) for s in ['.text', '.data', '.bootloader'])
    ram = sum(sections.get(s, 0) for s in ['.data', '.bss', '.noinit'])
    assert flash <= 28672, f'Flash overflow: {flash}/28672 bytes'
    assert ram <= 2560, f'RAM overflow: {ram}/2560 bytes'
    print(f'Flash: {flash}/28672 bytes; static RAM: {ram}/2560 bytes')
    PY
    runHook postCheck
  '';
  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp build/relay.ino.hex "$out/relay.hex"
    cp build/relay.ino.elf "$out/relay.elf"
    cp size.txt "$out/size.txt"
    cat > "$out/build.json" <<EOF
    ${builtins.toJSON {
      inherit fqbn;
      mcu = "atmega32u4";
      clockHz = 16000000;
      arduinoCoreVersion = "1.8.6";
      sparkfunRevision = "b2ccf64208ea990ce764fd60b109931296ad1350";
      neopixelVersion = "1.15.2";
      arduinoCliVersion = cli.version;
      avrGccVersion = avr.gcc.version;
      includesBootloader = false;
    }}
    EOF
    runHook postInstall
  '';
  meta = {
    description = "Christmas lights relay firmware (${fqbn})";
    platforms = lib.platforms.linux;
  };
}
