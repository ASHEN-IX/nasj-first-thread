import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadEmailTemplatesModule() {
  const file = path.resolve("lib/email-templates.ts");
  const rawTs = await readFile(file, "utf8");
  const transpiled = ts.transpileModule(rawTs, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const context = vm.createContext({
    process: {
      cwd: () => process.cwd(),
      env: {
        NEXT_PUBLIC_NASJ_PLATFORM_URL: "https://nasj-platform.ddns.net",
      },
    },
    console,
  });

  const mod = new vm.SourceTextModule(transpiled, { context, identifier: file });
  await mod.link(async (specifier) => {
    if (specifier === "server-only") {
      return new vm.SyntheticModule([], () => {}, { context });
    }
    const real = await import(specifier);
    const keys = Object.keys(real);
    const synth = new vm.SyntheticModule(
      keys,
      function () {
        for (const k of keys) this.setExport(k, real[k]);
      },
      { context }
    );
    return synth;
  });

  await mod.evaluate();
  return mod.namespace;
}

test("welcoming email renders with branding, thank you message, launch soon notice, and no credentials", async () => {
  const { renderEmailTemplate } = await loadEmailTemplatesModule();

  const rendered = renderEmailTemplate("welcome_email", {
    fullName: "Yasmine Ben Salah",
    email: "yasmine@example.com",
    role: "Artisan & Weaver",
  });

  assert.ok(rendered.subject.includes("Welcome to NASJ"));
  assert.ok(rendered.subject.includes("Launching Soon"));

  // Welcoming & thank you message
  assert.ok(rendered.html.includes("Dear Yasmine Ben Salah"));
  assert.ok(rendered.html.includes("Thank you so much for joining us"));
  assert.ok(rendered.html.includes("The First Thread"));

  // Platform launch soon & first to try
  assert.ok(rendered.html.includes("The Platform Will Launch Soon"));
  assert.ok(rendered.html.includes("you will be among the very first to try"));

  // Sticker inclusion
  assert.ok(rendered.html.includes("nasouj-wave.png"));
  assert.ok(rendered.html.includes("alt=\"Nasouj waving sticker\""));

  // Branding style check: Forest green, Tunisian gold, cream background, Arabic identity
  assert.ok(rendered.html.includes("#103e30"));
  assert.ok(rendered.html.includes("#c19a5b"));
  assert.ok(rendered.html.includes("#f7f1e8"));
  assert.ok(rendered.html.includes("نَسْج"));
  assert.ok(rendered.html.includes("الخيط الأوّل"));

  // No credentials check
  assert.ok(!rendered.html.includes("Set Up Password"));
  assert.ok(!rendered.html.includes("choose a secure password"));
  assert.ok(!rendered.html.includes("activationUrl"));
  assert.ok(rendered.html.includes("No credentials or password setup required"));

  // Plain-text counterpart check
  assert.ok(rendered.text.includes("Dear Yasmine Ben Salah"));
  assert.ok(rendered.text.includes("THE PLATFORM WILL LAUNCH SOON"));
  assert.ok(rendered.text.includes("YOU WILL BE AMONG THE VERY FIRST TO TRY IT"));
  assert.ok(rendered.text.includes("No credentials or password setup needed"));
});

test("early_access_confirmation renders the welcoming email with Nasouj wave sticker", async () => {
  const { renderEmailTemplate } = await loadEmailTemplatesModule();

  const rendered = renderEmailTemplate("early_access_confirmation", {
    fullName: "Amine Trabelsi",
    email: "amine@example.com",
  });

  assert.ok(rendered.html.includes("Amine Trabelsi"));
  assert.ok(rendered.html.includes("Thank you so much for joining us"));
  assert.ok(rendered.html.includes("The Platform Will Launch Soon"));
  assert.ok(rendered.html.includes("nasouj-wave.png"));
  assert.ok(!rendered.html.includes("Set Up Password"));
});

test("alpha_invitation is simplified and sends welcoming email without credentials or activation links", async () => {
  const { renderEmailTemplate } = await loadEmailTemplatesModule();

  const rendered = renderEmailTemplate("alpha_invitation", {
    fullName: "Karim Mezghani",
    email: "karim@example.com",
    activationUrl: "https://nasj-platform.ddns.net/auth/activate?token=legacy_token",
  });

  // Never leaks the activationUrl in the output
  assert.ok(!rendered.html.includes("legacy_token"));
  assert.ok(!rendered.html.includes("Set Up Password"));
  assert.ok(rendered.html.includes("The Platform Will Launch Soon"));
  assert.ok(rendered.html.includes("you will be among the very first to try"));
  assert.ok(rendered.html.includes("nasouj-wave.png"));
});

test("custom stickerUrl or dataUri is respected when provided", async () => {
  const { renderEmailTemplate } = await loadEmailTemplatesModule();

  const customSticker = "data:image/png;base64,customStickerPayload";
  const rendered = renderEmailTemplate("welcome_email", {
    fullName: "Sara",
    email: "sara@example.com",
    stickerUrl: customSticker,
  });

  assert.ok(rendered.html.includes("data:image/png;base64,customStickerPayload"));
});

test("nasouj wave sticker buffer and dataUri helpers read the valid PNG asset", async () => {
  const { getNasoujWaveBuffer, getNasoujWaveDataUri } = await loadEmailTemplatesModule();

  const buffer = getNasoujWaveBuffer();
  assert.ok(buffer !== null);
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 100000); // 428KB file
  // Check PNG magic bytes: 0x89 0x50 0x4E 0x47
  assert.equal(buffer[0], 0x89);
  assert.equal(buffer[1], 0x50);
  assert.equal(buffer[2], 0x4e);
  assert.equal(buffer[3], 0x47);

  const dataUri = getNasoujWaveDataUri();
  assert.ok(dataUri.startsWith("data:image/png;base64,"));
  assert.ok(dataUri.length > 100000);
});

