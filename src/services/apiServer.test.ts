import assert from "node:assert/strict";
import { env } from "../config";
import { startApiServer } from "./apiServer";

console.log("Running HTTP API Server tests...");

const TEST_PORT = 3999;
const baseUrl = `http://localhost:${TEST_PORT}`;
const apiInstance = startApiServer(TEST_PORT);

try {
    // Test 1: GET /api/action connection check
    const getRes = await fetch(`${baseUrl}/api/action`, { method: "GET" });
    assert.equal(getRes.status, 200, "GET /api/action should return 200 OK");
    const getBody = (await getRes.json()) as any;
    assert.equal(getBody.success, true, "GET response should indicate success");
    assert.equal(getBody.status, "online", "GET response status should be online");

    // Test 2: OPTIONS /api/action CORS preflight check
    const optionsRes = await fetch(`${baseUrl}/api/action`, { method: "OPTIONS" });
    assert.equal(optionsRes.status, 204, "OPTIONS /api/action should return 204 No Content");
    assert.equal(
        optionsRes.headers.get("access-control-allow-origin"),
        "*",
        "Should return CORS header",
    );

    // Test 3: POST /api/action valid client event payload with token
    const postPayload = {
        token: env.CLIENT_EVENT_TOKEN,
        event: "key_press",
        value: "Acción Numpad 1",
    };
    const postRes = await fetch(`${baseUrl}/api/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload),
    });
    assert.equal(postRes.status, 200, "POST /api/action with valid payload and token should return 200 OK");
    const postBody = (await postRes.json()) as any;
    assert.equal(postBody.success, true, "POST response should be successful");
    assert.equal(postBody.data.event, "key_press", "Returned event name should match");
    assert.equal(postBody.data.value, "Acción Numpad 1", "Returned string value should match");

    // Test 4: POST /api/action with invalid token (401 Unauthorized)
    const unauthorizedRes = await fetch(`${baseUrl}/api/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "wrong_token", event: "key_press", value: "test" }),
    });
    assert.equal(unauthorizedRes.status, 401, "POST /api/action with wrong token should return 401 Unauthorized");
    const unauthorizedBody = (await unauthorizedRes.json()) as any;
    assert.equal(unauthorizedBody.success, false, "Unauthorized request should return success: false");

    // Test 5: POST /api/action missing token/schema error (400 Bad Request)
    const invalidRes = await fetch(`${baseUrl}/api/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "key_press", value: "test" }), // Missing token
    });
    assert.equal(invalidRes.status, 400, "POST /api/action missing token should return 400");
    const invalidBody = (await invalidRes.json()) as any;
    assert.equal(invalidBody.success, false, "Invalid payload should return success: false");

    // Test 6: 404 Not Found for unknown paths
    const notFoundRes = await fetch(`${baseUrl}/unknown-path`, { method: "GET" });
    assert.equal(notFoundRes.status, 404, "Unknown route should return 404");

    console.log("All HTTP API Server tests passed successfully!");
} finally {
    await apiInstance.stop();
}
