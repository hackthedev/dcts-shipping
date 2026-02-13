# ---------------------------
# Dockerfile for DCTS Shipping (Bun)
# ---------------------------

FROM oven/bun:1.0.29-slim

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile
RUN bun prune --production

COPY . .

EXPOSE 2052

CMD ["bun", "."]





