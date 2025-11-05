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

# Replace default nginx config with SPA-friendly config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
