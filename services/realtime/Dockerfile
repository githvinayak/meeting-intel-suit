FROM node:18-alpine

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy packages
COPY packages ./packages

# Copy realtime service
COPY services/realtime ./services/realtime

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared types
RUN pnpm --filter @meeting-intelligence/shared-types build

# Build realtime
RUN pnpm --filter @meeting-intelligence/realtime build

WORKDIR /app/services/realtime

EXPOSE 3003

CMD ["node", "dist/index.js"]