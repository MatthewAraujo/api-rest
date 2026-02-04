import fastify from 'fastify'
import cookie from '@fastify/cookie'
import { ZodError } from 'zod'

import { transactionsRoutes } from './routes/transactions'
import { categoriesRoutes } from './routes/categories'

export const app = fastify()

app.register(cookie)

// Error handler for validation errors
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      issues: error.issues,
    })
  }

  return reply.status(500).send({ message: 'Internal server error' })
})

app.register(transactionsRoutes, {
  prefix: 'transactions',
})

app.register(categoriesRoutes, {
  prefix: 'categories',
})
