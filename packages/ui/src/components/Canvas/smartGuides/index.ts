/**
 * Barrel for the smart-alignment-guides feature (#41).
 *
 * Consumers should import from this file rather than reaching into the
 * submodules — keeps the public surface narrow and lets internals refactor
 * freely.
 */
export { wireSmartGuides } from './wireSmartGuides.js'
export { buildCandidates } from './candidates.js'
export { computeSnap, findXSnap, findYSnap } from './snap.js'
export { detectEqualSpacing } from './equalSpacing.js'
export { snapToleranceForZoom, SNAP_DISTANCE_PT } from './constants.js'
export type { Rect, Candidates, XCandidate, YCandidate } from './candidates.js'
export type { SnapResult, AxisHit } from './snap.js'
export type { SpacingGap } from './equalSpacing.js'
