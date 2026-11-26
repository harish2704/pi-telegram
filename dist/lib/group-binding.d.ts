/**
 * Telegram group binding helpers
 * Zones: naming, filesystem
 * Owns the per-profile group → workspace directory naming convention and
 * directory resolution/creation. The binding itself lives as optional
 * `groupId` / `groupName` / `directory` fields on each bot profile in
 * telegram.json; a profile without them keeps classic DM-only behavior.
 */
import type { TelegramGroupBinding } from "./config.ts";
/** Lowercase, keep ASCII letters/digits only, collapse to a bounded token. */
export declare function sanitizeTelegramGroupName(name: string): string;
/**
 * Directory name convention: sanitized group name joined with the numeric
 * group id (minus sign dropped to stay filesystem-safe).
 */
export declare function buildTelegramGroupDirectoryName(name: string | undefined, groupId: number): string;
/**
 * Resolve a profile binding's workspace directory. Absolute paths are used
 * as-is; relative paths resolve against the session cwd at connect time.
 * A missing `directory` field derives from the group name + id.
 */
export declare function resolveTelegramGroupDirectory(binding: TelegramGroupBinding, sessionCwd: string): string;
/** Create the group workspace directory when missing; returns its absolute path. */
export declare function ensureTelegramGroupDirectory(binding: TelegramGroupBinding, sessionCwd: string): string;
export interface TelegramGroupCwdRuntimeEventRecorder {
    (category: string, error: unknown, details?: Record<string, unknown>): void;
}
/**
 * Apply a profile's group binding to the running session: create the mapped
 * workspace directory when missing and switch the process cwd into it.
 * Returns a human notice when the cwd actually switched, a warning text on
 * failure, and undefined when no binding exists or the cwd already matches.
 */
export declare function applyTelegramGroupCwdBinding(getGroupBinding: () => TelegramGroupBinding | undefined, sessionCwd: string, recordRuntimeEvent?: TelegramGroupCwdRuntimeEventRecorder): string | undefined;
