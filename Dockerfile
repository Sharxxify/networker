# Base Node.js image
FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy everything into the container
COPY . .

ENV npm_config_legacy_peer_deps=true

# Install dependencies
RUN npm install

# Build Next.js app
RUN npm run build

# Package Electron app
RUN npm run electron-pack

# Avoid relying on inherited entrypoint
ENTRYPOINT []

# Default command: list built files
CMD ["ls", "-l", "dist"]
