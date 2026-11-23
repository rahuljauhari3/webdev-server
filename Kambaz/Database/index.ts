import courseSeed from "./courses.json";
import moduleSeed from "./modules.json";
import assignmentSeed from "./assignments.json";
import userSeed from "./users.json";
import enrollmentSeed from "./enrollments.json";
export function createDatabase() {
  const users = userSeed.map((u) => ({
    ...u,
    password: "123",
    email: `${u.username}@example.com`,
    dob: "",
    loginId: "",
    section: "",
  }));
  users.push({
    _id: "U4",
    username: "faculty",
    password: "123",
    firstName: "Demo",
    lastName: "Faculty",
    role: "FACULTY",
    email: "faculty@example.com",
    dob: "",
    loginId: "",
    section: "",
    lastActivity: "",
    totalActivity: "",
  });
  return {
    courses: courseSeed.map((c) => ({
      ...c,
      number: c._id,
      startDate: "2026-01-15",
    })),
    modules: structuredClone(moduleSeed),
    assignments: assignmentSeed.map((a) => ({
      ...a,
      availableFrom: "",
      availableUntil: "",
      group: "ASSIGNMENTS",
      gradeAs: "Percentage",
      submissionType: "Online",
      entryOptions: ["Website URL"],
      assignTo: "Everyone",
      notes: "",
    })),
    users,
    enrollments: structuredClone(enrollmentSeed),
  };
}
export type Database = ReturnType<typeof createDatabase>;
export type User = Database["users"][number];
