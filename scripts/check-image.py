"""Check the Docker archive's runtime contract and packaged application files."""

import json
import pathlib
import sys
import tarfile

with tarfile.open(sys.argv[1]) as archive:
    manifest = json.load(archive.extractfile("manifest.json"))[0]
    config = json.load(archive.extractfile(manifest["Config"]))
    runtime = config["config"]
    assert config["architecture"] == sys.argv[2], config["architecture"]
    assert runtime["User"] == "65532:65532"
    entrypoint = runtime["Entrypoint"]
    assert entrypoint[0].endswith("/bin/node"), entrypoint
    assert entrypoint[-1].endswith("/lib/christmas-lights/out/index.js"), entrypoint
    assert any(value.startswith("TZDIR=") for value in runtime["Env"])
    files = set()
    for layer in manifest["Layers"]:
        with tarfile.open(fileobj=archive.extractfile(layer), mode="r|*") as contents:
            files.update(member.name.lstrip("./") for member in contents)
    app = entrypoint[-1].removesuffix("/out/index.js").lstrip("/")
    assert f"{app}/out/index.js" in files
    assert any(name.endswith("/share/zoneinfo/America/Los_Angeles") for name in files)
    for name in files:
        assert not name.endswith(("/bin/npm", "/bin/npx", "/bin/corepack")), name
        if name.startswith(app + "/"):
            relative = name[len(app) + 1:]
            assert pathlib.PurePosixPath(relative).name != ".env", name
            assert not relative.startswith(("test/", "src/")), name
            assert not relative.startswith(("node_modules/typescript/", "node_modules/jest/")), name
print("Image architecture, entrypoint, user, timezone data, and application contents passed")
