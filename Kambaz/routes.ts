import type { Express, Request, RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type { Database, User } from "./Database";
import Dao from "./dao";
import { HttpError, requiredText, numeric } from "../http";
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}
const publicUser = ({ password: _password, ...user }: User) => user;
export default function Kambaz(app: Express, db: Database) {
  const dao = Dao(db);
  const current = (req: Request) => {
    const user = db.users.find((u) => u._id === req.session.userId);
    if (!user) throw new HttpError(401, "Please sign in");
    return user;
  };
  const faculty: RequestHandler = (req, _res, next) => {
    if (!["FACULTY", "ADMIN"].includes(current(req).role))
      throw new HttpError(403, "Faculty access required");
    next();
  };
  const userId = (req: Request) =>
    req.params.userId === "current"
      ? current(req)._id
      : String(req.params.userId);
  const manageEnrollment: RequestHandler = (req, _res, next) => {
    const user = current(req);
    if (user._id !== userId(req) && !["FACULTY", "ADMIN"].includes(user.role))
      throw new HttpError(403, "Cannot change another user's enrollment");
    next();
  };
  function createUser(body: Partial<User>) {
    const username = requiredText(body.username, "Username"),
      password = requiredText(body.password, "Password");
    if (db.users.some((u) => u.username === username))
      throw new HttpError(409, "Username already in use");
    const user: User = {
      _id: randomUUID(),
      username,
      password,
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      role: body.role ?? "STUDENT",
      email: body.email ?? "",
      dob: body.dob ?? "",
      loginId: "",
      section: "",
      lastActivity: "",
      totalActivity: "",
    };
    db.users.push(user);
    return user;
  }
  app.post("/api/users/signin", (req, res) => {
    const user = db.users.find(
      (u) =>
        u.username === req.body.username && u.password === req.body.password,
    );
    if (!user) throw new HttpError(401, "Invalid username or password");
    req.session.regenerate((err) => {
      if (err) {
        res.status(500).json({ message: "Unable to create session" });
        return;
      }
      req.session.userId = user._id;
      res.json(publicUser(user));
    });
  });
  app.post("/api/users/signup", (req, res) => {
    const user = createUser({ ...req.body, role: "STUDENT" });
    req.session.userId = user._id;
    res.status(201).json(publicUser(user));
  });
  app.get("/api/users/profile", (req, res) => {
    res.json(publicUser(current(req)));
  });
  app.post("/api/users/signout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: "Unable to sign out" });
        return;
      }
      res.clearCookie("connect.sid");
      res.sendStatus(200);
    });
  });
  app.get("/api/users", (_req, res) => {
    res.json(db.users.map(publicUser));
  });
  app.post("/api/users", faculty, (req, res) => {
    res.status(201).json(publicUser(createUser(req.body)));
  });
  app.put("/api/users/:userId", (req, res) => {
    const actor = current(req),
      id = userId(req);
    if (actor._id !== id && !["ADMIN", "FACULTY"].includes(actor.role))
      throw new HttpError(403, "Cannot update another user");
    const user = dao.find(db.users, id),
      username = requiredText(req.body.username ?? user.username, "Username");
    if (db.users.some((u) => u._id !== id && u.username === username))
      throw new HttpError(409, "Username already in use");
    for (const key of [
      "firstName",
      "lastName",
      "email",
      "dob",
      "loginId",
      "section",
    ] as const)
      if (typeof req.body[key] === "string") user[key] = req.body[key];
    user.username = username;
    if (req.body.password)
      user.password = requiredText(req.body.password, "Password");
    if (
      ["FACULTY", "ADMIN"].includes(actor.role) &&
      typeof req.body.role === "string"
    )
      user.role = req.body.role;
    res.json(publicUser(user));
  });
  app.delete("/api/users/:userId", faculty, (req, res) => {
    const id = userId(req);
    dao.find(db.users, id);
    db.users = db.users.filter((u) => u._id !== id);
    db.enrollments = db.enrollments.filter((e) => e.user !== id);
    res.sendStatus(200);
  });
  app.get("/api/enrollments", (_req, res) => {
    res.json(db.enrollments);
  });
  app.get("/api/users/:userId/courses", (req, res) => {
    res.json(dao.coursesForUser(userId(req)));
  });
  app.post(
    "/api/users/:userId/courses/:courseId",
    manageEnrollment,
    (req, res) => {
      res
        .status(201)
        .json(dao.enroll(userId(req), String(req.params.courseId)));
    },
  );
  app.delete(
    "/api/users/:userId/courses/:courseId",
    manageEnrollment,
    (req, res) => {
      const user = userId(req);
      db.enrollments = db.enrollments.filter(
        (e) => !(e.user === user && e.course === req.params.courseId),
      );
      res.sendStatus(200);
    },
  );
  app.get("/api/courses", (_req, res) => {
    res.json(db.courses);
  });
  app.get("/api/courses/:courseId", (req, res) => {
    res.json(dao.find(db.courses, String(req.params.courseId)));
  });
  const createCourse: RequestHandler = (req, res) => {
    const name = requiredText(req.body.name, "Course name");
    const course = {
      _id: randomUUID(),
      name,
      description: String(req.body.description ?? ""),
      image: String(req.body.image ?? "/images/reactjs.jpg"),
      number: String(req.body.number ?? ""),
      startDate: String(req.body.startDate ?? ""),
    };
    db.courses.push(course);
    dao.enroll(current(req)._id, course._id);
    res.status(201).json(course);
  };
  app.post("/api/users/current/courses", faculty, createCourse);
  app.post("/api/courses", faculty, createCourse);
  app.put("/api/courses/:courseId", faculty, (req, res) => {
    const course = dao.find(db.courses, String(req.params.courseId));
    const name = requiredText(req.body.name ?? course.name, "Course name");
    Object.assign(course, req.body, { _id: course._id, name });
    res.json(course);
  });
  app.delete("/api/courses/:courseId", faculty, (req, res) => {
    dao.deleteCourse(String(req.params.courseId));
    res.sendStatus(200);
  });
  app.get("/api/courses/:courseId/users", (req, res) => {
    res.json(
      db.users
        .filter((u) =>
          db.enrollments.some(
            (e) => e.user === u._id && e.course === req.params.courseId,
          ),
        )
        .map(publicUser),
    );
  });
  app.get("/api/courses/:courseId/modules", (req, res) => {
    dao.find(db.courses, String(req.params.courseId));
    res.json(db.modules.filter((m) => m.course === req.params.courseId));
  });
  app.post("/api/courses/:courseId/modules", faculty, (req, res) => {
    const course = String(req.params.courseId);
    dao.find(db.courses, course);
    const module = {
      _id: randomUUID(),
      course,
      name: requiredText(req.body.name, "Module name"),
      lessons: [],
    };
    db.modules.push(module);
    res.status(201).json(module);
  });
  app.put("/api/modules/:moduleId", faculty, (req, res) => {
    const module = dao.find(db.modules, String(req.params.moduleId));
    module.name = requiredText(req.body.name, "Module name");
    res.json(module);
  });
  app.delete("/api/modules/:moduleId", faculty, (req, res) => {
    dao.find(db.modules, String(req.params.moduleId));
    db.modules = db.modules.filter((m) => m._id !== req.params.moduleId);
    res.sendStatus(200);
  });
  app.get("/api/courses/:courseId/assignments", (req, res) => {
    dao.find(db.courses, String(req.params.courseId));
    res.json(db.assignments.filter((a) => a.course === req.params.courseId));
  });
  app.get("/api/assignments/:assignmentId", (req, res) => {
    res.json(dao.find(db.assignments, String(req.params.assignmentId)));
  });
  app.post("/api/courses/:courseId/assignments", faculty, (req, res) => {
    const course = String(req.params.courseId);
    dao.find(db.courses, course);
    const title = requiredText(req.body.title, "Title"),
      points = numeric(req.body.points ?? 100);
    if (points < 0) throw new HttpError(400, "Points cannot be negative");
    const assignment = {
      description: "",
      dueDate: "",
      availableFrom: "",
      availableUntil: "",
      group: "ASSIGNMENTS",
      gradeAs: "Percentage",
      submissionType: "Online",
      entryOptions: ["Website URL"],
      assignTo: "Everyone",
      notes: "",
      ...req.body,
      _id: randomUUID(),
      course,
      title,
      points,
    };
    db.assignments.push(assignment);
    res.status(201).json(assignment);
  });
  app.put("/api/assignments/:assignmentId", faculty, (req, res) => {
    const assignment = dao.find(
      db.assignments,
      String(req.params.assignmentId),
    );
    const title = requiredText(req.body.title ?? assignment.title, "Title"),
      points = numeric(req.body.points ?? assignment.points);
    if (points < 0) throw new HttpError(400, "Points cannot be negative");
    Object.assign(assignment, req.body, {
      _id: assignment._id,
      course: assignment.course,
      title,
      points,
    });
    res.json(assignment);
  });
  app.delete("/api/assignments/:assignmentId", faculty, (req, res) => {
    dao.find(db.assignments, String(req.params.assignmentId));
    db.assignments = db.assignments.filter(
      (a) => a._id !== req.params.assignmentId,
    );
    res.sendStatus(200);
  });
}
