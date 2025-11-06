### Multi-stage Dockerfile for building the Vite + Vue app and serving with nginx
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --silent --no-audit --progress=false

# Copy source and build
COPY . .

# Allow passing VITE_* build-time variables via build-args
ARG VITE_CMB_BASE
ARG VITE_JWT_EXPIRES
ENV VITE_CMB_BASE=${VITE_CMB_BASE}
ENV VITE_JWT_EXPIRES=${VITE_JWT_EXPIRES:-3600}

RUN npm run build

### Production image: nginx serving static files
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Replace default nginx config with a template that will be processed at runtime
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Copy entrypoint script which substitutes env vars and launches nginx
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
