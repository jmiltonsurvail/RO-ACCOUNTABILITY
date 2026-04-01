#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/.deploy/standalone"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/.next"

cp -R "$ROOT_DIR/.next/standalone/." "$OUTPUT_DIR/"
cp -R "$ROOT_DIR/.next/static" "$OUTPUT_DIR/.next/static"

if [[ -d "$ROOT_DIR/public" ]]; then
  cp -R "$ROOT_DIR/public" "$OUTPUT_DIR/public"
fi

echo "Prepared standalone bundle at $OUTPUT_DIR"
