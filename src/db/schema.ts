import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision, boolean } from 'drizzle-orm/pg-core';

// Users table with Firebase Auth UID linkage
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  neighborhood: text('neighborhood').default('Център'),
  rank: text('rank').default('Новак доброволец'),
  weeklyPoints: integer('weekly_points').default(50),
  totalPoints: integer('total_points').default(50),
  resolvedCount: integer('resolved_count').default(0),
  skills: text('skills'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Civic reports table
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  ticketNumber: text('ticket_number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  priority: text('priority').notNull(),
  path: text('path').notNull(), // 'blue' | 'yellow' | 'red'
  urgencyScore: integer('urgency_score').notNull(),
  location: text('location').notNull(),
  neighborhood: text('neighborhood').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  imageUrl: text('image_url'),
  status: text('status').notNull().default('нови'),
  volunteersCount: integer('volunteers_count').default(0),
  assignedDepartment: text('assigned_department'),
  municipalNotes: text('municipal_notes'),
  analysisJson: text('analysis_json'),
  historyLogJson: text('history_log_json'),
  resolvedImageUrl: text('resolved_image_url'),
  resolvedAt: text('resolved_at'),
  resolvedByVolunteer: text('resolved_by_volunteer'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Volunteer assignments table linking users and reports
export const volunteerAssignments = pgTable('volunteer_assignments', {
  id: serial('id').primaryKey(),
  reportId: text('report_id')
    .references(() => reports.id)
    .notNull(),
  userUid: text('user_uid')
    .references(() => users.uid)
    .notNull(),
  volunteerName: text('volunteer_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignments: many(volunteerAssignments),
}));

export const reportsRelations = relations(reports, ({ many }) => ({
  assignments: many(volunteerAssignments),
}));

export const volunteerAssignmentsRelations = relations(volunteerAssignments, ({ one }) => ({
  user: one(users, {
    fields: [volunteerAssignments.userUid],
    references: [users.uid],
  }),
  report: one(reports, {
    fields: [volunteerAssignments.reportId],
    references: [reports.id],
  }),
}));
