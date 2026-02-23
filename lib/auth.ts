import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const ADMIN_COOKIE = "session";
const VOTER_COOKIE = "voter-session";

// ─── Admin Auth ─────────────────────────────────────────────────

export interface SessionPayload {
  adminId: string;
  username: string;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

export async function verifyToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Voter Auth ─────────────────────────────────────────────────

export interface VoterSessionPayload {
  voterId: string;
  lrn: string;
}

export async function signVoterToken(
  payload: VoterSessionPayload,
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(secret);
}

export async function verifyVoterToken(
  token: string,
): Promise<VoterSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as VoterSessionPayload;
  } catch {
    return null;
  }
}

export async function getVoterSession(): Promise<VoterSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(VOTER_COOKIE)?.value;
  if (!token) return null;
  return verifyVoterToken(token);
}

export { VOTER_COOKIE };
