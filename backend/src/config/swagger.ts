import { config } from './index';

/**
 * OpenAPI 3.0 Specification – auto-served at /api/docs
 * Generated manually (no swagger-jsdoc to keep dependencies lean).
 */
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Haushaltsbuch API',
    version: '1.2.0',
    description: 'REST API für das Haushaltsbuch – persönlicher Finanzmanager mit OIDC SSO.',
    contact: { name: 'Haushaltsbuch', url: config.frontendUrl },
  },
  servers: [
    { url: `${config.frontendUrl}/api`, description: 'Production' },
    { url: 'http://localhost:3001/api', description: 'Development' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Token aus dem OIDC Login-Flow',
      },
    },
    schemas: {
      Transaction: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          user_id:        { type: 'string', format: 'uuid' },
          category_id:    { type: 'string', format: 'uuid', nullable: true },
          type:           { type: 'string', enum: ['income', 'expense'] },
          amount:         { type: 'number', example: 42.50 },
          description:    { type: 'string', nullable: true, example: 'Supermarkt' },
          date:           { type: 'string', format: 'date', example: '2026-05-01' },
          status:         { type: 'string', enum: ['bezahlt', 'ausstehend'] },
          category_name:  { type: 'string', nullable: true },
          category_icon:  { type: 'string', nullable: true },
          category_color: { type: 'string', nullable: true },
          created_at:     { type: 'string', format: 'date-time' },
          updated_at:     { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id:        { type: 'string', format: 'uuid' },
          name:      { type: 'string', example: 'Lebensmittel' },
          icon:      { type: 'string', example: '🛒' },
          color:     { type: 'string', example: '#22c55e' },
          type:      { type: 'string', enum: ['income', 'expense', 'both'] },
          is_system: { type: 'boolean' },
        },
      },
      Budget: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          category_id: { type: 'string', format: 'uuid', nullable: true },
          month:       { type: 'integer', minimum: 1, maximum: 12 },
          year:        { type: 'integer', minimum: 2000 },
          amount:      { type: 'number', example: 2000 },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error:   { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/auth/login': {
      get: {
        tags: ['Auth'],
        summary: 'OIDC Login initiieren',
        description: 'Leitet zum OIDC-Provider (Pocket ID) weiter. Kein Token erforderlich.',
        security: [],
        responses: { '302': { description: 'Redirect zum OIDC-Provider' } },
      },
    },
    '/auth/callback': {
      get: {
        tags: ['Auth'],
        summary: 'OIDC Callback',
        description: 'Wird vom OIDC-Provider nach erfolgreicher Anmeldung aufgerufen.',
        security: [],
        parameters: [
          { name: 'code',  in: 'query', required: true,  schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true,  schema: { type: 'string' } },
        ],
        responses: {
          '302': { description: 'Redirect zum Frontend mit JWT Token' },
          '400': { description: 'Ungültiger State / abgelaufen' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Aktuellen Benutzer abrufen',
        responses: {
          '200': {
            description: 'Benutzer-Informationen',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        email:  { type: 'string' },
                        name:   { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Nicht authentifiziert' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Abmelden (OIDC Logout)',
        responses: {
          '200': {
            description: 'Logout-URL zum OIDC-Provider',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { logoutUrl: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/transactions': {
      get: {
        tags: ['Transaktionen'],
        summary: 'Transaktionen auflisten',
        parameters: [
          { name: 'month',       in: 'query', schema: { type: 'integer' } },
          { name: 'year',        in: 'query', schema: { type: 'integer' } },
          { name: 'type',        in: 'query', schema: { type: 'string', enum: ['income','expense'] } },
          { name: 'status',      in: 'query', schema: { type: 'string', enum: ['bezahlt','ausstehend'] } },
          { name: 'category_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'limit',       in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset',      in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Liste der Transaktionen',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data:  { type: 'array', items: { '$ref': '#/components/schemas/Transaction' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Transaktionen'],
        summary: 'Neue Transaktion erstellen',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'amount', 'date'],
                properties: {
                  type:        { type: 'string', enum: ['income','expense'] },
                  amount:      { type: 'number', minimum: 0.01 },
                  date:        { type: 'string', format: 'date' },
                  description: { type: 'string' },
                  category_id: { type: 'string', format: 'uuid', nullable: true },
                  status:      { type: 'string', enum: ['bezahlt','ausstehend'], default: 'bezahlt' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Transaktion erstellt' },
          '400': { description: 'Validierungsfehler' },
        },
      },
    },
    '/transactions/summary': {
      get: {
        tags: ['Transaktionen'],
        summary: 'Monatsübersicht (Einnahmen, Ausgaben, Saldo, Charts)',
        parameters: [
          { name: 'month', in: 'query', schema: { type: 'integer' } },
          { name: 'year',  in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Zusammenfassung des Monats' } },
      },
    },
    '/transactions/{id}': {
      put: {
        tags: ['Transaktionen'],
        summary: 'Transaktion bearbeiten',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Aktualisiert' }, '404': { description: 'Nicht gefunden' } },
      },
      delete: {
        tags: ['Transaktionen'],
        summary: 'Transaktion löschen',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Gelöscht' }, '404': { description: 'Nicht gefunden' } },
      },
    },
    '/transactions/{id}/pay': {
      patch: {
        tags: ['Transaktionen'],
        summary: 'Transaktion als bezahlt markieren',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status auf bezahlt gesetzt' } },
      },
    },
    '/categories': {
      get: {
        tags: ['Kategorien'],
        summary: 'Alle Kategorien des Benutzers',
        responses: { '200': { description: 'Kategorienliste' } },
      },
      post: {
        tags: ['Kategorien'],
        summary: 'Neue Kategorie erstellen',
        responses: { '201': { description: 'Erstellt' } },
      },
    },
    '/categories/{id}': {
      put:    { tags: ['Kategorien'], summary: 'Kategorie bearbeiten',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Aktualisiert' } } },
      delete: { tags: ['Kategorien'], summary: 'Kategorie löschen',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Gelöscht' } } },
    },
    '/budgets': {
      get: {
        tags: ['Budgets'],
        summary: 'Budgets für einen Monat',
        parameters: [
          { name: 'month', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'year',  in: 'query', required: true, schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Liste der Budgets' } },
      },
      post: {
        tags: ['Budgets'],
        summary: 'Budget anlegen oder aktualisieren (upsert)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['month', 'year', 'amount'],
                properties: {
                  category_id: { type: 'string', format: 'uuid', nullable: true,
                    description: 'null = Gesamtbudget' },
                  month:  { type: 'integer', minimum: 1, maximum: 12 },
                  year:   { type: 'integer' },
                  amount: { type: 'number', minimum: 0.01 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Budget gespeichert' } },
      },
    },
    '/budgets/overview': {
      get: {
        tags: ['Budgets'],
        summary: 'Budget-Übersicht inkl. bezahlt/ausstehend/verfügbar',
        parameters: [
          { name: 'month', in: 'query', schema: { type: 'integer' } },
          { name: 'year',  in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Budget-Übersicht',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalBudget:          { type: 'number' },
                    totalIncome:          { type: 'number' },
                    paid:                 { type: 'number' },
                    pending:              { type: 'number' },
                    available:            { type: 'number' },
                    usedPercent:          { type: 'integer' },
                    paidPercent:          { type: 'integer' },
                    pendingPercent:       { type: 'integer' },
                    pendingTransactions:  { type: 'array', items: { '$ref': '#/components/schemas/Transaction' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/budgets/{id}': {
      delete: {
        tags: ['Budgets'],
        summary: 'Budget löschen',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Gelöscht' } },
      },
    },
  },
};
