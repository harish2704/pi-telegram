/**
 * Telegram group binding helpers
 * Zones: naming, filesystem
 * Owns the per-profile group → workspace directory naming convention and
 * directory resolution/creation. The binding itself lives as optional
 * `groupId` / `groupName` / `directory` fields on each bot profile in
 * telegram.json; a profile without them keeps classic DM-only behavior.
 */
import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
/** Lowercase, keep ASCII letters/digits only, collapse to a bounded token. */
export function sanitizeTelegramGroupName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 48);
}
/**
 * Directory name convention: sanitized group name joined with the numeric
 * group id (minus sign dropped to stay filesystem-safe).
 */
export function buildTelegramGroupDirectoryName(name, groupId) {
    const sanitized = name ? sanitizeTelegramGroupName(name) : "";
    const idToken = String(Math.abs(Math.trunc(groupId)));
    return sanitized ? `${sanitized}-${idToken}` : `group-${idToken}`;
}
/**
 * Resolve a profile binding's workspace directory. Absolute paths are used
 * as-is; relative paths resolve against the session cwd at connect time.
 * A missing `directory` field derives from the group name + id.
 */
export function resolveTelegramGroupDirectory(binding, sessionCwd) {
    if (binding.directory && isAbsolute(binding.directory))
        return resolve(binding.directory);
    const directory = binding.directory ??
        buildTelegramGroupDirectoryName(binding.groupName, binding.groupId);
    return resolve(join(sessionCwd, directory));
}
/** Create the group workspace directory when missing; returns its absolute path. */
export function ensureTelegramGroupDirectory(binding, sessionCwd) {
    const directory = resolveTelegramGroupDirectory(binding, sessionCwd);
    if (!existsSync(directory))
        mkdirSync(directory, { recursive: true });
    return directory;
}
/**
 * Apply a profile's group binding to the running session: create the mapped
 * workspace directory when missing and switch the process cwd into it.
 * Returns a human notice when the cwd actually switched, a warning text on
 * failure, and undefined when no binding exists or the cwd already matches.
 */
export function applyTelegramGroupCwdBinding(getGroupBinding, sessionCwd, recordRuntimeEvent) {
    const binding = getGroupBinding();
    if (!binding)
        return undefined;
    try {
        const directory = ensureTelegramGroupDirectory(binding, sessionCwd);
        if (resolve(process.cwd()) === directory)
            return undefined;
        process.chdir(directory);
        const label = binding.groupName ?? String(binding.groupId);
        return `Switched session directory to ${directory} for group ${label}.`;
    }
    catch (error) {
        recordRuntimeEvent?.("connection", error, {
            phase: "group-cwd-switch",
            groupId: binding.groupId,
            directory: binding.directory,
        });
        return `Telegram group binding failed to switch cwd: ${error instanceof Error ? error.message : String(error)}`;
    }
}
