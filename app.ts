import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import session from "express-session";
import { randomBytes } from "node:crypto";
import Lab5 from "./Lab5";
import Kambaz from "./Kambaz/routes";
import { createDatabase } from "./Kambaz/Database";
import { HttpError } from "./http";
export function createApp() {
  const app = express();
  const production = process.env.SERVER_ENV === "production";
  const origins = (process.env.CLIENT_URL ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""));
  app.set("trust proxy", 1);
  app.use(cors({ origin: origins, credentials: true }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: production ? "none" : "lax",
        secure: production,
        maxAge: 86400000,
      },
    }),
  );
  app.use(express.json());
  app.get("/", (_req, res) => {
    res.send("Welcome to Full Stack Development!");
  });
  app.get("/hello", (_req, res) => {
    res.send("Life is good!");
  });
  Lab5(app);
  Kambaz(app, createDatabase());
  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const status =
      error instanceof HttpError
        ? error.status
        : error instanceof SyntaxError
          ? 400
          : 500;
    res
      .status(status)
      .json({
        message: status === 500 ? "Internal server error" : error.message,
      });
  };
  app.use(errors);
  return app;
}
