import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import test from "node:test";

import {
  applyTelegramGroupCwdBinding,
  buildTelegramGroupDirectoryName,
  ensureTelegramGroupDirectory,
  resolveTelegramGroupDirectory,
  sanitizeTelegramGroupName,
} from "../lib/group-binding.ts";
import type { TelegramGroupBinding } from "../lib/config.ts";

const BINDING: TelegramGroupBinding = {
  groupId: -1005874737644,
  groupName: "SBkup",
};

test("Group directory naming sanitizes the group name and drops the id sign", () => {
  assert.equal(
    buildTelegramGroupDirectoryName("SBkup", -1005874737644),
    "sbkup-1005874737644",
  );
  assert.equal(
    buildTelegramGroupDirectoryName("My Cool Group!!", -42),
    "mycoolgroup-42",
  );
  assert.equal(buildTelegramGroupDirectoryName(undefined, -7), "group-7");
  assert.equal(sanitizeTelegramGroupName("  A B#c$d "), "abcd");
});

test("Group directory resolution honors absolute and relative directories", () => {
  assert.equal(
    resolveTelegramGroupDirectory(
      { ...BINDING, directory: "/tmp/explicit" },
      "/app",
    ),
    resolve("/tmp/explicit"),
  );
  assert.equal(
    resolveTelegramGroupDirectory(
      { ...BINDING, directory: "custom-folder" },
      "/app",
    ),
    resolve("/app/custom-folder"),
  );
  assert.equal(
    resolveTelegramGroupDirectory(BINDING, "/app"),
    resolve("/app/sbkup-1005874737644"),
  );
});

test("Group directory creation makes the mapped workspace directory", () => {
  const root = mkdtempSync(join(tmpdir(), "tg-group-"));
  try {
    const directory = ensureTelegramGroupDirectory(BINDING, root);
    assert.ok(existsSync(directory));
    assert.equal(directory, resolve(join(root, "sbkup-1005874737644")));
    // Idempotent on a second run.
    assert.equal(ensureTelegramGroupDirectory(BINDING, root), directory);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Group cwd binding switches the session into the mapped directory", () => {
  const root = mkdtempSync(join(tmpdir(), "tg-cwd-"));
  const previousCwd = process.cwd();
  try {
    const notice = applyTelegramGroupCwdBinding(() => BINDING, root);
    const directory = resolve(join(root, "sbkup-1005874737644"));
    assert.ok(notice?.includes(directory));
    assert.equal(process.cwd(), directory);
    // Already switched: no repeated notice, no further chdir.
    assert.equal(applyTelegramGroupCwdBinding(() => BINDING, root), undefined);
    assert.equal(process.cwd(), directory);
  } finally {
    process.chdir(previousCwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test("Group cwd binding without a binding or on failure reports cleanly", () => {
  assert.equal(applyTelegramGroupCwdBinding(() => undefined, "/app"), undefined);
  const root = mkdtempSync(join(tmpdir(), "tg-fail-"));
  const previousCwd = process.cwd();
  try {
    // A file where the directory should be forces a creation failure.
    const blocker = join(root, "blocked");
    const binding: TelegramGroupBinding = { groupId: -1, directory: "blocked" };
    writeFileSync(blocker, "x", "utf8");
    const notice = applyTelegramGroupCwdBinding(() => binding, root);
    assert.ok(notice?.startsWith("Telegram group binding failed"));
    assert.equal(process.cwd(), previousCwd);
  } finally {
    process.chdir(previousCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
