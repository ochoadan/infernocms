# Deploy with Docker

Docker provides a consistent environment for running InfernoCMS across development and production.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually included with Docker Desktop)

## Quick Start

Create a `docker-compose.yml` file in your project root and run:

```bash
docker-compose up -d
```

Your InfernoCMS instance will be available at `http://localhost:4000`.

## Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app

# Use non-root user
USER node

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
```

## Docker Compose Configuration

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: infernocms-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: infernocms
      POSTGRES_PASSWORD: changeme123
      POSTGRES_DB: infernocms
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U infernocms"]
      interval: 10s
      timeout: 5s
      retries: 5

  infernocms:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: infernocms-app
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://infernocms:changeme123@postgres:5432/infernocms
      PORT: 4000
      # Local storage configuration
      INFERNOCMS_STORAGE_PROVIDER: local
      INFERNOCMS_UPLOAD_DIR: /app/uploads
      # Or use S3/R2 storage
      # INFERNOCMS_STORAGE_PROVIDER: s3
      # INFERNOCMS_S3_ENDPOINT: https://your-account.r2.cloudflarestorage.com
      # INFERNOCMS_S3_BUCKET: your-bucket-name
      # INFERNOCMS_S3_ACCESS_KEY_ID: your-access-key
      # INFERNOCMS_S3_SECRET_ACCESS_KEY: your-secret-key
      # INFERNOCMS_S3_REGION: auto
    volumes:
      # Mount uploads directory for local storage
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
    driver: local
  uploads_data:
    driver: local
```

## Environment Variables

### Required Variables

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=production
PORT=4000
```

### Storage Configuration

#### Local Storage

```bash
INFERNOCMS_STORAGE_PROVIDER=local
INFERNOCMS_UPLOAD_DIR=/app/uploads
```

#### S3/R2 Storage

```bash
INFERNOCMS_STORAGE_PROVIDER=s3
INFERNOCMS_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
INFERNOCMS_S3_BUCKET=your-bucket-name
INFERNOCMS_S3_ACCESS_KEY_ID=your-access-key
INFERNOCMS_S3_SECRET_ACCESS_KEY=your-secret-key
INFERNOCMS_S3_REGION=auto
```

## Build and Run Commands

### Build the Image

```bash
docker build -t infernocms:latest .
```

### Run with Docker Compose

Start services:
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f
```

Stop services:
```bash
docker-compose down
```

Stop and remove volumes:
```bash
docker-compose down -v
```

### Run Standalone Container

```bash
docker run -d \
  --name infernocms \
  -p 4000:4000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/database \
  -e NODE_ENV=production \
  -e INFERNOCMS_STORAGE_PROVIDER=local \
  -v infernocms_uploads:/app/uploads \
  infernocms:latest
```

## Using Environment File

Create a `.env` file for environment variables:

```bash
# .env
POSTGRES_USER=infernocms
POSTGRES_PASSWORD=changeme123
POSTGRES_DB=infernocms

DATABASE_URL=postgresql://infernocms:changeme123@postgres:5432/infernocms
NODE_ENV=production
PORT=4000

INFERNOCMS_STORAGE_PROVIDER=local
INFERNOCMS_UPLOAD_DIR=/app/uploads
```

Update `docker-compose.yml` to use the env file:

```yaml
services:
  infernocms:
    env_file:
      - .env
```

**Important:** Add `.env` to your `.gitignore` file.

## Production Considerations

### Security

1. **Change default passwords** in production
2. **Use secrets management** for sensitive data:
   ```yaml
   services:
     infernocms:
       secrets:
         - db_password
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```
3. **Limit exposed ports** - don't expose PostgreSQL publicly
4. **Use non-root user** (already configured in Dockerfile)

### Persistence

Ensure data persists across container restarts:
- Database data: `postgres_data` volume
- Uploaded files: `uploads_data` volume (if using local storage)

### Backup

Backup PostgreSQL data:

```bash
docker-compose exec postgres pg_dump -U infernocms infernocms > backup.sql
```

Restore from backup:

```bash
cat backup.sql | docker-compose exec -T postgres psql -U infernocms infernocms
```

### Networking

For production, use a custom network:

```yaml
services:
  postgres:
    networks:
      - infernocms-network

  infernocms:
    networks:
      - infernocms-network

networks:
  infernocms-network:
    driver: bridge
```

### Reverse Proxy

Use Nginx or Traefik for SSL termination and load balancing:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - infernocms
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f infernocms

# Last 100 lines
docker-compose logs --tail=100 infernocms
```

### Check Health

```bash
docker-compose ps
```

### Container Stats

```bash
docker stats infernocms-app
```

## Troubleshooting

### Database Connection Issues

Check if PostgreSQL is ready:
```bash
docker-compose exec postgres pg_isready -U infernocms
```

Verify DATABASE_URL:
```bash
docker-compose exec infernocms env | grep DATABASE_URL
```

### Build Failures

Clear build cache and rebuild:
```bash
docker-compose build --no-cache
```

### Permission Issues

Ensure the node user has write access:
```bash
docker-compose exec infernocms ls -la /app/uploads
```

Fix permissions:
```bash
docker-compose exec infernocms chown -R node:node /app/uploads
```

### Port Conflicts

If port 4000 is in use, change the mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:4000"
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
