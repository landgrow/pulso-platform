import { describe, it, expect } from "vitest";
import {
  emptyCallbackKind,
  hasAuthHash,
  inviteRedirectTo,
  isPasswordSetupType,
  resolveAppUrl,
  resolveAuthCallbackNext,
  safeCallbackNext,
} from "@/lib/auth/invite-callback";

describe("inviteRedirectTo", () => {
  it("appends the callback path that forces password setup", () => {
    expect(inviteRedirectTo("https://pulso.example.com")).toBe(
      "https://pulso.example.com/auth/callback?next=/reset-password",
    );
  });

  it("strips a trailing slash on the app URL", () => {
    expect(inviteRedirectTo("https://pulso.example.com/")).toBe(
      "https://pulso.example.com/auth/callback?next=/reset-password",
    );
  });
});

describe("resolveAppUrl", () => {
  it("prefers the explicit app URL", () => {
    expect(resolveAppUrl("https://pulso.example.com/")).toBe(
      "https://pulso.example.com",
    );
  });
});

describe("safeCallbackNext", () => {
  it("allows an internal path", () => {
    expect(safeCallbackNext("/reset-password")).toBe("/reset-password");
  });

  it("rejects open redirects", () => {
    expect(safeCallbackNext("https://evil.test")).toBe("/dashboard");
    expect(safeCallbackNext("//evil.test")).toBe("/dashboard");
    expect(safeCallbackNext(null)).toBe("/dashboard");
  });
});

describe("resolveAuthCallbackNext", () => {
  it("sends invite and recovery to reset-password even if next is dashboard", () => {
    expect(resolveAuthCallbackNext("invite", "/dashboard")).toBe(
      "/reset-password",
    );
    expect(resolveAuthCallbackNext("recovery", "/dashboard")).toBe(
      "/reset-password",
    );
  });

  it("keeps a safe next for oauth without password-setup type", () => {
    expect(resolveAuthCallbackNext(null, "/dashboard")).toBe("/dashboard");
  });
});

describe("isPasswordSetupType", () => {
  it("recognizes invite and recovery", () => {
    expect(isPasswordSetupType("invite")).toBe(true);
    expect(isPasswordSetupType("recovery")).toBe(true);
    expect(isPasswordSetupType("magiclink")).toBe(false);
  });
});

describe("emptyCallbackKind", () => {
  it("treats provider error as oauth cancel, not as invite", () => {
    expect(emptyCallbackKind("access_denied")).toBe("oauth_error");
  });

  it("sends hash-only callbacks to consume the invite token", () => {
    expect(emptyCallbackKind(null)).toBe("consume_hash");
  });
});

describe("hasAuthHash", () => {
  it("detects invite fragments", () => {
    expect(hasAuthHash("#access_token=abc&type=invite")).toBe(true);
    expect(hasAuthHash("")).toBe(false);
  });
});
