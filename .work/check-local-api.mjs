const origin = "http://localhost:8081";
const preflight = await fetch("http://127.0.0.1:3000/api/trpc/agenda.create?batch=1", {
  method: "OPTIONS",
  headers: {
    Origin: origin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
});
console.log(`preflight_status=${preflight.status}`);
console.log(`preflight_allow_origin=${preflight.headers.get("access-control-allow-origin") ?? "none"}`);

const url = "http://127.0.0.1:3000/api/trpc/agenda.window?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D";
const agenda = await fetch(url, { headers: { Origin: origin } });
const body = await agenda.text();
console.log(`agenda_status=${agenda.status}`);
console.log(`agenda_allow_origin=${agenda.headers.get("access-control-allow-origin") ?? "none"}`);
const containsRawSql = /Failed query:|Access denied for user|SELECT\s+[`\w]/i.test(body);
const containsSafeDatabaseMessage = /Falha ao acessar o banco de dados/i.test(body);
console.log(`agenda_error_contains_raw_sql=${containsRawSql}`);
console.log(`agenda_error_is_sanitized=${containsSafeDatabaseMessage}`);
