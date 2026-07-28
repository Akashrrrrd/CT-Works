# Environment Variables Guide

## Overview

The application now supports dual environment variable configurations, allowing you to:
- Use alternate database credentials
- Test with different databases
- Run A/B tests with separate backends
- Access the website in v0 with custom environment settings

## Environment Variables

### Database Configuration

**Primary (fallback):**
- `DATABASE_URL` - MongoDB connection string (e.g., `mongodb://localhost:27017`)
- `DB_NAME` - Database name (default: `ct-adequacy`)

**Alternate (preferred):**
- `DATABASE_URL_2` - Alternate MongoDB connection string
- `DB_NAME_2` - Alternate database name

**Priority:** `_2` variables take precedence. If not set, falls back to primary variables.

```typescript
// In code - automatically handled
const uri = process.env.DATABASE_URL_2 || process.env.DATABASE_URL;
const dbName = process.env.DB_NAME_2 || process.env.DB_NAME;
```

### Authentication Configuration

**Primary (fallback):**
- `JWT_SECRET` - Secret for JWT token signing (minimum 32 characters)

**Alternate (preferred):**
- `JWT_SECRET_2` - Alternate JWT secret

**Priority:** `JWT_SECRET_2` takes precedence. If not set, falls back to `JWT_SECRET`.

```typescript
// In code - automatically handled
const secret = process.env.JWT_SECRET_2 || process.env.JWT_SECRET;
```

## Setting Up in v0

### Step 1: Add Environment Variables

In your project settings (top right):
1. Click **Settings** button
2. Go to **Vars** tab
3. Add these variables:
   - `DATABASE_URL_2`: Your MongoDB connection string
   - `DB_NAME_2`: Your database name
   - `JWT_SECRET_2`: Your JWT secret (32+ characters)

### Step 2: Verify Connection

The app will automatically use these variables when:
1. Both `_2` variables are set
2. Application starts or redeploys
3. All database operations route through the alternate configuration

### Step 3: Test in Browser

1. Open the application in v0 preview
2. Navigate to `/auth/login`
3. Application connects using `DATABASE_URL_2` and `JWT_SECRET_2`
4. All data operations use the alternate database

## Use Cases

### Testing Multiple Databases

```
Config A (primary):
- DATABASE_URL: mongodb://prod.mongodb.net
- DB_NAME: production

Config B (alternate):
- DATABASE_URL_2: mongodb://staging.mongodb.net
- DB_NAME_2: staging
```

Switch between them by toggling which variables are set.

### A/B Testing

Run two different database configurations:
- Primary variables: Control group
- `_2` variables: Test group

### Local Development + Staging

```
Local setup:
- DATABASE_URL: mongodb://localhost:27017
- JWT_SECRET: local_dev_secret_123456789...

Staging setup:
- DATABASE_URL_2: mongodb+srv://user:pass@staging.mongodb.net
- DB_NAME_2: staging-db
- JWT_SECRET_2: staging_secret_abc123def456...
```

## Files Modified

- `lib/db.ts` - Database connection now checks `DATABASE_URL_2` and `DB_NAME_2`
- `lib/auth.ts` - JWT signing now checks `JWT_SECRET_2`

## Fallback Behavior

If `_2` variables are not set, the application automatically falls back to primary variables:

```
DATABASE_URL_2 → DATABASE_URL → Error
DB_NAME_2 → DB_NAME → 'ct-adequacy'
JWT_SECRET_2 → JWT_SECRET → Error
```

This ensures backward compatibility—existing deployments continue working without changes.

## Troubleshooting

### "DATABASE_URL or DATABASE_URL_2 environment variable is not set"

**Solution:** Add at least one of these variables:
- `DATABASE_URL` (primary)
- `DATABASE_URL_2` (alternate)

### "JWT_SECRET or JWT_SECRET_2 must be set and at least 32 characters long"

**Solution:** Ensure your JWT secret is 32+ characters:
```bash
# Generate a secure secret:
openssl rand -base64 32
```

### Connection fails with `_2` variables but works with primary

**Check:**
1. Verify `DATABASE_URL_2` format is correct
2. Confirm database credentials are valid
3. Check network/firewall allows connection
4. Verify `DB_NAME_2` exists in that MongoDB instance

## Production Deployment

When deploying to production:
1. Set both primary AND alternate variables for redundancy
2. Use `_2` variables for your main configuration
3. Keep primary variables as fallback

```
Vercel Project Settings → Environment Variables:
- DATABASE_URL: [your production mongo]
- DB_NAME: production
- JWT_SECRET: [your production secret]

- DATABASE_URL_2: [your alternate/staging mongo]
- DB_NAME_2: production-backup
- JWT_SECRET_2: [your alternate secret]
```

## API Reference

The configuration is automatically handled in these files:

- `getClient()` in `lib/db.ts` - Returns MongoDB client with credentials
- `getSecret()` in `lib/auth.ts` - Returns JWT signing secret

No code changes needed—just set the environment variables!
