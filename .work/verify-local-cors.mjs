import assert from "node:assert/strict";
import { isAllowedLocalExpoWebOrigin, registerLocalExpoWebCors } from "../server/_core/localDevCors.ts";

const allowed = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://[::1]:8081",
  "http://192.168.0.10:8081",
  "http://10.0.0.8:8081",
  "http://172.31.4.2:8081",
];
const rejected = [
  "http://quadrapass.example:8081",
  "https://localhost:8081",
  "http://localhost:3000",
  "not-an-origin",
];
for (const origin of allowed) assert.equal(isAllowedLocalExpoWebOrigin(origin), true, origin);
for (const origin of rejected) assert.equal(isAllowedLocalExpoWebOrigin(origin), false, origin);

let middleware;
const fakeApp = { use(handler) { middleware = handler; } };
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "development";
registerLocalExpoWebCors(fakeApp);
const headers = {};
let status;
let nextCalls = 0;
const response = {
  setHeader(name, value) { headers[name] = value; return this; },
  sendStatus(value) { status = value; return this; },
};
const allowedRequest = {
  method: "OPTIONS",
  get(name) { return name === "origin" ? "http://localhost:8081" : undefined; },
};
middleware(allowedRequest, response, () => { nextCalls += 1; });
assert.equal(status, 204);
assert.equal(headers["Access-Control-Allow-Origin"], "http://localhost:8081");
assert.equal(headers["Access-Control-Allow-Methods"], "GET, POST, OPTIONS");
assert.equal(nextCalls, 0);

status = undefined;
const deniedRequest = {
  method: "OPTIONS",
  get(name) { return name === "origin" ? "https://public.example:8081" : undefined; },
};
middleware(deniedRequest, response, () => { nextCalls += 1; });
assert.equal(status, 403);
assert.equal(nextCalls, 0);

if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = originalNodeEnv;
console.log(`${allowed.length + rejected.length + 5} verificações CORS local passaram.`);
