# ==========================
# Base Stage - Common dependencies
# ==========================
FROM node:18-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ==========================
# Development Stage
# ==========================
FROM base AS development
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ==========================
# Builder Stage - For production build
# ==========================
FROM base AS builder
WORKDIR /app
# Copy all source files
COPY . .
# Fix permissions for node_modules binaries (Vite etc.)
RUN find node_modules/.bin -type f -exec chmod +x {} \;
# Build the frontend
RUN npx vite build

# ==========================
# Production Stage
# ==========================
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html
# Copy built files from builder
COPY --from=builder /app/dist ./
# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Expose HTTP port
EXPOSE 80
# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
