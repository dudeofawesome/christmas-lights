{
  description = "Christmas lights controller, container, and Arduino firmware";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { self, nixpkgs }:
    let
      lib = nixpkgs.lib;
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forSystems = lib.genAttrs systems;
    in
    {
      packages = forSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          controller = pkgs.callPackage ./packages/christmas-lights/package.nix { };
        in
        {
          christmas-lights = controller;
          default = controller;
        }
        // lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
          container-image = pkgs.callPackage ./packages/container-image/package.nix {
            christmas-lights = controller;
          };
          relay-firmware-leonardo = pkgs.callPackage ./packages/relay-firmware-leonardo/package.nix { };
          relay-firmware-promicro = pkgs.callPackage ./packages/relay-firmware-promicro/package.nix { };
        }
      );

      apps = forSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.christmas-lights}/bin/christmas-lights";
        };
      });

      checks = forSystems (system: self.packages.${system});
      formatter = forSystems (system: nixpkgs.legacyPackages.${system}.nixfmt);
    };
}
