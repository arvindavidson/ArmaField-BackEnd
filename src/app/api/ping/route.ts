import { NextResponse } from "next/server";
import { withGameAuth } from "@/lib/game-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/ping
 * Lightweight handshake for the game server.
 *
 * Called once on game-server startup to verify:
 *   - the backend is reachable
 *   - the configured Bearer token is valid (server is registered + active)
 *
 * Anything other than `200 { ok: true }` should be treated by the game server
 * as "backend not available / not configured". The client doesn't need to
 * parse the body in error cases.
 */
export const GET = withGameAuth(async () => {
  return NextResponse.json({ ok: true });
});
