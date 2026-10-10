{
  lib,
  buildNpmPackage,
  nodejs_24,
  nodejs-slim_24,
  python3,
  makeWrapper,
}:

buildNpmPackage {
  pname = "christmas-lights";
  version = "0.0.1";
  nodejs = nodejs_24;
  src = lib.fileset.toSource {
    root = ../../controller;
    fileset = lib.fileset.unions [
      ../../controller/package.json
      ../../controller/package-lock.json
      ../../controller/tsconfig.json
      ../../controller/jest.config.ts
      ../../controller/src
      ../../controller/test
    ];
  };
  npmDepsHash = "sha256-U/raQgz3l6FsMqYS6IeqEOZed8KSNHTmi8ZyPSgiICI=";
  nativeBuildInputs = [
    python3
    makeWrapper
  ];
  env.npm_config_build_from_source = "true";
  # bindings-cpp's install script uses node-gyp-build, which otherwise selects a prebuild.
  postConfigure = ''
    rm -rf node_modules/@serialport/bindings-cpp/prebuilds
    npm rebuild @serialport/bindings-cpp --build-from-source
  '';
  doCheck = true;
  checkPhase = ''
    runHook preCheck
    export NO_IO=true LED_COUNT=500 LED_ALWAYS_ON=false
    export LED_ON_SUNSET_OFFSET_HR=-0.5 LED_OFF_HR=2
    export LATITUDE=34.048050 LONGITUDE=-118.254196 TZ=America/Los_Angeles
    export BAUD_RATE=1000000 SERIAL_BUFFER_SIZE=100
    npm run test:unit
    node -e 'require("@serialport/bindings-cpp").autoDetect()'
    runHook postCheck
  '';
  installPhase = ''
    runHook preInstall
    npm prune --omit=dev --ignore-scripts --offline
    # Keep the native module, without Makefiles/object files that retain build-tool references.
    binding=$(mktemp)
    cp node_modules/@serialport/bindings-cpp/build/Release/bindings.node "$binding"
    rm -rf node_modules/@serialport/bindings-cpp/build
    mkdir -p node_modules/@serialport/bindings-cpp/build/Release
    cp "$binding" node_modules/@serialport/bindings-cpp/build/Release/bindings.node
    rm "$binding"
    app="$out/lib/christmas-lights"
    mkdir -p "$app" "$out/bin"
    cp -r out node_modules package.json "$app/"
    # Production dependency executables need Node, without npm/corepack's build-tool closure.
    find "$app/node_modules" -type f -name '*.js' -exec \
      sed -i 's#${nodejs_24}/bin/node#${nodejs-slim_24}/bin/node#g' {} +
    makeWrapper ${nodejs-slim_24}/bin/node "$out/bin/christmas-lights" \
      --add-flags "--require $app/node_modules/dotenv/config.js $app/out/index.js"
    runHook postInstall
  '';
  meta = {
    description = "Serial controller for Christmas lights";
    license = lib.licenses.gpl3Only;
    mainProgram = "christmas-lights";
    platforms = lib.platforms.linux ++ lib.platforms.darwin;
  };
}
