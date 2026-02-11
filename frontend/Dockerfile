# Multi-stage Dockerfile for Vox Chat Frontend
# Builds Svelte app and outputs to production-ready static files

# Stage 1: Build the frontend
FROM node:21-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app (outputs to ../public)
RUN npm run build

# Stage 2: Verify build output
FROM alpine:latest AS verification

WORKDIR /output

# Copy built files from previous stage
COPY --from=builder /app/public ./

# Verify critical files exist
RUN test -f index.html || (echo "ERROR: index.html not found" && exit 1)
RUN test -d assets || (echo "ERROR: assets/ directory not found" && exit 1)

# Optional: This stage just verifies the build
# The actual files will be copied to the host's public/ directory
# via docker run with volume mount or multi-stage build pattern
