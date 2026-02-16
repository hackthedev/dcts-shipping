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

