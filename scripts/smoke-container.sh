#!/usr/bin/env bash
set -euo pipefail

image=${1:?Provide the image reference}
container=$(docker run --detach --read-only --cap-drop ALL \
  --security-opt no-new-privileges --cpus 0.5 --memory 256m \
  -e NO_IO=true -e LED_COUNT=500 -e LED_ALWAYS_ON=false \
  -e LED_ON_SUNSET_OFFSET_HR=-0.5 -e LED_OFF_HR=2 \
  -e LATITUDE=34.048050 -e LONGITUDE=-118.254196 \
  -e BAUD_RATE=1000000 -e SERIAL_BUFFER_SIZE=100 \
  -e TZ=America/Los_Angeles "$image" warm-white)
trap 'docker rm --force "$container" >/dev/null' EXIT

sleep 5
if [[ $(docker inspect --format '{{.State.Running}}' "$container") != true ]]; then
  docker logs "$container"
  exit 1
fi

node=$(docker inspect --format '{{index .Config.Entrypoint 0}}' "$container")
docker exec "$container" "$node" -e '
  if (new Date("2026-01-01T12:00:00Z").getHours() !== 4) process.exit(1);
'
echo 'Container simulation and local timezone passed'
