# Deploy to Fly.io

Fly.io is a platform for running applications globally with built-in edge routing and managed Postgres.

## Prerequisites

- A [Fly.io account](https://fly.io)
- Fly CLI installed: `curl -L https://fly.io/install.sh | sh` (or `brew install flyctl` on macOS)
- Authenticate: `fly auth login`

## Deployment Steps

### 1. Launch Your Application

From your InfernoCMS project directory:

```bash
fly launch
```

This will:
- Detect your Node.js application
- Generate a `fly.toml` configuration file
- Prompt you to deploy immediately (choose "No" for now to configure database first)

### 2. Create and Attach PostgreSQL

Create a new Postgres cluster:

```bash
fly postgres create
```

Follow the prompts to:
- Choose a name (e.g., `infernocms-db`)
- Select a region
- Choose a configuration (Development recommended for testing)

Attach the database to your app:

```bash
fly postgres attach infernocms-db
```

This automatically sets the `DATABASE_URL` secret for your application.

### 3. Configure Storage (Optional)

If using file uploads with S3/R2, set the required secrets:

```bash
fly secrets set \
  INFERNOCMS_STORAGE_PROVIDER=s3 \
  INFERNOCMS_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com \
  INFERNOCMS_S3_BUCKET=your-bucket-name \
  INFERNOCMS_S3_ACCESS_KEY_ID=your-access-key \
  INFERNOCMS_S3_SECRET_ACCESS_KEY=your-secret-key \
  INFERNOCMS_S3_REGION=auto
```

For local storage (requires persistent volume):

```bash
fly secrets set INFERNOCMS_STORAGE_PROVIDER=local
```

### 4. Configure fly.toml

Edit the generated `fly.toml` file:

```toml
app = "your-app-name"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"
  PORT = "4000"

[http_service]
  internal_port = 4000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "GET"
  path = "/health"

[vm]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

### 5. Add Health Check Endpoint

Ensure your InfernoCMS server has a health check endpoint. If not already implemented, add a simple route:

```javascript
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})
```

### 6. Deploy

Deploy your application:

```bash
fly deploy
```

Fly will:
- Build your application
- Create a Docker image
- Deploy to your selected region
- Run database migrations

### 7. Verify Deployment

Check your application status:

```bash
fly status
```

View logs:

```bash
fly logs
```

Access your app:

```bash
fly open
```

Or visit: `https://your-app-name.fly.dev/health`

## Volume for Local Storage (Optional)

If using local file storage, create a persistent volume:

```bash
fly volumes create uploads --size 10 --region iad
```

Update `fly.toml` to mount the volume:

```toml
[[mounts]]
  source = "uploads"
  destination = "/app/uploads"
```

Set the upload directory:

```bash
fly secrets set INFERNOCMS_UPLOAD_DIR=/app/uploads
```

## Scaling

### Vertical Scaling

Adjust VM resources in `fly.toml`:

```toml
[vm]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 1024
```

Deploy changes:

```bash
fly deploy
```

### Horizontal Scaling

Scale to multiple regions:

```bash
fly scale count 2
fly regions add lhr syd
```

## Database Management

### Connect to Database

```bash
fly postgres connect -a infernocms-db
```

### View Database Credentials

```bash
fly postgres db list -a infernocms-db
```

### Backup Database

```bash
fly postgres backup create -a infernocms-db
```

## Monitoring

View real-time metrics:

```bash
fly dashboard
```

Check application logs:

```bash
fly logs --app your-app-name
```

## Troubleshooting

### Build Failures

Check build logs:
```bash
fly logs --app your-app-name
```

Common issues:
- Missing build script in package.json
- Node.js version mismatch (specify in package.json engines)
- Memory issues during build (increase VM size temporarily)

### Database Connection

Verify DATABASE_URL is set:
```bash
fly secrets list
```

Test database connection:
```bash
fly ssh console
node -e "const pg = require('pg'); const client = new pg.Client(process.env.DATABASE_URL); client.connect()"
```

### Health Check Failures

Ensure:
- `/health` endpoint returns 200 OK
- `internal_port` matches your server port (4000)
- Server starts before health check grace period expires

## Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly Postgres Guide](https://fly.io/docs/postgres/)
- [Fly.io Node.js Guide](https://fly.io/docs/languages-and-frameworks/node/)
