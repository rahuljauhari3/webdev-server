import { randomUUID } from "node:crypto";
import type { Database } from "./Database";
import { HttpError } from "../http";
export default function Dao(db: Database) {
  function find<T extends { _id: string }>(rows: T[], id: string): T {
    const row = rows.find((r) => r._id === id);
    if (!row) throw new HttpError(404, "Resource not found");
    return row;
  }
  function enroll(user: string, course: string) {
    find(db.users, user);
    find(db.courses, course);
    let row = db.enrollments.find(
      (e) => e.user === user && e.course === course,
    );
    if (!row) {
      row = { _id: randomUUID(), user, course };
      db.enrollments.push(row);
    }
    return row;
  }
  function coursesForUser(user: string) {
    return db.courses.filter((c) =>
      db.enrollments.some((e) => e.course === c._id && e.user === user),
    );
  }
  function deleteCourse(id: string) {
    find(db.courses, id);
    db.courses = db.courses.filter((c) => c._id !== id);
    db.modules = db.modules.filter((m) => m.course !== id);
    db.assignments = db.assignments.filter((a) => a.course !== id);
    db.enrollments = db.enrollments.filter((e) => e.course !== id);
  }
  return { find, enroll, coursesForUser, deleteCourse };
}
