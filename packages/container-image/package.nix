{
  dockerTools,
  nodejs-slim_24,
  tzdata,
  christmas-lights,
}:

dockerTools.buildLayeredImage {
  name = "ghcr.io/dudeofawesome/christmas-lights";
  tag = christmas-lights.version;
  contents = [
    christmas-lights
    tzdata
  ];
  config = {
    Entrypoint = [
      "${nodejs-slim_24}/bin/node"
      "--require"
      "${christmas-lights}/lib/christmas-lights/node_modules/dotenv/config.js"
      "${christmas-lights}/lib/christmas-lights/out/index.js"
    ];
    User = "65532:65532";
    WorkingDir = "/";
    Env = [
      "NODE_ENV=production"
      "TZDIR=${tzdata}/share/zoneinfo"
    ];
    Labels."org.opencontainers.image.source" = "https://github.com/dudeofawesome/christmas-lights";
    Labels."org.opencontainers.image.licenses" = "GPL-3.0-only";
  };
}
