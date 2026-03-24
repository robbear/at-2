import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import supertest from "supertest";
import mongoose from "mongoose";
import { encode } from "@auth/core/jwt";
import { buildApp } from "./app.js";
import { connectDb, disconnectDb } from "./db.js";
import { getProfileModel } from "./models/profile.js";
import { getMarkerModel } from "./models/marker.js";
import type { FastifyInstance } from "fastify";

// Mock S3 so presign tests don't hit real Cloudflare R2
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((params: unknown) => params),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://mocked-presigned-url.example.com/test"),
}));

const COOKIE_NAME = "atlasphere.session-token";

async function makeJwt(id: string, email: string, userId: string): Promise<string> {
  return encode({
    token: { sub: id, email, userId },
    secret: process.env["AUTH_SECRET"]!,
    salt: COOKIE_NAME,
  });
}

describe("Markers, profiles, and upload routes", () => {
  let app: FastifyInstance;
  let aliceJwt: string;
  let bobJwt: string;

  const ALICE = { id: "alice-id", email: "alice@example.com", userId: "alice" };
  const BOB = { id: "bob-id", email: "bob@example.com", userId: "bob" };

  beforeAll(async () => {
    const uri = process.env["MONGODB_URI_TEST"];
    if (!uri) throw new Error("MONGODB_URI_TEST is not set");

    await connectDb(uri, "atlasphere-v2-test");

    // Wipe all collections to start fresh
    const db = mongoose.connection.db;
    if (!db) throw new Error("No DB connection");
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      await db.collection(col.name).deleteMany({});
    }

    // Create test profiles directly (skip registration/verification flow)
    const Profile = getProfileModel();
    await Profile.create([
      {
        _id: ALICE.id,
        userId: ALICE.userId,
        email: ALICE.email,
        name: "Alice Test",
        emailVerified: true,
        createdAt: new Date(),
      },
      {
        _id: BOB.id,
        userId: BOB.userId,
        email: BOB.email,
        name: "Bob Test",
        emailVerified: true,
        createdAt: new Date(),
      },
    ]);

    // Ensure 2dsphere index exists before any $nearSphere queries
    const Marker = getMarkerModel();
    await Marker.createIndexes();

    aliceJwt = await makeJwt(ALICE.id, ALICE.email, ALICE.userId);
    bobJwt = await makeJwt(BOB.id, BOB.email, BOB.userId);

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  // -------------------------------------------------------------------------
  // Marker creation
  // -------------------------------------------------------------------------

  describe("POST /api/v1/markers", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/markers")
        .send({
          title: "Test marker",
          location: { type: "Point", coordinates: [-122.0839, 37.3861] },
          datetime: "2024-06-01T00:00:00Z",
        });
      expect(res.status).toBe(401);
    });

    it("rejects invalid body with 400", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/markers")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({ title: "" }); // missing required location/datetime
      expect(res.status).toBe(400);
    });

    it("creates a marker and returns 201 with id = {userId}/{timestamp}", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/markers")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({
          title: "Alice's first marker",
          location: { type: "Point", coordinates: [-122.0839, 37.3861] },
          datetime: "2024-06-01T00:00:00Z",
          tags: ["hiking", "california"],
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^alice\/\d+$/);
      expect(res.body.userId).toBe("alice");
      expect(res.body.title).toBe("Alice's first marker");
      expect(res.body.tags).toEqual(["hiking", "california"]);
      expect(res.body.draft).toBe(false);
      expect(res.body.deleted).toBe(false);
    });

    it("creates a draft marker when draft=true", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/markers")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({
          title: "Alice's draft",
          location: { type: "Point", coordinates: [-122.0, 37.5] },
          datetime: "2024-07-01T00:00:00Z",
          draft: true,
        });
      expect(res.status).toBe(201);
      expect(res.body.draft).toBe(true);
    });

    it("allows Bob to create his own marker", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/markers")
        .set("Authorization", `Bearer ${bobJwt}`)
        .send({
          title: "Bob's marker",
          location: { type: "Point", coordinates: [-73.9857, 40.7484] },
          datetime: "2024-08-01T00:00:00Z",
          tags: ["nyc"],
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^bob\/\d+$/);
      expect(res.body.userId).toBe("bob");
    });
  });

  // -------------------------------------------------------------------------
  // Get single marker
  // -------------------------------------------------------------------------

  describe("GET /api/v1/markers/:userId/:timestamp", () => {
    it("returns 404 for non-existent marker", async () => {
      const res = await supertest(app.server).get("/api/v1/markers/alice/9999999");
      expect(res.status).toBe(404);
    });

    it("returns the marker by id", async () => {
      // Create a marker and fetch it back
      const create = await supertest(app.server)
        .post("/api/v1/markers")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({
          title: "Fetchable marker",
          location: { type: "Point", coordinates: [-120.0, 38.0] },
          datetime: "2024-09-01T00:00:00Z",
        });
      expect(create.status).toBe(201);

      const [userId, timestamp] = (create.body.id as string).split("/");
      const res = await supertest(app.server).get(
        `/api/v1/markers/${userId}/${timestamp}`
      );
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(create.body.id);
      expect(res.body.title).toBe("Fetchable marker");
    });
  });

  // -------------------------------------------------------------------------
  // Update marker
  // -------------------------------------------------------------------------

  describe("PUT /api/v1/markers/:userId/:timestamp", () => {
    let markerId: string;

    beforeAll(async () => {
      const res = await supertest(app.server)
        .post("/api/v1/markers")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({
          title: "Updatable marker",
          location: { type: "Point", coordinates: [-121.0, 38.5] },
          datetime: "2024-10-01T00:00:00Z",
        });
      markerId = res.body.id as string;
    });

    it("rejects unauthenticated request with 401", async () => {
      const [userId, timestamp] = markerId.split("/");
      const res = await supertest(app.server)
        .put(`/api/v1/markers/${userId}/${timestamp}`)
        .send({ title: "New title" });
      expect(res.status).toBe(401);
    });

    it("rejects non-owner update with 403", async () => {
      const [userId, timestamp] = markerId.split("/");
      const res = await supertest(app.server)
        .put(`/api/v1/markers/${userId}/${timestamp}`)
        .set("Authorization", `Bearer ${bobJwt}`)
        .send({ title: "Bob tries to update Alice's marker" });
      expect(res.status).toBe(403);
    });

    it("owner can update the marker", async () => {
      const [userId, timestamp] = markerId.split("/");
      const res = await supertest(app.server)
        .put(`/api/v1/markers/${userId}/${timestamp}`)
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({ title: "Updated title", tags: ["updated"] });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated title");
      expect(res.body.tags).toEqual(["updated"]);
    });

    it("owner can archive the marker", async () => {
      const [userId, timestamp] = markerId.split("/");
      const res = await supertest(app.server)
        .put(`/api/v1/markers/${userId}/${timestamp}`)
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({ archived: true });
      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Delete marker
  // -------------------------------------------------------------------------

  describe("DELETE /api/v1/markers/:userId/:timestamp", () => {
    let markerId: string;

    beforeAll(async () => {
      const res = await supertest(app.server)
        .post("/api/v1/markers")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({
          title: "Deletable marker",
          location: { type: "Point", coordinates: [-119.0, 37.0] },
          datetime: "2024-11-01T00:00:00Z",
        });
      markerId = res.body.id as string;
    });

    it("rejects non-owner delete with 403", async () => {
      const [userId, timestamp] = markerId.split("/");
      const res = await supertest(app.server)
        .delete(`/api/v1/markers/${userId}/${timestamp}`)
        .set("Authorization", `Bearer ${bobJwt}`);
      expect(res.status).toBe(403);
    });

    it("owner can soft-delete the marker", async () => {
      const [userId, timestamp] = markerId.split("/");
      const res = await supertest(app.server)
        .delete(`/api/v1/markers/${userId}/${timestamp}`)
        .set("Authorization", `Bearer ${aliceJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("deleted marker returns 404 on GET", async () => {
      const [userId, timestamp] = markerId.split("/");
      const res = await supertest(app.server).get(
        `/api/v1/markers/${userId}/${timestamp}`
      );
      expect(res.status).toBe(404);
    });

    it("deleted marker does not appear in search", async () => {
      const [userId] = markerId.split("/");
      const res = await supertest(app.server).get(
        `/api/v1/markers?userIds=${userId}&markerIds=${encodeURIComponent(markerId)}`
      );
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map((m) => m.id);
      expect(ids).not.toContain(markerId);
    });
  });

  // -------------------------------------------------------------------------
  // Search / list markers
  // -------------------------------------------------------------------------

  describe("GET /api/v1/markers — search", () => {
    // Create a known set of markers for search tests
    const searchMarkers: string[] = [];

    beforeAll(async () => {
      const toCreate = [
        {
          jwt: aliceJwt,
          body: {
            title: "Search: Alice hiking",
            location: { type: "Point", coordinates: [-122.0839, 37.3861] },
            datetime: "2024-01-15T00:00:00Z",
            tags: ["hiking", "california"],
          },
        },
        {
          jwt: aliceJwt,
          body: {
            title: "Search: Alice trails",
            location: { type: "Point", coordinates: [-122.1, 37.4] },
            datetime: "2024-03-20T00:00:00Z",
            tags: ["trails", "california"],
          },
        },
        {
          jwt: bobJwt,
          body: {
            title: "Search: Bob NYC",
            location: { type: "Point", coordinates: [-73.9857, 40.7484] },
            datetime: "2024-06-10T00:00:00Z",
            tags: ["nyc", "urban"],
          },
        },
      ];

      for (const { jwt, body } of toCreate) {
        const res = await supertest(app.server)
          .post("/api/v1/markers")
          .set("Authorization", `Bearer ${jwt}`)
          .send(body);
        searchMarkers.push(res.body.id as string);
      }
    });

    it("returns all public non-deleted markers (no filter)", async () => {
      const res = await supertest(app.server).get("/api/v1/markers");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // At minimum the 3 search markers should be present
      const ids = (res.body as Array<{ id: string }>).map((m) => m.id);
      for (const id of searchMarkers) {
        expect(ids).toContain(id);
      }
    });

    it("filters by userId", async () => {
      const res = await supertest(app.server).get("/api/v1/markers?userIds=alice");
      expect(res.status).toBe(200);
      const markers = res.body as Array<{ id: string; userId: string }>;
      expect(markers.length).toBeGreaterThanOrEqual(1);
      for (const m of markers) {
        expect(m.userId).toBe("alice");
      }
    });

    it("filters by multiple userIds", async () => {
      const res = await supertest(app.server).get(
        "/api/v1/markers?userIds=alice&userIds=bob"
      );
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map((m) => m.id);
      expect(ids).toContain(searchMarkers[0]);
      expect(ids).toContain(searchMarkers[2]);
    });

    it("filters by tag (OR by default)", async () => {
      const res = await supertest(app.server).get("/api/v1/markers?tags=hiking");
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map((m) => m.id);
      expect(ids).toContain(searchMarkers[0]); // has "hiking"
      expect(ids).not.toContain(searchMarkers[2]); // has "nyc"
    });

    it("filters by multiple tags with allTags=true (AND)", async () => {
      // Only searchMarkers[0] has BOTH hiking AND california
      const res = await supertest(app.server).get(
        "/api/v1/markers?tags=hiking&tags=california&allTags=true"
      );
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map((m) => m.id);
      expect(ids).toContain(searchMarkers[0]);
      expect(ids).not.toContain(searchMarkers[2]); // doesn't have hiking
    });

    it("filters by markerIds", async () => {
      const target = searchMarkers[1];
      const res = await supertest(app.server).get(
        `/api/v1/markers?markerIds=${encodeURIComponent(target)}`
      );
      expect(res.status).toBe(200);
      expect((res.body as Array<{ id: string }>).length).toBe(1);
      expect((res.body as Array<{ id: string }>)[0].id).toBe(target);
    });

    it("filters by dateRange", async () => {
      const res = await supertest(app.server).get(
        "/api/v1/markers?dateRange.start=2024-01-01&dateRange.end=2024-02-28"
      );
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map((m) => m.id);
      expect(ids).toContain(searchMarkers[0]); // Jan 2024
      expect(ids).not.toContain(searchMarkers[2]); // Jun 2024
    });

    it("excludes draft markers from search", async () => {
      // Alice's draft was created earlier
      const res = await supertest(app.server).get("/api/v1/markers?userIds=alice");
      const titles = (res.body as Array<{ title: string }>).map((m) => m.title);
      expect(titles).not.toContain("Alice's draft");
    });

    it("proximity search with near returns markers within distance", async () => {
      // Search near San Jose, CA — should find Alice's markers but not Bob's NYC one
      const res = await supertest(app.server).get(
        "/api/v1/markers?near.lat=37.3382&near.lng=-121.8863&near.distance=50000"
      );
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map((m) => m.id);
      // Alice's markers are near San Jose, Bob's NYC marker is ~4000km away
      expect(ids).toContain(searchMarkers[0]);
      expect(ids).not.toContain(searchMarkers[2]);
    });
  });

  // -------------------------------------------------------------------------
  // Profile routes
  // -------------------------------------------------------------------------

  describe("GET /api/v1/profiles/:userId", () => {
    it("returns 404 for unknown userId", async () => {
      const res = await supertest(app.server).get("/api/v1/profiles/nobody");
      expect(res.status).toBe(404);
    });

    it("returns public profile fields", async () => {
      const res = await supertest(app.server).get("/api/v1/profiles/alice");
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe("alice");
      expect(res.body.name).toBe("Alice Test");
      // Should NOT include sensitive fields
      expect(res.body.email).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe("PUT /api/v1/profiles/:userId", () => {
    it("rejects unauthenticated request with 401", async () => {
      const res = await supertest(app.server)
        .put("/api/v1/profiles/alice")
        .send({ name: "New Name" });
      expect(res.status).toBe(401);
    });

    it("rejects non-owner update with 403", async () => {
      const res = await supertest(app.server)
        .put("/api/v1/profiles/alice")
        .set("Authorization", `Bearer ${bobJwt}`)
        .send({ name: "Bob hacks Alice" });
      expect(res.status).toBe(403);
    });

    it("owner can update their profile", async () => {
      const res = await supertest(app.server)
        .put("/api/v1/profiles/alice")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({ name: "Alice Updated", bio: "I like hiking" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Alice Updated");
      expect(res.body.bio).toBe("I like hiking");
    });
  });

  // -------------------------------------------------------------------------
  // Upload presign
  // -------------------------------------------------------------------------

  describe("POST /api/v1/upload/presign", () => {
    it("rejects unauthenticated request with 401", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/upload/presign")
        .send({ filename: "image.jpg", contentType: "image/jpeg", purpose: "profile" });
      expect(res.status).toBe(401);
    });

    it("rejects missing body fields with 400", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/upload/presign")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({ filename: "image.jpg" }); // missing contentType and purpose
      expect(res.status).toBe(400);
    });

    it("rejects marker-image without markerTimestamp with 400", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/upload/presign")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({ filename: "photo.jpg", contentType: "image/jpeg", purpose: "marker-image" });
      expect(res.status).toBe(400);
    });

    it("returns presigned URL for profile picture", async () => {
      const res = await supertest(app.server)
        .post("/api/v1/upload/presign")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({ filename: "avatar.jpg", contentType: "image/jpeg", purpose: "profile" });
      expect(res.status).toBe(200);
      expect(res.body.uploadUrl).toBe("https://mocked-presigned-url.example.com/test");
      expect(res.body.r2Path).toBe("accounts/alice/profile/avatar.jpg");
    });

    it("returns presigned URL for marker image with correct r2Path", async () => {
      const ts = 1700000000000;
      const res = await supertest(app.server)
        .post("/api/v1/upload/presign")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({
          filename: "photo.jpg",
          contentType: "image/jpeg",
          purpose: "marker-image",
          markerTimestamp: ts,
        });
      expect(res.status).toBe(200);
      expect(res.body.r2Path).toBe(`accounts/alice/images/${ts}/photo.jpg`);
    });

    it("returns presigned URL for marker MDX content with correct r2Path", async () => {
      const ts = 1700000000000;
      const res = await supertest(app.server)
        .post("/api/v1/upload/presign")
        .set("Authorization", `Bearer ${aliceJwt}`)
        .send({
          filename: "content.mdx",
          contentType: "text/plain",
          purpose: "marker-content",
          markerTimestamp: ts,
        });
      expect(res.status).toBe(200);
      expect(res.body.r2Path).toBe(`accounts/alice/html/${ts}.mdx`);
    });
  });
});
