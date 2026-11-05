import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { setTimeout } from "node:timers";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadService(env, fetch) {
  const context = vm.createContext({ process: { env }, fetch, Buffer, AbortSignal: globalThis.AbortSignal, ArrayBuffer, setTimeout, console: { info() {}, error() {} } });
  const source = ts.transpileModule(await readFile("lib/email-service.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new vm.SourceTextModule(source, { context });
  await mod.link((specifier) => {
    if (specifier === "server-only") return new vm.SyntheticModule([], () => {}, { context });
    if (specifier === "resend") return new vm.SyntheticModule(["Resend"], function () {
      this.setExport("Resend", class { constructor() { throw new Error("Unexpected Resend fallback"); } });
    }, { context });
    throw new Error(`Unexpected import: ${specifier}`);
  });
  await mod.evaluate();
  return new mod.namespace.EmailService();
}

const env = { EMAIL_PROVIDER: "mailjet", MAILJET_API_KEY: "test-public", MAILJET_SECRET_KEY: "test-secret", MAILJET_FROM_EMAIL: "sender@example.com" };
const options = { to: "recipient@example.com", subject: "Welcome", html: "<p>Welcome</p>", text: "Welcome", idempotencyKey: "outbox-unique-id" };

test("Mailjet sends the welcome content with authentication and duplicate protection, preserving message ID precision", async () => {
  let request;
  const service = await loadService(env, async (url, init) => {
    request = { url, ...init };
    return { ok: true, status: 200, json: async () => ({ Messages: [{ Status: "success", To: [{ MessageUUID: "uuid", MessageHref: "https://api.mailjet.com/v3/message/1234567890123456789" }] }] }) };
  });
  const result = await service.sendEmail(options);
  assert.equal(result.success, true);
  assert.equal(result.messageId, "1234567890123456789");
  assert.equal(request.url, "https://api.mailjet.com/v3.1/send");
  assert.equal(request.headers.Authorization, "Basic " + Buffer.from("test-public:test-secret").toString("base64"));
  const message = JSON.parse(request.body).Messages[0];
  assert.equal(message.From.Email, env.MAILJET_FROM_EMAIL);
  assert.equal(message.To[0].Email, options.to);
  assert.equal(message.HTMLPart, options.html);
  assert.equal(message.TextPart, options.text);
  assert.equal(message.CustomCampaign, options.idempotencyKey);
  assert.equal(message.DeduplicateCampaign, true);
});

test("missing Mailjet credentials fail without network requests or simulated success", async () => {
  const service = await loadService({ ...env, MAILJET_SECRET_KEY: "" }, () => { throw new Error("Network must not be called"); });
  assert.equal(service.configured, false);
  const result = await service.sendEmail(options);
  assert.equal(result.success, false);
  assert.equal(result.retryable, false);
});

test("Mailjet per-message rejection inside HTTP 200 is a failure", async () => {
  const service = await loadService(env, async () => ({ ok: true, status: 200, json: async () => ({ Messages: [{ Status: "error", Errors: [{ ErrorMessage: "Sender not validated" }] }] }) }));
  const result = await service.sendEmail(options);
  assert.equal(result.success, false);
  assert.equal(result.retryable, false);
  assert.equal(result.error, "Sender not validated");
});

test("provider authentication failures do not retry or fall back to Resend", async () => {
  let calls = 0;
  const service = await loadService(env, async () => {
    calls++;
    return { ok: false, status: 401, json: async () => ({ ErrorMessage: "Unauthorized" }) };
  });
  const result = await service.sendEmail(options);
  assert.equal(result.success, false);
  assert.equal(result.retryable, false);
  assert.equal(calls, 1);
});

test("HTTP success without a provider message ID never counts as sent", async () => {
  const service = await loadService(env, async () => ({ ok: true, status: 200, json: async () => ({ Messages: [{ Status: "success", To: [{}] }] }) }));
  assert.equal((await service.sendEmail(options)).success, false);
});

test("Mailjet sends CID images as inline attachments with matching content and ID", async () => {
  let message;
  const service = await loadService(env, async (_url, init) => {
    message = JSON.parse(init.body).Messages[0];
    return { ok: true, status: 200, json: async () => ({ Messages: [{ Status: "success", To: [{ MessageUUID: "inline-test" }] }] }) };
  });
  const content = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const result = await service.sendEmail({ ...options, html: '<img src="cid:nasouj-wave@nasj">', attachments: [
    { content, filename: "nasouj-wave.png", contentType: "image/png", contentId: "nasouj-wave@nasj" },
  ] });
  assert.equal(result.success, true);
  assert.equal(message.Attachments.length, 0);
  assert.equal(message.InlinedAttachments.length, 1);
  assert.equal(message.InlinedAttachments[0].ContentID, "nasouj-wave@nasj");
  assert.equal(message.InlinedAttachments[0].Base64Content, content.toString("base64"));
});
