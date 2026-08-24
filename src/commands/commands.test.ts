import assert from "node:assert/strict";
import { commands } from "./index";

console.log("Running commands registry tests...");

// Test 1: Registry only contains /gvg command
assert.equal(commands.size, 1, "Should only register 1 top-level command (/gvg)");
assert.ok(commands.has("gvg"), "Commands registry should contain 'gvg'");
assert.equal(commands.has("tts"), false, "Commands registry should NOT contain 'tts'");

// Test 2: Verify /gvg subcommands registration
const gvg = commands.get("gvg");
assert.ok(gvg, "gvgCommand should be defined");
const gvgJson = gvg.data.toJSON();
assert.equal(gvgJson.name, "gvg");
assert.ok(gvgJson.options && gvgJson.options.length === 4, "Should register 4 subcommands for /gvg");

const subcommandNames = gvgJson.options?.map((opt: any) => opt.name);
assert.deepEqual(subcommandNames?.sort(), ["offset", "ping", "start", "stop"].sort());

console.log("All commands registry tests passed successfully!");
