import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'

describe('Categories Routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  describe('POST /categories', () => {
    it('should be able to create a new category', async () => {
      // First create a transaction to get a sessionId
      const createTransactionResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'New Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createTransactionResponse.get('Set-Cookie')

      await request(app.server)
        .post('/categories')
        .set('Cookie', cookies)
        .send({
          name: 'Food',
        })
        .expect(201)
    })

    it('should not be able to create a category without a sessionId', async () => {
      await request(app.server)
        .post('/categories')
        .send({
          name: 'Food',
        })
        .expect(401)
    })

    it('should return validation error when name is missing', async () => {
      // First create a transaction to get a sessionId
      const createTransactionResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'New Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createTransactionResponse.get('Set-Cookie')

      const response = await request(app.server)
        .post('/categories')
        .set('Cookie', cookies)
        .send({})
        .expect(400)

      expect(response.body.message).toBe('Validation error')
    })
  })

  describe('DELETE /categories/:id', () => {
    it('should be able to delete a category', async () => {
      // First create a transaction to get a sessionId
      const createTransactionResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'New Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createTransactionResponse.get('Set-Cookie')

      // Create a category
      await request(app.server)
        .post('/categories')
        .set('Cookie', cookies)
        .send({
          name: 'Food',
        })

      // Get the category ID from database (for testing purposes, we'll use a mock UUID)
      // In a real scenario, we'd need a GET endpoint to retrieve the category
      // For now, we'll directly query the database
      const { knex } = await import('../src/database')
      const categories = await knex('categories').select('id')
      const categoryId = categories[0].id

      await request(app.server)
        .delete(`/categories/${categoryId}`)
        .set('Cookie', cookies)
        .expect(204)
    })

    it('should not be able to delete a category without a sessionId', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000'

      await request(app.server)
        .delete(`/categories/${categoryId}`)
        .expect(401)
    })

    it('should return 404 when trying to delete a non-existent category', async () => {
      // First create a transaction to get a sessionId
      const createTransactionResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'New Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createTransactionResponse.get('Set-Cookie')

      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'

      await request(app.server)
        .delete(`/categories/${nonExistentId}`)
        .set('Cookie', cookies)
        .expect(404)
    })

    it('should return validation error for invalid UUID format', async () => {
      // First create a transaction to get a sessionId
      const createTransactionResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'New Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createTransactionResponse.get('Set-Cookie')

      const response = await request(app.server)
        .delete('/categories/invalid-uuid')
        .set('Cookie', cookies)
        .expect(400)

      expect(response.body.message).toBe('Validation error')
    })
  })
})
