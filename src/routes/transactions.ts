import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const getTransactionsQuerySchema = z.object({
        // Filters
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        type: z.enum(['credit', 'debit']).optional(),
        minValue: z.coerce.number().optional(),
        maxValue: z.coerce.number().optional(),
        categoryId: z.string().uuid().optional(),
        // Sorting
        sortBy: z.enum(['value', 'date']).optional().default('date'),
        order: z.enum(['asc', 'desc']).optional().default('desc'),
        // Pagination
        page: z.coerce.number().int().positive().optional().default(1),
        limit: z.coerce
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .default(10),
      })

      const queryParams = getTransactionsQuerySchema.parse(request.query)
      const { sessionId } = request.cookies

      // Build base query
      let query = knex('transactions').where('sessionId', sessionId)

      // Apply filters dynamically
      if (queryParams.startDate) {
        query = query.where('createdAt', '>=', queryParams.startDate)
      }
      if (queryParams.endDate) {
        query = query.where('createdAt', '<=', queryParams.endDate)
      }
      if (queryParams.type) {
        if (queryParams.type === 'credit') {
          query = query.where('amount', '>', 0)
        } else {
          query = query.where('amount', '<', 0)
        }
      }
      if (queryParams.minValue !== undefined) {
        query = query.where('amount', '>=', queryParams.minValue)
      }
      if (queryParams.maxValue !== undefined) {
        query = query.where('amount', '<=', queryParams.maxValue)
      }
      if (queryParams.categoryId) {
        query = query.where('categoryId', queryParams.categoryId)
      }

      // Get total count for pagination
      const countResult = await query.clone().count('* as count').first()
      const total = Number(countResult?.count || 0)

      // Apply sorting
      const sortColumn = queryParams.sortBy === 'value' ? 'amount' : 'createdAt'
      query = query.orderBy(sortColumn, queryParams.order)

      // Apply pagination
      const offset = (queryParams.page - 1) * queryParams.limit
      const transactions = await query.limit(queryParams.limit).offset(offset)

      return {
        data: transactions,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total,
          totalPages: Math.ceil(total / queryParams.limit),
        },
      }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const getTransactionsParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getTransactionsParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const transaction = await knex('transactions')
        .where({
          sessionId,
          id,
        })
        .first()

      return {
        transaction,
      }
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
        .where('sessionId', sessionId)
        .sum('amount', { as: 'amount' })
        .first()

      return { summary }
    },
  )

  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
      categoryId: z.string().uuid().optional(),
    })

    const { title, amount, type, categoryId } =
      createTransactionBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      sessionId,
      categoryId: categoryId || null,
    })

    return reply.status(201).send()
  })
}
