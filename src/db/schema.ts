import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  username: text('username').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  name: text('name').notNull(),
  balance: doublePrecision('balance').default(2500).notNull(),
  population: integer('population').default(60).notNull(),
  happiness: integer('happiness').default(100).notNull(),
  gridSize: integer('grid_size').default(5).notNull(),
  incomePerSec: doublePrecision('income_per_sec').default(25).notNull(),
  lastSyncAt: timestamp('last_sync_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  cityId: integer('city_id')
    .references(() => cities.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'RESIDENTIAL' | 'BUSINESS' | 'PARK'
  subType: text('sub_type').notNull(), // 'TOWNHOUSE' | 'SKY_RESIDENCE' | 'CAFE' | 'TECH_HUB' | 'CENTRAL_BANK' | 'ECO_PARK' | 'BOTANICAL_DOME'
  level: integer('level').default(1).notNull(),
  gridX: integer('grid_x').notNull(),
  gridY: integer('grid_y').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bridges = pgTable('bridges', {
  id: serial('id').primaryKey(),
  fromCityId: integer('from_city_id')
    .references(() => cities.id, { onDelete: 'cascade' })
    .notNull(),
  toCityId: integer('to_city_id')
    .references(() => cities.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'PENDING' | 'ACTIVE'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  city: one(cities, {
    fields: [users.id],
    references: [cities.userId],
  }),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  owner: one(users, {
    fields: [cities.userId],
    references: [users.id],
  }),
  buildings: many(buildings),
  outgoingBridges: many(bridges, { relationName: 'outgoingBridges' }),
  incomingBridges: many(bridges, { relationName: 'incomingBridges' }),
}));

export const buildingsRelations = relations(buildings, ({ one }) => ({
  city: one(cities, {
    fields: [buildings.cityId],
    references: [cities.id],
  }),
}));

export const bridgesRelations = relations(bridges, ({ one }) => ({
  fromCity: one(cities, {
    fields: [bridges.fromCityId],
    references: [cities.id],
    relationName: 'outgoingBridges',
  }),
  toCity: one(cities, {
    fields: [bridges.toCityId],
    references: [cities.id],
    relationName: 'incomingBridges',
  }),
}));
