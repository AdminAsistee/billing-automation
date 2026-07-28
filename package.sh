#!/bin/bash
set -e

SOURCE_DIR="src"
OUTPUT_ZIP="cloud_run_deploy.zip"

# Define the required files
REQUIRED_FILES=(
    "$SOURCE_DIR/main.py"
    "$SOURCE_DIR/gemini_client.py"
    "$SOURCE_DIR/config.py"
    "$SOURCE_DIR/external_api.py"
    "requirements.txt"
    "Dockerfile"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [[ $MISSING_FILES -gt 0 ]]; then
    echo "----------------------------------------"
    echo "Error: $MISSING_FILES required file(s) missing. Aborting packaging."
    exit 1
fi

echo "----------------------------------------"
echo "All Files found, zipping"

# Remove old zip if it exists to ensure a clean build
rm -f "$OUTPUT_ZIP"

# Package the files into the zip archive
zip "$OUTPUT_ZIP" "${REQUIRED_FILES[@]}"
zip -sf "$OUTPUT_ZIP"
