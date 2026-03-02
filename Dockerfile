# ---------------------------
# Dockerfile for DCTS Shipping (Bun)
# ---------------------------

FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

EXPOSE 2052

CMD ["bun", "."]

LABEL org.opencontainers.image.source=https://github.com/hackthedev/dcts-shipping
LABEL org.opencontainers.image.description="Free Open Source Decentralized Chat App"