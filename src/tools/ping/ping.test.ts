import { describe, expect, it } from "vitest";

import { createPingText } from "./ping.tool.js";

describe("createPingText", () => {
  it("returns pong when message is not provided", () => {
    expect(createPingText()).toBe("pong");
  });

  it("returns the provided message", () => {
    expect(createPingText("hello")).toBe("hello");
  });
});
