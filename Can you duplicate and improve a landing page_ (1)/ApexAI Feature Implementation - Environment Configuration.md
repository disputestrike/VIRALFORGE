# ApexAI Feature Implementation - Environment Configuration

## Overview

This document outlines all environment variables and configuration needed to implement the 20 missing features.

## Environment Variables

### Database Configuration

```bash
# MySQL (Railway)
DATABASE_URL="mysql://user:password@host:port/database"
MYSQL_HOST="host"
MYSQL_PORT="3306"
MYSQL_USER="user"
MYSQL_PASSWORD="password"
MYSQL_DATABASE="apexai"
```

### Redis Configuration (for BullMQ)

```bash
# Redis (for background jobs)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="your_redis_password"
REDIS_DB="0"
```

### SignalWire Configuration

```bash
# SignalWire API (Phone/Voice Provider)
SIGNALWIRE_API_KEY="your_signalwire_api_key"
SIGNALWIRE_SPACE_URL="https://your-space.signalwire.com"
SIGNALWIRE_PROJECT_ID="your_project_id"
SIGNALWIRE_AUTH_TOKEN="your_auth_token"
SIGNALWIRE_WEBHOOK_SECRET="your_webhook_secret"
```

### OpenAI Configuration

```bash
# OpenAI (for AI/ML features)
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
```

### CRM Integrations

```bash
# Salesforce
SALESFORCE_CLIENT_ID="your_client_id"
SALESFORCE_CLIENT_SECRET="your_client_secret"
SALESFORCE_REDIRECT_URI="https://your-domain.com/oauth/salesforce/callback"

# HubSpot
HUBSPOT_API_KEY="your_hubspot_api_key"
HUBSPOT_PRIVATE_APP_TOKEN="your_private_app_token"

# Pipedrive
PIPEDRIVE_API_KEY="your_pipedrive_api_key"
PIPEDRIVE_COMPANY_DOMAIN="your_company_domain"
```

### Email Configuration

```bash
# SendGrid (or alternative email service)
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="noreply@apexai.com"
SENDGRID_FROM_NAME="ApexAI"

# Alternative: SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_app_password"
SMTP_FROM="noreply@apexai.com"
```

### Social Media Integrations

```bash
# Meta (Instagram/WhatsApp)
META_APP_ID="your_app_id"
META_APP_SECRET="your_app_secret"
META_VERIFY_TOKEN="your_verify_token"
META_ACCESS_TOKEN="your_access_token"

# Telegram (optional)
TELEGRAM_BOT_TOKEN="your_bot_token"
```

### Mobile Push Notifications

```bash
# Firebase (FCM for Android)
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_CLIENT_EMAIL="your_client_email"

# Apple Push Notification (APNs)
APNS_KEY_ID="your_key_id"
APNS_TEAM_ID="your_team_id"
APNS_BUNDLE_ID="com.apexai.app"
APNS_PRIVATE_KEY="your_private_key"
```

### Zapier Configuration

```bash
# Zapier (no API key needed, uses webhooks)
ZAPIER_WEBHOOK_URL="https://hooks.zapier.com/hooks/catch/..."
```

### Knowledge Base Configuration

```bash
# Web Scraping
FIRECRAWL_API_KEY="your_firecrawl_api_key"  # or use Puppeteer/Cheerio

# Document Processing
PDF_PARSER="pdf-parse"  # or "pdfjs"
WORD_PARSER="mammoth"
```

### Ticketing System

```bash
# Zendesk (optional)
ZENDESK_SUBDOMAIN="your_subdomain"
ZENDESK_EMAIL="your_email"
ZENDESK_API_TOKEN="your_api_token"

# Freshdesk (optional)
FRESHDESK_DOMAIN="your_domain"
FRESHDESK_API_KEY="your_api_key"
```

### Analytics

```bash
# Analytics Service
ANALYTICS_ENABLED="true"
ANALYTICS_RETENTION_DAYS="90"
```

### Encryption

```bash
# Data Encryption (for storing sensitive tokens)
ENCRYPTION_KEY="your_32_character_encryption_key"
ENCRYPTION_IV="your_16_character_iv"
```

### Application Configuration

```bash
# Environment
NODE_ENV="production"
PORT="3000"

# Application
APP_NAME="ApexAI"
APP_URL="https://your-domain.com"
APP_SECRET="your_app_secret"

# Logging
LOG_LEVEL="info"
LOG_FORMAT="json"
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install axios bullmq ioredis openai langchain @langchain/openai
npm install mysql2 express zod @trpc/server
npm install nodemailer sendgrid-mail
npm install firebase-admin apn
npm install dotenv
```

### 2. Create .env File

```bash
cp .env.example .env
# Edit .env with your configuration values
```

### 3. Database Setup

```bash
# Run migrations to create all tables
npm run migrate

# Or manually run the SQL from 01_DATABASE_SCHEMAS.sql
mysql -u user -p database < 01_DATABASE_SCHEMAS.sql
```

### 4. Redis Setup

```bash
# Start Redis (if running locally)
redis-server

# Or use managed Redis (Railway, AWS ElastiCache, etc.)
```

### 5. Mount Routes

In your `server/index.ts`:

```typescript
import { advancedFeaturesRouter } from "./routers/advancedFeatures";
import { phase2FeaturesRouter } from "./routers/phase2Features";
import webhookRoutes from "./webhooks";

// Mount routers
appRouter.use("advanced", advancedFeaturesRouter);
appRouter.use("phase2", phase2FeaturesRouter);

// Mount webhooks
app.use("/api", webhookRoutes);
```

### 6. Start Background Workers

```bash
# In a separate process/container
npm run workers

# Or add to your process manager (PM2, systemd, etc.)
pm2 start worker.js --name "apexai-workers"
```

### 7. Configure Webhooks

Update your integration settings:

- **SignalWire**: Set webhook URLs to `https://your-domain.com/api/webhooks/signalwire/*`
- **Zapier**: Set webhook URL to `https://your-domain.com/api/webhooks/zapier/trigger`
- **Salesforce**: Set change event URL to `https://your-domain.com/api/webhooks/salesforce/change-event`
- **HubSpot**: Set contact change URL to `https://your-domain.com/api/webhooks/hubspot/contact-change`
- **Meta**: Set webhook URL to `https://your-domain.com/api/webhooks/instagram/message`

## Deployment Checklist

- [ ] All environment variables set in production
- [ ] Database migrations run
- [ ] Redis instance configured and running
- [ ] Background workers started
- [ ] Webhooks configured in all integrations
- [ ] SSL certificates configured
- [ ] Logging configured and monitored
- [ ] Error tracking (Sentry, etc.) configured
- [ ] Rate limiting configured
- [ ] API keys rotated and secured
- [ ] Database backups configured
- [ ] Monitoring and alerts configured

## Security Considerations

1. **API Keys**: Store all API keys in environment variables, never in code
2. **Encryption**: Encrypt sensitive data (tokens, passwords) before storing in database
3. **HTTPS**: Always use HTTPS for webhooks and API calls
4. **Signature Verification**: Verify webhook signatures from all providers
5. **Rate Limiting**: Implement rate limiting on all public endpoints
6. **CORS**: Configure CORS properly for your domain
7. **Input Validation**: Validate all inputs using Zod schemas
8. **Database**: Use parameterized queries to prevent SQL injection
9. **Secrets Management**: Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
10. **Audit Logging**: Log all important operations for compliance

## Monitoring

### Key Metrics to Monitor

- Background job queue depth
- Job failure rate
- API response times
- Database query performance
- Redis memory usage
- Error rates by feature
- Webhook delivery success rate
- Lead conversion rate
- Call completion rate

### Recommended Tools

- **Monitoring**: Datadog, New Relic, or Prometheus
- **Logging**: ELK Stack, Splunk, or CloudWatch
- **Error Tracking**: Sentry or Rollbar
- **APM**: New Relic, Datadog, or Elastic APM
- **Dashboards**: Grafana, Kibana, or DataDog

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis is running: `redis-cli ping`
   - Verify REDIS_HOST and REDIS_PORT in .env
   - Check firewall rules

2. **Database Connection Failed**
   - Verify DATABASE_URL is correct
   - Check MySQL user has correct permissions
   - Verify firewall allows connection

3. **Webhook Not Received**
   - Check webhook URL is accessible from internet
   - Verify firewall allows incoming requests
   - Check webhook signature verification
   - Monitor webhook logs in database

4. **Background Jobs Not Processing**
   - Check Redis is running
   - Verify BullMQ workers are started
   - Check job queue status: `redis-cli KEYS "bull:*"`
   - Check worker logs for errors

5. **API Rate Limiting**
   - Implement exponential backoff in job retries
   - Use queue concurrency settings to control load
   - Monitor rate limits from external APIs

## Next Steps

1. Review and customize the code for your specific needs
2. Add additional error handling and logging
3. Implement comprehensive testing
4. Set up CI/CD pipeline for automated deployments
5. Configure monitoring and alerting
6. Train your team on the new features
7. Plan phased rollout to users
