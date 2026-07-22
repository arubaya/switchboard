import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getVersionInfo } from "./version.js";

describe("getVersionInfo", () => {
  it("returns a semver-like version string", () => {
    const info = getVersionInfo();
    assert.match(info.version, /^\d+\.\d+\.\d+/);
    assert.equal(typeof info.build, "string");
    assert.ok(info.commit === null || typeof info.commit === "string");
  });
});
