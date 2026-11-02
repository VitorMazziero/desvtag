import assert from "node:assert/strict";
import { test } from "node:test";
import { channelsFor } from "./channels.mjs";

test("a série 0.x só entra no canal experimental", () => {
  assert.deepEqual(channelsFor("v0.3.0", false), ["experimental"]);
  assert.deepEqual(channelsFor("v0.99.9", false), ["experimental"]);
});

test("a 1.0.0 e as seguintes entram nos dois canais", () => {
  assert.deepEqual(channelsFor("v1.0.0", false), ["experimental", "stable"]);
  assert.deepEqual(channelsFor("v2.4.1", false), ["experimental", "stable"]);
});

test("pré-lançamentos (sufixo ou marca no GitHub) nunca entram no estável", () => {
  assert.deepEqual(channelsFor("v1.1.0-rc.1", false), ["experimental"]);
  assert.deepEqual(channelsFor("v1.1.0", true), ["experimental"]);
});

test("etiquetas inválidas são recusadas", () => {
  assert.throws(() => channelsFor("1.0.0", false));
  assert.throws(() => channelsFor("v1.0", false));
  assert.throws(() => channelsFor("channel-stable", false));
});
