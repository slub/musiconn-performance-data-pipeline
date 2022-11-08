{

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-22.05";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs-16_x;
        nodeDependencies = (pkgs.callPackage ./default.nix { }).nodeDependencies;
        nodeEnv = import ./default.nix { inherit pkgs; inherit nodejs; };
      in {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [ nodejs nodePackages.yarn node2nix nodeEnv.shell jq librdf_raptor2 ];
          shellHook = nodeEnv.shell.shellHook;
        };
      }
    );
}
