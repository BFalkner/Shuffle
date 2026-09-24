/**
 * The engine version changes only when simulation results change, so claims on the site can record which version they
 * were checked on (see docs/claims.md). version.test.ts runs the engine with a fixed seed and compares the output with
 * ENGINE_FINGERPRINT. If a change alters any result, that test fails: bump ENGINE_VERSION, paste the new fingerprint
 * it prints, and recheck the claims verified on older versions.
 *
 * 1  the original model, through commit 7dc1e61
 * 2  the pile deal reverses each pile (2f968b5)
 * 3  the woven and clumped decks draw their card order and card types at random (ad939d2)
 */
export const ENGINE_VERSION = 3
export const ENGINE_FINGERPRINT = '4940f92b'
