FROM node:18-alpine

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy packages
COPY packages ./packages

# Copy auth service
COPY services/auth ./services/auth

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared types
RUN pnpm --filter @meeting-intelligence/shared-types build

# Build auth
RUN pnpm --filter @meeting-intelligence/auth build

WORKDIR /app/services/auth

EXPOSE 3001

CMD ["node", "dist/index.js"]