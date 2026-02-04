// eslint-disable-next-line
import { knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    transactions: {
      id: string
      title: string
      amount: number
      created_at: string
      sessionId?: string
    }
    categories: {
      id: string
      name: string
      sessionId: string
      created_at: string
    }
  }
}
