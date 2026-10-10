"""Exercise the installed launcher without serial hardware."""

import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time

launcher = pathlib.Path(sys.argv[1]).resolve() / "bin/christmas-lights"
env = os.environ | {
    "NO_IO": "true",
    "LED_COUNT": "500",
    "LED_ALWAYS_ON": "false",
    "LED_ON_SUNSET_OFFSET_HR": "-0.5",
    "LED_OFF_HR": "2",
    "LATITUDE": "34.048050",
    "LONGITUDE": "-118.254196",
    "BAUD_RATE": "1000000",
    "SERIAL_BUFFER_SIZE": "100",
    "TZ": "America/Los_Angeles",
    "PRINT_LED_ARRAY": "false",
    "PRINT_SERIAL": "false",
    "PRINT_TIMINGS": "false",
}
env.pop("NODE_OPTIONS", None)
with tempfile.TemporaryDirectory() as directory:
    hook = pathlib.Path(directory) / "argv.cjs"
    hook.write_text("console.log(JSON.stringify(process.argv)); process.exit(0);\n")
    args_env = env | {"NODE_OPTIONS": f"--require {hook}"}
    argv = json.loads(subprocess.check_output(
        [str(launcher), "warm-white"], cwd=directory, env=args_env, text=True,
    ))
    assert argv[2:] == ["warm-white"], argv
    # Empty working directory proves the package does not depend on a bundled .env.
    for arguments in [[], ["warm-white"]]:
        process = subprocess.Popen([str(launcher), *arguments], cwd=directory, env=env)
        try:
            time.sleep(3)
            assert process.poll() is None, f"Controller exited: {process.returncode}"
        finally:
            process.terminate()
            process.wait(timeout=10)
print("Launcher arguments and environment-only simulation passed")
