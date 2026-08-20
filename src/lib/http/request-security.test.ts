import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiRequestError,
  assertSameOriginRequest,
  readProtectedJson,
} from "./request-security";

test("une mutation cross-site est refusée", () => {
  const request = new Request("https://mpangi-pharma.app/api/test", {
    method: "POST",
    headers: {
      origin: "https://attaquant.example",
      "sec-fetch-site": "cross-site",
    },
  });

  assert.throws(
    () => assertSameOriginRequest(request),
    (error: unknown) =>
      error instanceof ApiRequestError && error.status === 403
  );
});

test("la taille réelle est contrôlée même sans content-length", async () => {
  const request = new Request("https://mpangi-pharma.app/api/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://mpangi-pharma.app",
    },
    body: JSON.stringify({ payload: "x".repeat(2_000) }),
  });

  await assert.rejects(
    () => readProtectedJson(request, { maxBytes: 1_024 }),
    (error: unknown) =>
      error instanceof ApiRequestError && error.status === 413
  );
});

test("un petit JSON de même origine est accepté", async () => {
  const request = new Request("https://mpangi-pharma.app/api/test", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      origin: "https://mpangi-pharma.app",
    },
    body: JSON.stringify({ ok: true }),
  });

  const body = await readProtectedJson<{ ok: boolean }>(request, {
    maxBytes: 1_024,
  });

  assert.equal(body.ok, true);
});
