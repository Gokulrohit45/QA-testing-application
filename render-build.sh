#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "==> Installing Python dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Installing Playwright Chromium browser binary..."
export PLAYWRIGHT_BROWSERS_PATH=0
playwright install chromium
