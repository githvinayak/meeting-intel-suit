FROM node:18-alpine

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy packages
COPY packages ./packages

# Copy gateway service
COPY services/gateway ./services/gateway

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared types
RUN pnpm --filter @meeting-intelligence/shared-types build

# Build gateway
RUN pnpm --filter @meeting-intelligence/gateway build

WORKDIR /app/services/gateway

EXPOSE 3000

CMD ["node", "dist/index.js"]