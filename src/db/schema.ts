import {
  boolean,
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const memberStatusEnum = pgEnum("member_status", [
  "active",
  "inactive",
  "pending",
]);

export const userRoleEnum = pgEnum("user_role", ["admin", "trainer"]);

export const performanceTypeEnum = pgEnum("performance_type", [
  "training",
  "match",
  "tournament",
]);

export const performanceStatusEnum = pgEnum("performance_status", [
  "open",
  "paid",
]);

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 50 }),
  birthDate: date("birth_date"),
  team: varchar("team", { length: 100 }),
  status: memberStatusEnum("status").notNull().default("active"),
  joinedAt: date("joined_at").defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  role: userRoleEnum("role").notNull().default("trainer"),
  isButterfly: boolean("is_butterfly").notNull().default(false),
  trainerRate: decimal("trainer_rate", { precision: 10, scale: 2 }),
  iban: text("iban"),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 100 }),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique("teams_name_season_unique").on(t.name, t.seasonId)],
);

export const teamTrainers = pgTable("team_trainers", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isHeadTrainer: boolean("is_head_trainer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    joinedAt: date("joined_at").defaultNow().notNull(),
    leftAt: date("left_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("team_members_team_member_active_unique").on(t.teamId, t.memberId, t.leftAt),
  ],
);

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
});

export const performances = pgTable("performances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "restrict" }),
  type: performanceTypeEnum("type").notNull(),
  performanceDate: date("performance_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  status: performanceStatusEnum("status").notNull().default("open"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidBy: integer("paid_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamTrainer = typeof teamTrainers.$inferSelect;
export type NewTeamTrainer = typeof teamTrainers.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Performance = typeof performances.$inferSelect;
export type NewPerformance = typeof performances.$inferInsert;