import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "./app.js";
import { connectDb, disconnectDb } from "./db.js";
import { getProfileModel } from "./models/profile.js";
import type { FastifyInstance } from "fastify";

const TEST_PASSWORD = "test-password-123";

/** Helper: build a minimal valid registration body */
function regBody(email: string, username: string, overrides: Record<string, string> = {}) {
  return {
    email,
    username,
    password: TEST_PASSWORD,
    confirmPassword: TEST_PASSWORD,
    ...overrides,
  };
}

describe("Auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const uri = process.env["MONGODB_URI_TEST"];
    if (!uri) {
      throw new Error("MONGODB_URI_TEST is not set");
    }

    await connectDb(uri, "atlasphere-v2-test");

    // Wipe all profiles before running auth tests
    const Profile = getProfileModel();
    await Profile.deleteMany({});

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  // -------------------------------------------------------------------------
  // Registration gate
  // -------------------------------------------------------------------------

  it("POST /api/v1/auth/register — rejects when not on allowlist", async () => {
    const res = await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody("notallowed@example.com", "notallowed"));
    expect(res.status).toBe(403);
  });

  it("POST /api/v1/auth/register with REGISTRATION_OPEN=true — creates account with userId === username", async () => {
    process.env["REGISTRATION_OPEN"] = "true";
    const email = "open-reg@example.com";
    const username = "openreguser";
    const res = await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, username));
    expect(res.status).toBe(201);

    const Profile = getProfileModel();
    const profile = await Profile.findOne({ email });
    expect(profile).not.toBeNull();
    expect(profile?.userId).toBe(username);
    expect(profile?.emailVerified).toBe(false);
    expect(profile?.verificationToken).toBeTruthy();
    expect(profile?.passwordHash).toBeTruthy();
  });

  it("POST /api/v1/auth/register — returns 409 on duplicate email", async () => {
    const email = "duplicate@example.com";
    const first = await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, "dup-email-user"));
    expect(first.status).toBe(201);

    const second = await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, "dup-email-user2"));
    expect(second.status).toBe(409);
    expect(second.body.error).toBe("Email already registered");
  });

  it("POST /api/v1/auth/register — returns 409 when username is already taken", async () => {
    const username = "takenuser";
    const first = await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody("first-taken@example.com", username));
    expect(first.status).toBe(201);

    const second = await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody("second-taken@example.com", username));
    expect(second.status).toBe(409);
    expect(second.body.error).toBe("Username already taken");
  });

  // -------------------------------------------------------------------------
  // Email verification
  // -------------------------------------------------------------------------

  it("POST /api/v1/auth/verify-email — rejects missing token with 400", async () => {
    const res = await supertest(app.server)
      .post("/api/v1/auth/verify-email")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/auth/verify-email — rejects empty token with 400", async () => {
    const res = await supertest(app.server)
      .post("/api/v1/auth/verify-email")
      .send({ token: "" });
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/auth/verify-email — verifies account", async () => {
    const email = "verify-test@example.com";
    await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, "verifyuser"));

    const Profile = getProfileModel();
    const profile = await Profile.findOne({ email });
    const token = profile?.verificationToken;
    expect(token).toBeTruthy();

    const res = await supertest(app.server)
      .post("/api/v1/auth/verify-email")
      .send({ token });
    expect(res.status).toBe(200);

    const updated = await Profile.findOne({ email });
    expect(updated?.emailVerified).toBe(true);
    expect(updated?.verificationToken).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Credentials sign-in
  // -------------------------------------------------------------------------

  it("POST /api/v1/auth/credentials — rejects unverified account", async () => {
    const email = "unverified@example.com";
    await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, "unverifieduser"));

    const res = await supertest(app.server)
      .post("/api/v1/auth/credentials")
      .send({ email, password: TEST_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("POST /api/v1/auth/credentials — succeeds after verification", async () => {
    const email = "creds-test@example.com";
    await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, "credsuser"));

    const Profile = getProfileModel();
    await Profile.updateOne(
      { email },
      { $set: { emailVerified: true }, $unset: { verificationToken: "" } }
    );

    const res = await supertest(app.server)
      .post("/api/v1/auth/credentials")
      .send({ email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email });
  });

  // -------------------------------------------------------------------------
  // Password reset
  // -------------------------------------------------------------------------

  it("POST /api/v1/auth/reset-request — always returns 200", async () => {
    const res = await supertest(app.server)
      .post("/api/v1/auth/reset-request")
      .send({ email: "nonexistent@example.com" });
    expect(res.status).toBe(200);
  });

  it("POST /api/v1/auth/reset — rejects bad token with 400", async () => {
    const email = "reset-test@example.com";
    await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, "resetuser"));

    await supertest(app.server)
      .post("/api/v1/auth/reset-request")
      .send({ email });

    const Profile = getProfileModel();
    const before = await Profile.findOne({ email });
    expect(before?.resetToken).toBeTruthy();
    expect(before?.resetTokenExpiresAt).toBeTruthy();

    const badRes = await supertest(app.server)
      .post("/api/v1/auth/reset")
      .send({ token: "bad-token", newPassword: "newpass456", confirmPassword: "newpass456" });
    expect(badRes.status).toBe(400);
  });

  it("POST /api/v1/auth/reset — rejects expired reset token with 400", async () => {
    const email = "expired-reset@example.com";
    await supertest(app.server)
      .post("/api/v1/auth/register")
      .send(regBody(email, "expireduser"));

    await supertest(app.server)
      .post("/api/v1/auth/reset-request")
      .send({ email });

    // Backdate the expiry to simulate an expired token
    const Profile = getProfileModel();
    await Profile.updateOne(
      { email },
      { $set: { resetTokenExpiresAt: new Date(Date.now() - 1000) } }
    );

    const profile = await Profile.findOne({ email });
    // Token hash is in DB; the raw token is unknown, but we can verify the expiry
    // path by using a syntactically valid token that doesn't match the hash:
    // The match check would succeed first, then the expiry check fires.
    // To exercise the expiry path directly, we insert a known hash.
    const bcrypt = await import("bcryptjs");
    const rawToken = "test-expiry-token-12345";
    const tokenHash = await bcrypt.hash(rawToken, 12);
    await Profile.updateOne(
      { email },
      {
        $set: {
          resetToken: tokenHash,
          resetTokenExpiresAt: new Date(Date.now() - 1000),
        },
      }
    );

    const res = await supertest(app.server)
      .post("/api/v1/auth/reset")
      .send({ token: rawToken, newPassword: "newpass789", confirmPassword: "newpass789" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);

    // Verify reset token was NOT cleared (reset was rejected)
    const after = await Profile.findOne({ email });
    expect(after?.resetToken).toBeTruthy();
  });

  afterAll(async () => {
    delete process.env["REGISTRATION_OPEN"];
  });
});
