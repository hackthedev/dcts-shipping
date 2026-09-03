# ---------------------------
# Dockerfile for DCTS Shipping (Bun)
# ---------------------------

FROM oven/bun:1-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y curl && apt-get install -y unzip

COPY package.json bun.lock postinstall.mjs rider.json ./

RUN bun install

COPY . .

EXPOSE 2052

CMD ["bun", "."]

LABEL org.opencontainers.image.source=https://github.com/hackthedev/dcts-shipping
LABEL org.opencontainers.image.description="Free Open Source Decentralized Chat App"
