// ──────────────────────────────────────────────
// scrubber.orchestrator.ts — Scrubber feature orchestrator
// SRP: coordinates scrubber init, sync, and proposal submission
// DIP: depends on ScrubberService and store abstractions
// ──────────────────────────────────────────────

/**
 * Orchestrates the scrubber lifecycle within an active room:
 *
 * === Init ===
 * 1. Compute scrubber bounds from room creation time + constants
 * 2. Fetch latest position from Firestore
 * 3. Connect socket scrubber channel
 * 4. Start sync pipeline
 * 5. Hydrate scrubber store slice
 *
 * === Active Sync ===
 * - Pipeline handles inbound/outbound as documented in scrubber.pipeline.ts
 *
 * === Proposal Submission ===
 * 1. User confirms current scrubber position
 * 2. Run DST safety check on the proposed UTC time
 * 3. If DST warning → surface to UI for confirmation
 * 4. Submit proposal → triggers room transition to PROPOSING
 * 5. Emit SCRUBBER_PROPOSAL_SUBMITTED event
 * 6. Pause scrubber sync (scrubber locked during voting)
 *
 * === Teardown ===
 * - On room leave or status transition away from OPEN
 * - Disconnect socket channel
 * - Flush pending debounced writes
 * - Clear scrubber store slice
 *
 * TODO: implement createScrubberOrchestrator(deps) function
 */

export {}; // module placeholder
