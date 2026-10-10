{
  lib,
  stdenv,
  fetchzip,
}:

stdenv.mkDerivation {
  pname = "arduino-ctags";
  version = "5.8-arduino11";
  src = fetchzip {
    url = "https://github.com/arduino/ctags/archive/refs/tags/5.8-arduino11.tar.gz";
    hash = "sha256-RKuzrGQUC0N6WHkTXB3OjuKn0E49BpGAyApIJDGamDA=";
  };
  # This old source uses tentative definitions shared across translation units.
  env.NIX_CFLAGS_COMPILE = "-fcommon";
  env.CFLAGS = "-O2 -std=gnu89";
  postPatch = ''
    # Avoid redefining glibc's reserved __unused__ attribute token.
    sed -i 's/__unused__/CTAGS_UNUSED/g' *.c *.h
  '';
  meta = {
    description = "Arduino's ctags fork for sketch preprocessing";
    license = lib.licenses.gpl2Plus;
    platforms = lib.platforms.unix;
  };
}
