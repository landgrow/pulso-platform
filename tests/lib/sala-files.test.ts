import { describe, expect, it } from "vitest";
import { isSalaChannelFilePath } from "@/lib/sala/files";

const channel = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("isSalaChannelFilePath", () => {
  it("aceita só o prefixo sala/{canal}/arquivo", () => {
    expect(
      isSalaChannelFilePath(channel, `sala/${channel}/file.pdf`),
    ).toBe(true);
  });

  it("recusa path de outro canal, traversal e nested", () => {
    expect(
      isSalaChannelFilePath(channel, `sala/${other}/file.pdf`),
    ).toBe(false);
    expect(
      isSalaChannelFilePath(channel, `sala/${channel}/../x`),
    ).toBe(false);
    expect(
      isSalaChannelFilePath(channel, `sala/${channel}/a/b`),
    ).toBe(false);
    expect(isSalaChannelFilePath(channel, "evidencias/x")).toBe(false);
  });
});
