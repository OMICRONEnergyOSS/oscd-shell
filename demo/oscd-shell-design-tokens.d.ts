/**
 * Single source of truth for oscd-shell design tokens.
 *
 * This block contains:
 * 1) Internal base tokens and fallbacks
 * 2) Public token -> internal token mappings
 *
 * Keep this as an all-or-nothing layer so mappings can safely reference
 * internal base tokens (e.g. --oscd-base*).
 */
export declare const oscdShellDesignTokens: import("lit").CSSResult;
