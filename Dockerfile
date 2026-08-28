# 1. Use a Linux distribution (Ubuntu 24.04 LTS)
FROM ubuntu:24.04

# Set non-interactive mode for apt package installations
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory inside container
WORKDIR /app

# 2. Specify internal and external ports
# Default internal communication port (can be overridden at runtime via ENV PORT)
ENV PORT=5000
# Expose internal & external communication ports (5000 primary API REST port, 3000 fallback port)
EXPOSE 5000
EXPOSE 3000

# 3. Install dependency requirements (matching scripts/install-requirements.sh)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    npm \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g bun

# 4. Install application dependencies (using bun instead of npm)
COPY package.json bun.lock* ./
RUN bun install

# Copy application source code and scripts into container
COPY . .

# 5. Execute npm run dev for running process
CMD ["npm", "run", "dev"]
