# workspace Client - Development Mode
# Run with: docker run -v $(pwd)/client:/app -p 5173:5173 workspace-client-dev
# Or use docker compose with volume mounts for hot reload

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY ./package*.json ./
RUN npm install

# Copy source code
COPY ./ ./

# Expose port
EXPOSE 5173

# Run in development mode with hot reload
CMD ["npm", "run", "dev", "--", "--host"]