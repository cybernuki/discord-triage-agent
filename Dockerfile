# syntax=docker/dockerfile:1

# ---- build: install all deps and compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- deps: production dependencies only ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime: minimal image, non-root, no build tooling ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Optional: short git commit shown by /version.
#   docker compose build --build-arg BUILD_COMMIT=$(git rev-parse --short HEAD)
ARG BUILD_COMMIT=""
ENV BUILD_COMMIT=$BUILD_COMMIT

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node knowledge ./knowledge

USER node
CMD ["node", "dist/main.js"]
