# ===================================================
# Stage 1: Build Native C++17 Indexing Simulator Engine
# ===================================================
FROM gcc:12-bookworm AS cpp-builder
WORKDIR /app
COPY engine/ /app/engine/
RUN mkdir -p /app/engine/bin && \
    g++ -O3 -std=c++17 /app/engine/src/main.cpp -I /app/engine/include -o /app/engine/bin/indexer_engine && \
    g++ -O3 -std=c++17 /app/engine/tests/test_indexes.cpp -I /app/engine/include -o /app/engine/bin/engine_tests && \
    /app/engine/bin/engine_tests

# ===================================================
# Stage 2: Build React 18 Frontend
# ===================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ===================================================
# Stage 3: Build Backend TypeScript
# ===================================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# ===================================================
# Stage 4: Production Runtime Environment
# ===================================================
FROM node:20-slim AS runner
WORKDIR /app

# Install default-mysql-client for database checks / health scripts
RUN apt-get update && apt-get install -y --no-install-recommends default-mysql-client ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy compiled C++ engine binaries
COPY --from=cpp-builder /app/engine/bin/indexer_engine /app/engine/bin/indexer_engine
RUN chmod +x /app/engine/bin/indexer_engine

# Setup backend runtime with production dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend dist and runtime assets
COPY --from=backend-builder /app/backend/dist ./dist
COPY backend/scripts ./scripts
COPY backend/data ./data

# Copy built frontend assets to be served statically by Express
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose Render standard port
ENV PORT=10000
ENV NODE_ENV=production
ENV ENGINE_PATH=/app/engine/bin/indexer_engine
EXPOSE 10000

# Start unified full-stack server
WORKDIR /app/backend
CMD ["node", "dist/server.js"]
