# Swagger/OpenAPI Setup Guide

This guide explains how to add Swagger/OpenAPI documentation to the backend API.

---

## Installation

### Step 1: Install Swagger Dependencies

```bash
cd backend
npm install @fastify/swagger @fastify/swagger-ui --save
```

### Step 2: Update `backend/src/app.ts`

Add the following imports at the top of the file:

```typescript
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
```

Add Swagger configuration before registering routes (after creating the Fastify instance):

```typescript
// Register Swagger
await app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'IIoT Account Intelligence API',
      description: 'AI-powered account intelligence, competitive intelligence, and news digest platform',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: config.apiUrl || 'http://localhost:4001',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Reports', description: 'Report generation and management' },
      { name: 'Podcasts', description: 'Podcast generation endpoints' },
      { name: 'Templates', description: 'Template management' },
      { name: 'Schedules', description: 'Schedule management' },
      { name: 'Users', description: 'User management (Admin)' },
      { name: 'Analytics', description: 'Analytics and statistics' },
      { name: 'Admin', description: 'System administration' },
    ],
  },
});

await app.register(swaggerUI, {
  routePrefix: '/api/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
  staticCSP: true,
});
```

### Step 3: Add Route Schemas

Update route files to include OpenAPI schemas. Example for `auth.routes.ts`:

```typescript
// Login endpoint
app.post(
  '/login',
  {
    schema: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate user with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 8, example: 'password123' },
        },
      },
      response: {
        200: {
          description: 'Successful login',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'uuid' },
                    email: { type: 'string', example: 'user@example.com' },
                    role: { type: 'string', enum: ['USER', 'ADMIN'] },
                  },
                },
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
              },
            },
          },
        },
        401: {
          description: 'Invalid credentials',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INVALID_CREDENTIALS' },
                message: { type: 'string', example: 'Invalid email or password' },
              },
            },
          },
        },
      },
    },
  },
  async (request, reply) => {
    // Handler implementation
  }
);
```

### Step 4: Common Schema Definitions

Create `backend/src/schemas/common.ts`:

```typescript
export const errorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object' },
      },
    },
  },
};

export const successSchema = (dataSchema: any) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
  },
});

export const paginatedSchema = (itemSchema: any) => ({
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: itemSchema,
    },
    total: { type: 'integer', example: 100 },
    page: { type: 'integer', example: 1 },
    pageSize: { type: 'integer', example: 20 },
  },
});

export const reportSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'uuid' },
    title: { type: 'string', example: 'Cisco Systems Account Intelligence' },
    workflowType: {
      type: 'string',
      enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST'],
    },
    status: {
      type: 'string',
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    },
    format: {
      type: 'array',
      items: { type: 'string', enum: ['PDF', 'DOCX', 'PODCAST'] },
    },
    createdAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};
```

### Step 5: Update All Route Files

Apply schema definitions to all route files:
- `auth.routes.ts`
- `reports.routes.ts`
- `podcast.routes.ts`
- `templates.routes.ts`
- `schedules.routes.ts`
- `users.routes.ts`
- `analytics.routes.ts`

### Step 6: Test Swagger UI

1. Start the backend:
```bash
npm run dev
```

2. Open browser to:
```
http://localhost:4001/api/docs
```

3. You should see the Swagger UI with all documented endpoints

### Step 7: Update Nginx Configuration

Add Swagger documentation route to `nginx/nginx.conf`:

```nginx
# API Documentation
location /api/docs {
    proxy_pass http://backend_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## Benefits of Swagger Documentation

1. **Interactive API Testing**: Test endpoints directly from the browser
2. **Auto-generated Documentation**: Always up-to-date with code
3. **Type Safety**: Validates request/response schemas
4. **Client Code Generation**: Generate SDKs in multiple languages
5. **Developer Onboarding**: Easy for new developers to understand API

---

## Example Schemas for Key Endpoints

### POST /api/reports (Create Report)

```typescript
{
  schema: {
    tags: ['Reports'],
    summary: 'Create new report',
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['workflowType', 'configuration', 'inputData', 'format'],
      properties: {
        workflowType: {
          type: 'string',
          enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST'],
        },
        title: { type: 'string', example: 'Q4 Account Review' },
        configuration: {
          type: 'object',
          properties: {
            sections: {
              type: 'array',
              items: { type: 'string' },
            },
            depth: {
              type: 'string',
              enum: ['brief', 'standard', 'detailed'],
            },
          },
        },
        inputData: {
          type: 'object',
          properties: {
            companyName: { type: 'string', example: 'Cisco Systems' },
          },
        },
        format: {
          type: 'array',
          items: { type: 'string', enum: ['PDF', 'DOCX', 'PODCAST'] },
        },
        podcastOptions: {
          type: 'object',
          nullable: true,
          properties: {
            template: {
              type: 'string',
              enum: ['EXECUTIVE_BRIEF', 'STRATEGIC_DEBATE', 'INDUSTRY_PULSE'],
            },
            duration: {
              type: 'string',
              enum: ['SHORT', 'STANDARD', 'LONG'],
            },
          },
        },
      },
    },
    response: {
      201: successSchema(reportSchema),
      400: errorSchema,
      401: errorSchema,
    },
  },
}
```

### GET /api/reports (List Reports)

```typescript
{
  schema: {
    tags: ['Reports'],
    summary: 'List user reports',
    security: [{ bearerAuth: [] }],
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        workflowType: {
          type: 'string',
          enum: ['ACCOUNT_INTELLIGENCE', 'COMPETITIVE_INTELLIGENCE', 'NEWS_DIGEST'],
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        },
      },
    },
    response: {
      200: successSchema(paginatedSchema(reportSchema)),
      401: errorSchema,
    },
  },
}
```

---

## OpenAPI Specification Export

Once Swagger is configured, you can export the OpenAPI spec:

```bash
# Get JSON specification
curl http://localhost:4001/api/docs/json > openapi.json

# Get YAML specification
curl http://localhost:4001/api/docs/yaml > openapi.yaml
```

This can be used for:
- Client SDK generation (OpenAPI Generator)
- API testing tools (Postman, Insomnia)
- Documentation hosting (ReadMe, Stoplight)
- Contract testing

---

## Security Considerations

### Disable in Production (Optional)

If you want to disable Swagger in production:

```typescript
if (config.nodeEnv !== 'production') {
  await app.register(swagger, {
    // ... configuration
  });

  await app.register(swaggerUI, {
    // ... configuration
  });
}
```

### Protect with Authentication

Add middleware to require authentication for Swagger UI:

```typescript
app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/api/docs')) {
    // Require authentication or IP whitelist
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  }
});
```

---

## Next Steps

1. Install dependencies
2. Update `app.ts` with Swagger registration
3. Add schemas to all route files
4. Test Swagger UI locally
5. Update nginx configuration
6. Deploy to production

**Estimated Time**: 2-4 hours for complete implementation

---

**Last Updated**: 2025-11-26
