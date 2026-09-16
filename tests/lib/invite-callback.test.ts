import { describe, it, expect } from "vitest";
import {
  emptyCallbackKind,
  HASH_FORWARD_HTML,
  hasAuthHash,
  inviteRedirectTo,
  isPasswordSetupType,
  parseAuthCallbackParams,
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

describe("parseAuthCallbackParams", () => {
  it("reads implicit tokens from the hash", () => {
    const parsed = parseAuthCallbackParams(
      "?next=/reset-password",
      "#access_token=aaa&refresh_token=bbb&type=invite",
    );
    expect(parsed.accessToken).toBe("aaa");
    expect(parsed.refreshToken).toBe("bbb");
    expect(parsed.type).toBe("invite");
  });

  it("reads PKCE code and OTP hash from the query", () => {
    expect(parseAuthCallbackParams("?code=pkce-1", "")).toEqual({
      code: "pkce-1",
      tokenHash: null,
      type: null,
      accessToken: null,
      refreshToken: null,
    });
    expect(
      parseAuthCallbackParams("?token_hash=otp&type=recovery", ""),
    ).toMatchObject({
      tokenHash: "otp",
      type: "recovery",
    });
  });
});

describe("HASH_FORWARD_HTML", () => {
  it("keeps the hash by staying on the callback URL then forwarding it", () => {
    expect(HASH_FORWARD_HTML).toContain("location.hash");
    expect(HASH_FORWARD_HTML).toContain("/auth/confirm?next=/reset-password");
  });
});
