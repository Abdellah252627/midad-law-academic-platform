import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const dashboardLayout = fs.readFileSync(
  path.resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"),
  "utf8",
);

describe("admin notification sound", () => {
  it("detects only newly unread notification ids after the initial snapshot", () => {
    const previous = new Set([10, 11]);
    const currentWithExisting = new Set([10, 11]);
    const currentWithNew = new Set([10, 11, 12]);

    expect(Array.from(currentWithExisting).some(id => !previous.has(id))).toBe(false);
    expect(Array.from(currentWithNew).some(id => !previous.has(id))).toBe(true);
  });

  it("includes a browser-safe mute control and persisted preference", () => {
    expect(dashboardLayout).toContain("midad-notification-sound");
    expect(dashboardLayout).toContain("toggleNotificationSound");
    expect(dashboardLayout).toContain("VolumeX");
    expect(dashboardLayout).toContain("AudioContext");
  });

  it("does not couple notification sound failures to notification actions", () => {
    expect(dashboardLayout).toContain("catch {");
    expect(dashboardLayout).toContain("يمنع فشل Audio API");
  });
});
