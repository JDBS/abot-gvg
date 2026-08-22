import assert from "node:assert/strict";
import { generateTTSQueueItems } from "./ttsUtils";

console.log("Running TTS service & utils tests...");

// Test 1: generates TTS URLs for simple text
const items = generateTTSQueueItems("Hola mundo", { lang: "es" });
assert.ok(items.length > 0, "Should generate at least one queue item");
const item0 = items[0];
assert.ok(item0, "Item 0 must exist");
assert.ok(item0.url.includes("translate.google.com"), "URL should point to Google Translate TTS");
assert.equal(item0.text, "Hola mundo");

// Test 2: default options (es language)
const defaultItems = generateTTSQueueItems("Test text");
const defaultItem0 = defaultItems[0];
assert.ok(defaultItem0, "Default item 0 must exist");
assert.ok(defaultItem0.url.includes("tl=es"), "Default language should be 'es'");

// Test 3: custom options (en language, slow rate)
const customItems = generateTTSQueueItems("Slow speech test", { lang: "en", slow: true });
const customItem0 = customItems[0];
assert.ok(customItem0, "Custom item 0 must exist");
assert.ok(customItem0.url.includes("tl=en"), "Language option should be applied");

// Test 4: throws on empty string
assert.throws(() => generateTTSQueueItems(""), /Text parameter must be a non-empty string/);
assert.throws(() => generateTTSQueueItems("   "), /Text parameter must be a non-empty string/);

console.log("All TTS service & utils tests passed!");
