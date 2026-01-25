
import { z } from 'zod';
import { insertUserSchema, insertPairSchema, insertSignalSchema, pairs, signals, users, settings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  pairs: {
    list: {
      method: 'GET' as const,
      path: '/api/pairs',
      responses: {
        200: z.array(z.custom<typeof pairs.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/pairs/:id',
      input: insertPairSchema.partial(),
      responses: {
        200: z.custom<typeof pairs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  signals: {
    list: {
      method: 'GET' as const,
      path: '/api/signals',
      input: z.object({
        status: z.enum(['active', 'closed']).optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof signals.$inferSelect & { pair: typeof pairs.$inferSelect }>()),
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/signals/stats',
      responses: {
        200: z.object({
          totalSignals: z.number(),
          winRate: z.number(),
          wins: z.number(),
          losses: z.number(),
          byPair: z.record(z.object({
            total: z.number(),
            winRate: z.number(),
          })),
        }),
      },
    },
    // Admin only - manually create signal (or for testing)
    create: {
      method: 'POST' as const,
      path: '/api/signals',
      input: insertSignalSchema,
      responses: {
        201: z.custom<typeof signals.$inferSelect>(),
      },
    }
  },
  admin: {
    users: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/users',
        responses: {
          200: z.array(z.custom<typeof users.$inferSelect>()),
        },
      },
      block: {
        method: 'POST' as const,
        path: '/api/admin/users/:id/block',
        input: z.object({ isBlocked: z.boolean() }),
        responses: {
          200: z.custom<typeof users.$inferSelect>(),
        },
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
