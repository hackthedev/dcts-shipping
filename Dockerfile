# ---------------------------  
# 🚢 Dockerfile for DCTS Shipping  
# ---------------------------  

# 🐳 Use the official Node.js LTS slim image
FROM node:21-slim

# 🛠️ Install Python and build tools for native dependencies
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# 📂 Set working directory
WORKDIR /app

# 📦 Copy dependency definitions first for better layer caching
COPY package.json package-lock.json ./

# ⚡ Install dependencies reproducibly, omitting dev dependencies
RUN npm ci --omit=dev

# 📄 Copy the rest of the application code
COPY . .

# 🌐 Expose application port
EXPOSE 2052

# 🚀 Start the application
CMD ["node", "."]
