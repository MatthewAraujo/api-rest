import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'
describe('Transactions Routes', () => {
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

  it('should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 1000,
        type: 'credit',
      })
      .expect(201)
  })

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 1000,
        type: 'credit',
      })
    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsResponse.body.data).toEqual([
      expect.objectContaining({
        title: 'New Transaction',
        amount: 1000,
      }),
    ])
    expect(listTransactionsResponse.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    })
  })

  it('should be able to get a specific transaction', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 1000,
        type: 'credit',
      })
    const cookies = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionsResponse.body.data[0].id

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New Transaction',
        amount: 1000,
      }),
    )
  })

  it('should be able to get the summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New Transaction',
        amount: 1000,
        type: 'credit',
      })
    const cookies = createTransactionResponse.get('Set-Cookie')

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'Debit Transaction',
        amount: 500,
        type: 'debit',
      })

    const summaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(summaryResponse.body.summary).toEqual({
      amount: 500,
    })
  })

  describe('Filtering', () => {
    it('should filter transactions by type (credit)', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Credit Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Debit Transaction',
          amount: 500,
          type: 'debit',
        })

      const response = await request(app.server)
        .get('/transactions?type=credit')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].amount).toBeGreaterThan(0)
      expect(response.body.pagination.total).toBe(1)
    })

    it('should filter transactions by type (debit)', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Credit Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Debit Transaction',
          amount: 500,
          type: 'debit',
        })

      const response = await request(app.server)
        .get('/transactions?type=debit')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].amount).toBeLessThan(0)
      expect(response.body.pagination.total).toBe(1)
    })

    it('should filter transactions by minValue', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Large Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Small Transaction',
          amount: 100,
          type: 'credit',
        })

      const response = await request(app.server)
        .get('/transactions?minValue=500')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].amount).toBeGreaterThanOrEqual(500)
    })

    it('should filter transactions by maxValue', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Large Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Small Transaction',
          amount: 100,
          type: 'credit',
        })

      const response = await request(app.server)
        .get('/transactions?maxValue=500')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].amount).toBeLessThanOrEqual(500)
    })

    it('should filter transactions by value range', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction 1',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Transaction 2',
          amount: 500,
          type: 'credit',
        })

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Transaction 3',
          amount: 1000,
          type: 'credit',
        })

      const response = await request(app.server)
        .get('/transactions?minValue=200&maxValue=800')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].amount).toBe(500)
    })

    it('should filter transactions by categoryId', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000'
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction with Category',
          amount: 1000,
          type: 'credit',
          categoryId,
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Transaction without Category',
          amount: 500,
          type: 'credit',
        })

      const response = await request(app.server)
        .get(`/transactions?categoryId=${categoryId}`)
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].categoryId).toBe(categoryId)
    })

    it('should apply combined filters', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000'
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Credit with Category',
          amount: 1000,
          type: 'credit',
          categoryId,
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Debit with Category',
          amount: 500,
          type: 'debit',
          categoryId,
        })

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Credit without Category',
          amount: 1000,
          type: 'credit',
        })

      const response = await request(app.server)
        .get(`/transactions?type=credit&categoryId=${categoryId}`)
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].title).toBe('Credit with Category')
    })
  })

  describe('Sorting', () => {
    it('should sort transactions by date in descending order (default)', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'First Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await new Promise((resolve) => setTimeout(resolve, 1000))

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Second Transaction',
          amount: 200,
          type: 'credit',
        })

      const response = await request(app.server)
        .get('/transactions')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].title).toBe('Second Transaction')
      expect(response.body.data[1].title).toBe('First Transaction')
    })

    it('should sort transactions by date in ascending order', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'First Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await new Promise((resolve) => setTimeout(resolve, 1000))

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Second Transaction',
          amount: 200,
          type: 'credit',
        })

      const response = await request(app.server)
        .get('/transactions?sortBy=date&order=asc')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].title).toBe('First Transaction')
      expect(response.body.data[1].title).toBe('Second Transaction')
    })

    it('should sort transactions by value in ascending order', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Large Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Small Transaction',
          amount: 100,
          type: 'credit',
        })

      const response = await request(app.server)
        .get('/transactions?sortBy=value&order=asc')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].amount).toBe(100)
      expect(response.body.data[1].amount).toBe(1000)
    })

    it('should sort transactions by value in descending order', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Large Transaction',
          amount: 1000,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      await request(app.server)
        .post('/transactions')
        .set('Cookie', cookies)
        .send({
          title: 'Small Transaction',
          amount: 100,
          type: 'credit',
        })

      const response = await request(app.server)
        .get('/transactions?sortBy=value&order=desc')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].amount).toBe(1000)
      expect(response.body.data[1].amount).toBe(100)
    })
  })

  describe('Pagination', () => {
    it('should paginate transactions with default values', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      const response = await request(app.server)
        .get('/transactions')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      })
    })

    it('should paginate transactions with custom page and limit', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction 1',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      // Create 5 transactions
      for (let i = 2; i <= 5; i++) {
        await request(app.server)
          .post('/transactions')
          .set('Cookie', cookies)
          .send({
            title: `Transaction ${i}`,
            amount: 100 * i,
            type: 'credit',
          })
      }

      const response = await request(app.server)
        .get('/transactions?page=1&limit=2')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(2)
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      })
    })

    it('should return correct data for second page', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction 1',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      // Create 5 transactions
      for (let i = 2; i <= 5; i++) {
        await request(app.server)
          .post('/transactions')
          .set('Cookie', cookies)
          .send({
            title: `Transaction ${i}`,
            amount: 100 * i,
            type: 'credit',
          })
      }

      const response = await request(app.server)
        .get('/transactions?page=2&limit=2&sortBy=value&order=asc')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0].amount).toBe(300)
      expect(response.body.data[1].amount).toBe(400)
    })

    it('should return empty array for page beyond total pages', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      const response = await request(app.server)
        .get('/transactions?page=10&limit=10')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body.data).toHaveLength(0)
      expect(response.body.pagination.total).toBe(1)
    })
  })

  describe('Validation', () => {
    it('should reject invalid sortBy value', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      const response = await request(app.server)
        .get('/transactions?sortBy=invalid')
        .set('Cookie', cookies)

      expect(response.statusCode).toBe(400)
    })

    it('should reject invalid order value', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      const response = await request(app.server)
        .get('/transactions?order=invalid')
        .set('Cookie', cookies)

      expect(response.statusCode).toBe(400)
    })

    it('should reject invalid page value', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      const response = await request(app.server)
        .get('/transactions?page=0')
        .set('Cookie', cookies)

      expect(response.statusCode).toBe(400)
    })

    it('should reject invalid limit value exceeding maximum', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      const response = await request(app.server)
        .get('/transactions?limit=101')
        .set('Cookie', cookies)

      expect(response.statusCode).toBe(400)
    })

    it('should reject invalid categoryId format', async () => {
      const createResponse = await request(app.server)
        .post('/transactions')
        .send({
          title: 'Transaction',
          amount: 100,
          type: 'credit',
        })
      const cookies = createResponse.get('Set-Cookie')

      const response = await request(app.server)
        .get('/transactions?categoryId=invalid-uuid')
        .set('Cookie', cookies)

      expect(response.statusCode).toBe(400)
    })
  })
})
