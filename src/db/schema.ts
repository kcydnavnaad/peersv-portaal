import {
  bigserial,
  boolean,
  date,
  decimal,
  integer,
  numeric,
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

export const performanceStatusEnum = pgEnum("performance_status", [
  "open",
  "paid",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "training",
  "match",
  "meeting",
  "tournament",
  "other",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "scheduled",
  "cancelled",
]);

export const emailTokenPurposeEnum = pgEnum("email_token_purpose", [
  "password_reset",
  "invite",
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
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  mfaSecret: varchar("mfa_secret", { length: 64 }),
  mfaRequired: boolean("mfa_required").default(false).notNull(),
  isAlsoTrainer: boolean("is_also_trainer").default(false).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const authEvents = pgTable("auth_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  email: varchar("email", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 32 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
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

export const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  isDefault: boolean("is_default").notNull().default(false),
  isDefaultVisible: boolean("is_default_visible").notNull().default(true),
  requiresTeam: boolean("requires_team").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trainerActivityAccess = pgTable(
  "trainer_activity_access",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityTypeId: integer("activity_type_id")
      .notNull()
      .references(() => activityTypes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.userId, t.activityTypeId)],
);

export const trainerRateOverrides = pgTable(
  "trainer_rate_overrides",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityTypeId: integer("activity_type_id")
      .notNull()
      .references(() => activityTypes.id, { onDelete: "cascade" }),
    rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.userId, t.activityTypeId)],
);

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 100 }),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    calendarToken: varchar("calendar_token", { length: 48 }),
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

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  type: eventTypeEnum("type").notNull().default("training"),
  status: eventStatusEnum("status").notNull().default("scheduled"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").notNull().default(false),
  location: varchar("location", { length: 200 }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }),
  seriesId: varchar("series_id", { length: 36 }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailTokens = pgTable("email_tokens", {
  id: serial("id").primaryKey(),
  purpose: emailTokenPurposeEnum("purpose").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const mfaRecoveryCodes = pgTable("mfa_recovery_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
});

export const performances = pgTable("performances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id, {
    onDelete: "restrict",
  }),
  activityTypeId: integer("activity_type_id")
    .notNull()
    .references(() => activityTypes.id),
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

export const attendances = pgTable(
  "attendances",
  {
    id: serial("id").primaryKey(),
    performanceId: integer("performance_id")
      .notNull()
      .references(() => performances.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    present: boolean("present").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("attendances_performance_member_unique").on(t.performanceId, t.memberId),
  ],
);

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
export type Attendance = typeof attendances.$inferSelect;
export type NewAttendance = typeof attendances.$inferInsert;