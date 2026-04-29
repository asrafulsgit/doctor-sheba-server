# Base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy project files
COPY . .

RUN npx prisma generate

# Expose port
EXPOSE 5000

# Start the app
CMD ["pnpm", "dev"]