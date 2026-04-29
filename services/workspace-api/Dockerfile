# workspace Server - Multi-stage Build

# Stage 1: Node Builder
FROM node:20 AS node-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl for exec into shell pods
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Copy package files
COPY package*.json ./
RUN npm ci --only=production=false

# Copy prisma schema
COPY prisma ./prisma/

# Copy server source code
COPY src ./src/

# Copy tsconfig
COPY tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Model Downloader
FROM python:3-slim AS model-downloader

WORKDIR /models

ARG HF_TOKEN

RUN pip3 install --no-cache-dir -q hf && \
    hf download --quiet Xenova/nomic-embed-text-v1 --local-dir /models/Xenova/nomic-embed-text-v1 --token ${HF_TOKEN}

RUN ls -la /models

# Stage 3: Runner
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy kubectl from node-builder
COPY --from=node-builder /usr/local/bin/kubectl /usr/local/bin/kubectl

# Copy node_modules from node-builder
COPY --from=node-builder /app/node_modules ./node_modules

# Copy prisma from node-builder
COPY --from=node-builder /app/prisma ./prisma

# Copy src from node-builder
COPY --from=node-builder /app/src ./src

# Copy tsconfig from node-builder
COPY --from=node-builder /app/tsconfig.json ./

# Copy models from model-downloader
COPY --from=model-downloader /models /models

# Copy package.json
COPY package*.json ./

# Expose port
EXPOSE 3001

# Run in development mode with hot reload
CMD ["npm", "run", "dev"]
