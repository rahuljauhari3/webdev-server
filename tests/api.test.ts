import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app";
import type { Server } from "node:http";
let server: Server;
let base: string;
before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing server address");
  base = `http://127.0.0.1:${address.port}`;
});
after(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    ),
);
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    status: response.status,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    headers: response.headers,
  };
}
async function signin(username: string) {
  const r = await request("/api/users/signin", "POST", {
    username,
    password: "123",
  });
  assert.equal(r.status, 200);
  assert.ok(r.cookie);
  return r.cookie;
}
test("lab arithmetic handles path/query operations and rejects invalid input", async () => {
  assert.equal((await request("/lab5/welcome")).data, "Welcome to Lab 5");
  for (const [op, result] of [
    ["add", 42],
    ["subtract", -18],
    ["multiply", 360],
    ["divide", 0.4],
  ] as const) {
    assert.equal(Number((await request(`/lab5/${op}/12/30`)).data), result);
    assert.equal(
      Number(
        (await request(`/lab5/calculator?operation=${op}&a=12&b=30`)).data,
      ),
      result,
    );
  }
  for (const path of [
    "/lab5/add/bad/1",
    "/lab5/divide/1/0",
    "/lab5/calculator?operation=add&a=2",
    "/lab5/calculator?operation=bad&a=2&b=4",
  ]) {
    assert.equal((await request(path)).status, 400);
  }
});
test("assignment and module object edits persist across reads", async () => {
  assert.equal(
    (await request("/lab5/assignment")).data.title,
    "NodeJS Assignment",
  );
  await request("/lab5/assignment/title/Updated%20%26%20tested");
  assert.equal(
    (await request("/lab5/assignment/title")).data,
    "Updated & tested",
  );
  await request("/lab5/assignment/score/87");
  await request("/lab5/assignment/completed/true");
  const a = (await request("/lab5/assignment")).data;
  assert.equal(a.score, 87);
  assert.equal(a.completed, true);
  await request("/lab5/module/name/HTTP");
  await request("/lab5/module/description/Server%20APIs");
  assert.equal((await request("/lab5/module/name")).data, "HTTP");
  assert.equal((await request("/lab5/module")).data.description, "Server APIs");
});
test("todo CRUD supports legacy links, JSON verbs, filters, immutable IDs, and 404s", async () => {
  const initial = (await request("/lab5/todos")).data;
  assert.equal(initial.length, 4);
  assert.ok(
    (await request("/lab5/todos?completed=true")).data.every(
      (t: { completed: boolean }) => t.completed,
    ),
  );
  const created = await request("/lab5/todos", "POST", {
    title: "A & B",
    completed: false,
    description: "Details",
  });
  assert.equal(created.status, 201);
  const id = created.data.id;
  await request(`/lab5/todos/${id}`, "PUT", {
    id: 999,
    title: "Saved",
    completed: true,
  });
  assert.equal((await request(`/lab5/todos/${id}`)).data.title, "Saved");
  await request(`/lab5/todos/${id}/description/Changed`);
  await request(`/lab5/todos/${id}/completed/false`);
  assert.equal(
    (await request(`/lab5/todos/${id}`)).data.description,
    "Changed",
  );
  assert.equal((await request(`/lab5/todos/${id}`, "DELETE")).status, 200);
  assert.equal((await request(`/lab5/todos/${id}`, "DELETE")).status, 404);
  assert.equal(
    (await request(`/lab5/todos/${id}`, "PUT", { title: "missing" })).status,
    404,
  );
  assert.equal((await request("/lab5/todos/-1/delete")).status, 404);
  assert.equal((await request("/lab5/todos")).data.length, 4);
  const all = (await request("/lab5/todos/create")).data;
  assert.equal(all.length, 5);
  await request(`/lab5/todos/${all.at(-1).id}/delete`);
});
test("session auth stays isolated, survives requests, and clears on signout", async () => {
  assert.equal((await request("/api/users/profile")).status, 401);
  assert.equal(
    (
      await request("/api/users/signin", "POST", {
        username: "rahul",
        password: "bad",
      })
    ).status,
    401,
  );
  const a = await signin("rahul"),
    b = await signin("alex");
  assert.equal(
    (await request("/api/users/profile", "GET", undefined, a)).data.username,
    "rahul",
  );
  assert.equal(
    (await request("/api/users/profile", "GET", undefined, b)).data.username,
    "alex",
  );
  assert.ok(
    !(await request("/api/users/profile", "GET", undefined, a)).data.password,
  );
  await request("/api/users/U1", "PUT", { firstName: "Rahul Updated" }, a);
  assert.equal(
    (await request("/api/users/profile", "GET", undefined, a)).data.firstName,
    "Rahul Updated",
  );
  const signed = await request("/api/users/signup", "POST", {
    username: "newstudent",
    password: "test",
    role: "ADMIN",
  });
  assert.equal(signed.status, 201);
  assert.equal(signed.data.role, "STUDENT");
  assert.equal(
    (
      await request("/api/users/signup", "POST", {
        username: "newstudent",
        password: "test",
      })
    ).status,
    409,
  );
  await request("/api/users/signout", "POST", undefined, a);
  assert.equal(
    (await request("/api/users/profile", "GET", undefined, a)).status,
    401,
  );
  assert.equal(
    (await request("/api/users/profile", "GET", undefined, b)).status,
    200,
  );
});
test("public course/module reads are correctly scoped", async () => {
  const courses = (await request("/api/courses")).data;
  assert.ok(courses.length >= 3);
  for (const c of courses) {
    assert.ok(c._id && c.name);
  }
  const a = (await request(`/api/courses/${courses[0]._id}/modules`)).data,
    b = (await request(`/api/courses/${courses[1]._id}/modules`)).data;
  assert.ok(a.length && b.length);
  assert.ok(a.every((m: { course: string }) => m.course === courses[0]._id));
  assert.notDeepEqual(a, b);
});
test("faculty CRUD, student enrollments, and course deletion cascade", async () => {
  const faculty = await signin("faculty"),
    student = await signin("sam");
  assert.equal(
    (await request("/api/courses", "POST", { name: "Forbidden" }, student))
      .status,
    403,
  );
  const created = await request(
    "/api/users/current/courses",
    "POST",
    { name: "Test course", description: "New" },
    faculty,
  );
  assert.equal(created.status, 201);
  const cid = created.data._id;
  assert.ok(
    (
      await request("/api/users/current/courses", "GET", undefined, faculty)
    ).data.some((c: { _id: string }) => c._id === cid),
  );
  await request(
    `/api/courses/${cid}`,
    "PUT",
    { name: "Updated course" },
    faculty,
  );
  assert.equal(
    (await request(`/api/courses/${cid}`)).data.name,
    "Updated course",
  );
  const module = (
    await request(
      `/api/courses/${cid}/modules`,
      "POST",
      { name: "Test module" },
      faculty,
    )
  ).data;
  await request(
    `/api/modules/${module._id}`,
    "PUT",
    { name: "Updated module" },
    faculty,
  );
  assert.equal(
    (await request(`/api/courses/${cid}/modules`)).data[0].name,
    "Updated module",
  );
  const assignment = (
    await request(
      `/api/courses/${cid}/assignments`,
      "POST",
      { title: "Test assignment", points: 10 },
      faculty,
    )
  ).data;
  await request(
    `/api/assignments/${assignment._id}`,
    "PUT",
    { title: "Updated assignment", points: 20 },
    faculty,
  );
  assert.equal(
    (await request(`/api/courses/${cid}/assignments`)).data[0].points,
    20,
  );
  await request(`/api/users/current/courses/${cid}`, "POST", {}, student);
  assert.ok(
    (
      await request("/api/users/current/courses", "GET", undefined, student)
    ).data.some((c: { _id: string }) => c._id === cid),
  );
  await request(
    `/api/users/current/courses/${cid}`,
    "DELETE",
    undefined,
    student,
  );
  assert.ok(
    !(
      await request("/api/users/current/courses", "GET", undefined, student)
    ).data.some((c: { _id: string }) => c._id === cid),
  );
  await request(`/api/courses/${cid}`, "DELETE", undefined, faculty);
  assert.equal((await request(`/api/courses/${cid}`)).status, 404);
  assert.equal(
    (await request(`/api/assignments/${assignment._id}`)).status,
    404,
  );
  assert.equal(
    (await request(`/api/modules/${module._id}`, "DELETE", undefined, faculty))
      .status,
    404,
  );
  assert.ok(
    !(await request("/api/enrollments")).data.some(
      (e: { course: string }) => e.course === cid,
    ),
  );
});
test("CORS permits the configured client with credentials", async () => {
  const r = await fetch(base + "/api/courses", {
    headers: { Origin: "http://localhost:3000" },
  });
  assert.equal(
    r.headers.get("access-control-allow-origin"),
    "http://localhost:3000",
  );
  assert.equal(r.headers.get("access-control-allow-credentials"), "true");
  const blocked = await fetch(base + "/api/courses", {
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
});
