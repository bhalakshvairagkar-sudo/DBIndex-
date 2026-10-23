FROM node:20-slim

WORKDIR /app

# Install build essentials for C++ engine compilation if needed
RUN apt-get update && apt-get install -y --no-install-recommends g++ make default-mysql-client ca-certificates && rm -rf /var/lib/apt/lists/*

# Compile C++ engine
COPY engine/ /app/engine/
RUN mkdir -p /app/engine/bin && \
    g++ -O3 -std=c++17 /app/engine/src/main.cpp -I /app/engine/include -o /app/engine/bin/indexer_engine && \
    chmod +x /app/engine/bin/indexer_engine

# Install backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Build backend TypeScript
COPY backend/ ./
RUN npm run build

ENV PORT=4000
ENV NODE_ENV=production
ENV ENGINE_PATH=/app/engine/bin/indexer_engine
EXPOSE 4000

CMD ["node", "dist/server.js"]
