{ pkgs, ... }:

{
  name = "christmas-lights";

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    npm.enable = true;
  };

  packages = with pkgs; [
    python3
    gnumake
    stdenv.cc
    avrdude
    (if stdenv.hostPlatform.isLinux then arduino-cli.pureGoPkg else arduino-cli)
    (callPackage ./packages/avr-toolchain/package.nix { })
    actionlint
    nixfmt
  ];

  env = {
    npm_config_build_from_source = "true";
    npm_config_nodedir = "${pkgs.nodejs_24}";
    CC = "${pkgs.stdenv.cc}/bin/cc";
    CXX = "${pkgs.stdenv.cc}/bin/c++";
  };

  scripts = {
    controller-install.exec = ''
      cd controller
      npm ci
    '';
    controller-dev.exec = ''
      cd controller
      exec npm run watch
    '';
    controller-test.exec = ''
      cd controller
      export NO_IO=true LED_COUNT=500 LED_ALWAYS_ON=false
      export LED_ON_SUNSET_OFFSET_HR=-0.5 LED_OFF_HR=2
      export LATITUDE=34.048050 LONGITUDE=-118.254196 TZ=America/Los_Angeles
      export BAUD_RATE=1000000 SERIAL_BUFFER_SIZE=100
      exec npm run test:unit
    '';
    firmware-leonardo.exec = ''
      exec nix build .#relay-firmware-leonardo "$@"
    '';
    firmware-promicro.exec = ''
      exec nix build .#relay-firmware-promicro "$@"
    '';
  };
}
