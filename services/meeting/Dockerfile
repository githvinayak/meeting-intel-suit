FROM node:18-alpine

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy packages
COPY packages ./packages

# Copy meeting service
COPY services/meeting ./services/meeting

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared types
RUN pnpm --filter @meeting-intelligence/shared-types build

# Build meeting
RUN pnpm --filter @meeting-intelligence/meeting build

WORKDIR /app/services/meeting

EXPOSE 3002

CMD ["node", "dist/index.js"]