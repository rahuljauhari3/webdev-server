import type { Express } from "express";
import { HttpError, numeric, boolean, requiredText, calculate } from "../http";
export default function Lab5(app: Express) {
  const assignment = {
    id: 1,
    title: "NodeJS Assignment",
    description: "Create a NodeJS server with ExpressJS",
    due: "2021-10-10",
    completed: false,
    score: 0,
  };
  const module = {
    id: "M101",
    name: "Node.js",
    description: "Creating HTTP servers",
    course: "2345",
  };
  let todos = [1, 2, 3, 4].map((id) => ({
    id,
    title: `Task ${id}`,
    completed: id % 2 === 0,
    description: "",
  }));
  let nextId = 5;
  const find = (id: unknown) => {
    const t = todos.find((t) => t.id === numeric(id));
    if (!t) throw new HttpError(404, `Unable to find Todo with ID ${id}`);
    return t;
  };
  app.get("/lab5/welcome", (_req, res) => {
    res.send("Welcome to Lab 5");
  });
  for (const op of ["add", "subtract", "multiply", "divide"])
    app.get(`/lab5/${op}/:a/:b`, (req, res) => {
      res.send(String(calculate(op, req.params.a, req.params.b)));
    });
  app.get("/lab5/calculator", (req, res) => {
    res.send(
      String(calculate(String(req.query.operation), req.query.a, req.query.b)),
    );
  });
  app.get("/lab5/assignment", (_req, res) => {
    res.json(assignment);
  });
  app.get("/lab5/assignment/title", (_req, res) => {
    res.json(assignment.title);
  });
  app.get("/lab5/assignment/title/:value", (req, res) => {
    assignment.title = requiredText(req.params.value, "Title");
    res.json(assignment);
  });
  app.get("/lab5/assignment/score/:value", (req, res) => {
    assignment.score = numeric(req.params.value);
    res.json(assignment);
  });
  app.get("/lab5/assignment/completed/:value", (req, res) => {
    assignment.completed = boolean(req.params.value);
    res.json(assignment);
  });
  app.get("/lab5/module", (_req, res) => {
    res.json(module);
  });
  app.get("/lab5/module/name", (_req, res) => {
    res.json(module.name);
  });
  for (const field of ["name", "description"] as const)
    app.get(`/lab5/module/${field}/:value`, (req, res) => {
      module[field] = requiredText(req.params.value, field);
      res.json(module);
    });
  app.get("/lab5/todos", (req, res) => {
    res.json(
      req.query.completed === undefined
        ? todos
        : todos.filter((t) => t.completed === boolean(req.query.completed)),
    );
  });
  // The literal create route must precede /:id. Kept for the early hyperlink exercises.
  app.get("/lab5/todos/create", (_req, res) => {
    todos.push({
      id: nextId++,
      title: "New Task",
      completed: false,
      description: "",
    });
    res.json(todos);
  });
  app.get("/lab5/todos/:id", (req, res) => {
    res.json(find(req.params.id));
  });
  app.get("/lab5/todos/:id/delete", (req, res) => {
    const todo = find(req.params.id);
    todos = todos.filter((t) => t !== todo);
    res.json(todos);
  });
  for (const field of ["title", "description"] as const)
    app.get(`/lab5/todos/:id/${field}/:value`, (req, res) => {
      find(req.params.id)[field] = requiredText(req.params.value, field);
      res.json(todos);
    });
  app.get("/lab5/todos/:id/completed/:value", (req, res) => {
    find(req.params.id).completed = boolean(req.params.value);
    res.json(todos);
  });
  app.post("/lab5/todos", (req, res) => {
    const todo = {
      id: nextId++,
      title: requiredText(req.body.title, "Title"),
      completed: boolean(req.body.completed ?? false),
      description: String(req.body.description ?? ""),
    };
    todos.push(todo);
    res.status(201).json(todo);
  });
  app.delete("/lab5/todos/:id", (req, res) => {
    const todo = find(req.params.id);
    todos = todos.filter((t) => t !== todo);
    res.sendStatus(200);
  });
  app.put("/lab5/todos/:id", (req, res) => {
    const todo = find(req.params.id),
      updates = { ...todo };
    if (req.body.title !== undefined)
      updates.title = requiredText(req.body.title, "Title");
    if (req.body.completed !== undefined)
      updates.completed = boolean(req.body.completed);
    if (req.body.description !== undefined)
      updates.description = String(req.body.description);
    Object.assign(todo, updates);
    res.json(todo);
  });
}
