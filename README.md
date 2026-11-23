# Kambaz HTTP server — A5

Separate Express/TypeScript companion for `webdev-client`. Collections and sessions stay in process memory as required by Chapter 5.

## Run and test

Node.js 22 or newer:

```sh
npm ci
cp .env.example .env
npm run dev
```

Production: `npm start`. Checks: `npm run typecheck && npm test`.

The server listens on `PORT` (default 4000). `CLIENT_URL` is the allowed client origin, or a comma-separated list of origins. `SERVER_ENV=production` enables secure cross-site cookies. Set a random `SESSION_SECRET` on Render; never commit `.env` files.

## API

- `/`, `/hello`, `/lab5/welcome`: greetings.
- `/lab5/{add,subtract,multiply,divide}/:a/:b` and `/lab5/calculator?operation=add&a=12&b=30`.
- `/lab5/assignment`, `/lab5/assignment/title`, and title/score/completed update paths.
- `/lab5/module`, `/lab5/module/name`, and name/description update paths.
- `/lab5/todos`, `?completed=true`, `/:id`, `/create`, `/:id/delete`, and title/completed/description update paths. The legacy GET mutations remain only for the early lab exercises.
- `POST /lab5/todos`, `PUT /lab5/todos/:id`, `DELETE /lab5/todos/:id`. Invalid input returns 400; missing records return 404.
- `POST /api/users/{signin,signup,signout}`, `GET /api/users/profile`, `GET/POST /api/users`, `PUT/DELETE /api/users/:userId`.
- `GET/POST /api/courses`, `GET/PUT/DELETE /api/courses/:courseId`.
- `GET /api/users/:userId/courses`, `POST /api/users/current/courses`. `current` resolves the session user; creating a course enrolls its creator.
- `POST/DELETE /api/users/:userId/courses/:courseId`, `GET /api/enrollments`.
- `GET/POST /api/courses/:courseId/modules`, `PUT/DELETE /api/modules/:moduleId`.
- `GET/POST /api/courses/:courseId/assignments`, `GET/PUT/DELETE /api/assignments/:assignmentId`.
- `GET /api/courses/:courseId/users`.

Public reads support the assignment checker. Course/module/assignment writes require a faculty/admin session. Students can manage their own enrollment. User responses exclude passwords. Demo accounts: `rahul`, `alex`, `sam`, `faculty`, each with password `123`.

## Render

Create a free Node web service from this repository's `a5` branch. Build: `npm ci`; start: `npm start`; health check: `/lab5/welcome`. A `render.yaml` Blueprint is included.

Set `SERVER_ENV=production`, `CLIENT_URL` to the actual Vercel A5 branch origin, and a random `SESSION_SECRET`. Copy the actual Render HTTPS origin into the client's Vercel preview `NEXT_PUBLIC_HTTP_SERVER`, and redeploy the client. No guessed deployment URL is embedded in source.

Changes and signups survive browser refresh but reset when the server restarts. In-memory sessions and classroom passwords are intended only for this assignment; Chapter 6 introduces a persistent database.
