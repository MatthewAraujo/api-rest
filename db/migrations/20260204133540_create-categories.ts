import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary()
    table.text('name').notNullable()
    table.text('sessionId').notNullable().index()
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('categories')
}
