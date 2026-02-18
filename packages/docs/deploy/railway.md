# Deploy to Railway

Railway is a platform that makes it simple to deploy InfernoCMS with managed PostgreSQL and automatic builds.

## Prerequisites

- A [Railway account](https://railway.app)
- Railway CLI (optional): `npm i -g @railway/cli`

## Deployment Steps

### 1. Create a New Project

Navigate to [Railway](https://railway.app) and create a new project.

### 2. Add PostgreSQL Service

1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway will provision a managed PostgreSQL instance
3. The `DATABASE_URL` environment variable will be automatically set

### 3. Add InfernoCMS Service

1. Click "New" → "GitHub Repo" (or "Empty Service" for manual deployment)
2. Select your InfernoCMS repository
3. Railway will auto-detect Node.js and install dependencies

### 4. Configure Environment Variables

In your InfernoCMS service settings, add the following environment variables:

```bash
# Database (auto-populated by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Server configuration
NODE_ENV=production
PORT=4000

# Storage (if using file uploads with R2/S3)
INFERNOCMS_STORAGE_PROVIDER=s3
INFERNOCMS_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
INFERNOCMS_S3_BUCKET=your-bucket-name
INFERNOCMS_S3_ACCESS_KEY_ID=your-access-key
INFERNOCMS_S3_SECRET_ACCESS_KEY=your-secret-key
INFERNOCMS_S3_REGION=auto
```

For local file storage (not recommended for Railway):
```bash
INFERNOCMS_STORAGE_PROVIDER=local
INFERNOCMS_UPLOAD_DIR=/app/uploads
```

### 5. Configure Start Script

Railway will automatically detect your `package.json` start script. Ensure your package.json includes:

```json
{
  "scripts": {
    "start": "node dist/server.js"
  }
}
```

Or if using the InfernoCMS CLI:
```json
{
  "scripts": {
    "start": "npx infernocms start"
  }
}
```

### 6. Deploy

Railway will automatically build and deploy your application when you push to your repository.

## Configuration Files (Optional)

### railway.json

Create a `railway.json` file in your project root for advanced configuration:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Procfile

Alternatively, use a `Procfile`:

```
web: node dist/server.js
```

## Verify Deployment

Once deployed, Railway will provide a public URL. Visit:

```
https://your-app.railway.app/health
```

You should see a healthy response from your InfernoCMS instance.

## Database Migrations

InfernoCMS will automatically run migrations on startup. Monitor the deployment logs to ensure migrations complete successfully.

## Scaling

Railway supports vertical and horizontal scaling:
- Adjust memory and CPU in service settings
- Enable autoscaling based on traffic

## Troubleshooting

### Build Failures

Check the build logs in Railway dashboard. Common issues:
- Missing dependencies in package.json
- Build script errors
- Insufficient memory during build

### Database Connection Issues

Ensure `DATABASE_URL` references the Railway Postgres service:
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Storage Issues

If using S3/R2, verify all credentials are correct. Test with a simple file upload through the API.

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Postgres Guide](https://docs.railway.app/databases/postgresql)
