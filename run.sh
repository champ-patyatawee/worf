#!/bin/bash
set -e

IMAGE_NAME="workspace-all"
CONTAINER_NAME="workspace"

echo "=== Building $IMAGE_NAME ==="
docker build -t $IMAGE_NAME .

echo ""
echo "=== Cleaning up old container/volumes ==="
docker rm -f $CONTAINER_NAME 2>/dev/null || true
docker volume rm ${CONTAINER_NAME}-data ${CONTAINER_NAME}-redis 2>/dev/null || true

echo ""
echo "=== Starting $CONTAINER_NAME ==="
docker run -d \
  --name $CONTAINER_NAME \
  -p 8090:80 \
  -v ${CONTAINER_NAME}-data:/var/lib/postgresql/15/main \
  -v ${CONTAINER_NAME}-redis:/data \
  $IMAGE_NAME

echo ""
echo "=== Container started! Waiting for initialization... ==="
echo "Run 'docker logs -f $CONTAINER_NAME' to watch the startup."
echo ""
echo "Access:"
echo "  App (via Traefik):  http://localhost:8090"
