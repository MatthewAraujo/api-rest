import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function categoriesRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const createCategoryBodySchema = z.object({
        name: z.string(),
      })

      const { name } = createCategoryBodySchema.parse(request.body)
      const { sessionId } = request.cookies

      await knex('categories').insert({
        id: randomUUID(),
        name,
        sessionId,
      })

      return reply.status(201).send()
    },
  )

  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const deleteCategoryParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = deleteCategoryParamsSchema.parse(request.params)
      const { sessionId } = request.cookies

      const deleted = await knex('categories')
        .where({
          sessionId,
          id,
        })
        .delete()

      if (deleted === 0) {
        return reply.status(404).send({ message: 'Category not found' })
      }

      return reply.status(204).send()
    },
  )
}
