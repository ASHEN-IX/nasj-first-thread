import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const manifest = JSON.parse(await readFile('public/fabric/manifest.json', 'utf8'));
test('source master is unchanged and generated assets stay inside transfer budgets', async () => {
  const original = await readFile(manifest.source.path);
  assert.equal(createHash('sha256').update(original).digest('hex'), manifest.source.sha256);
  let total = 0;
  for (const [kind, sequence] of Object.entries(manifest.sequences)) {
    let bytes = 0; let previous = -1;
    assert.ok(sequence.frames.length <= (kind === 'scroll' ? 30 : 18));
    for (const frame of sequence.frames) {
      const size = (await stat(`public${frame.src}`)).size;
      assert.equal(size, frame.bytes); assert.ok(frame.time > previous); previous = frame.time; bytes += size;
    }
    assert.equal(bytes, sequence.bytes); assert.ok(bytes <= manifest.budgets[kind]); total += bytes;
  }
  for (const [name, bytes] of Object.entries(manifest.stills)) {
    assert.equal((await stat(`public/fabric/${name}`)).size, bytes); total += bytes;
  }
  assert.equal(total, manifest.totalPublicBytes);
  assert.ok(total < manifest.budgets.totalPublic);
  assert.ok(manifest.stills['poster-mobile.webp'] < manifest.budgets.posterMobile);
});

test('adaptive frame lookup is reversible, bounded and follows sample timestamps', async () => {
  const code = ts.transpileModule(await readFile('lib/fabric.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const module = new vm.SourceTextModule(code); await module.link(() => {}); await module.evaluate();
  const sequence = manifest.sequences.scroll;
  const lookup = module.namespace.frameAt;
  assert.equal(lookup(sequence, -1), 0);
  assert.equal(lookup(sequence, 2), sequence.frames.length - 1);
  for (const progress of [0, .1, .3, .5, .7, 1, .7, .3, 0]) {
    const index = lookup(sequence, progress);
    const target = progress * sequence.duration;
    assert.equal(Math.abs(sequence.frames[index].time - target), Math.min(...sequence.frames.map(frame => Math.abs(frame.time - target))));
  }
});
