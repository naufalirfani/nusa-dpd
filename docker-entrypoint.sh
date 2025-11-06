#!/bin/sh
set -eu

# Substitute runtime environment variables into the nginx template and start nginx.
# This allows configuring backend targets (SSO, DPD portal) via environment variables
# without rebuilding the image.

TEMPLATE="/etc/nginx/conf.d/default.conf.template"
TARGET="/etc/nginx/conf.d/default.conf"

if [ -f "$TEMPLATE" ]; then
  # Only substitute the variables we expect to use to avoid replacing unrelated content.
  envsubst '${VITE_CMB_BASE} ${VITE_DPD_BASE}' < "$TEMPLATE" > "$TARGET"
fi

exec nginx -g 'daemon off;'
