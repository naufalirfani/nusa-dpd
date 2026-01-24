#!/bin/sh
set -eu

# Substitute runtime environment variables into the nginx template and start nginx.
# This allows configuring backend targets (SSO, DPD portal) via environment variables
# without rebuilding the image.

TEMPLATE="/etc/nginx/conf.d/default.conf.template"
TARGET="/etc/nginx/conf.d/default.conf"

# Set default values if environment variables are not provided
export VITE_CMB_BASE="${VITE_CMB_BASE:-http://localhost:8080}"
export VITE_DPD_BASE="${VITE_DPD_BASE:-http://localhost:8081}"

if [ -f "$TEMPLATE" ]; then
  # Only substitute the variables we expect to use to avoid replacing unrelated content.
  envsubst '${VITE_CMB_BASE} ${VITE_DPD_BASE}' < "$TEMPLATE" > "$TARGET"
  echo "Nginx config generated successfully"
  echo "VITE_CMB_BASE: ${VITE_CMB_BASE}"
  echo "VITE_DPD_BASE: ${VITE_DPD_BASE}"
else
  echo "Warning: Template file not found at $TEMPLATE"
fi

# Test nginx configuration before starting
nginx -t || {
  echo "ERROR: Nginx configuration test failed"
  cat "$TARGET"
  exit 1
}

exec nginx -g 'daemon off;'
