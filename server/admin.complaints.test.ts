import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin complaints management", () => {
  it("exposes protected list, detail, and update procedures with strict validation", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(router).toContain("complaints: adminProcedure");
    expect(router).toContain("complaint: adminProcedure");
    expect(router).toContain("updateComplaint: adminProcedure");
    expect(router).toContain('z.enum(["new", "in_review", "needs_info", "responded", "closed"])');
    expect(router).toContain("responseChanged");
    expect(router).toContain("getComplaintAuditEvents");
    expect(router).toContain("complaint.created");
    expect(router).toContain("timeline");
    expect(router).toContain('action: "complaint.update"');
  });

  it("supports safe server-side search, filtering, pagination, and response persistence", () => {
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    expect(db).toContain("export async function getAdminComplaints");
    expect(db).toContain("like(complaints.ticketNumber");
    expect(db).toContain("like(complaints.fullName");
    expect(db).toContain("like(complaints.email");
    expect(db).toContain("offset((page - 1) * pageSize)");
    expect(db).toContain("export async function updateComplaintAdmin");
    expect(db).toContain("statusCounts");
    expect(db).toContain("groupBy(complaints.status)");
    expect(db).toContain("export async function getComplaintAuditEvents");
    expect(db).toContain('eq(auditLogs.entityType, "complaint")');
    expect(schema).toContain('adminResponse: text("adminResponse")');
    expect(schema).toContain('responseUpdatedByUserId: int("responseUpdatedByUserId")');
    expect(schema).toContain('responseUpdatedAt: timestamp("responseUpdatedAt")');
  });

  it("registers the RTL complaints page and sidebar escape route", () => {
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/AdminComplaints.tsx"), "utf8");
    expect(app).toContain('<Route path="/admin/complaints" component={AdminComplaints} />');
    expect(layout).toContain('path: "/admin/complaints"');
    expect(page).toContain('dir="rtl"');
    expect(page).toContain("trpc.admin.complaints.useQuery");
    expect(page).toContain("trpc.admin.updateComplaint.useMutation");
    expect(page).toContain("الرد الإداري");
    expect(page).toContain("تصفية سريعة حسب حالة الشكوى");
    expect(page).toContain("aria-pressed={status === item.value}");
    expect(page).toContain("statusCounts[item.value]");
    expect(page).toContain("const queryUtils = trpc.useUtils();");
    expect(page).toContain("queryUtils.admin.complaints.invalidate()");
    expect(page).toContain("تم نقل الشكوى من");
    expect(page).toContain("statusMeta(transition.from).label");
    expect(page).toContain("statusMeta(transition.to).label");
    expect(page).toContain("السجل الزمني للشكوى");
    expect(page).toContain("timelineEventLabel");
    expect(page).toContain("مدير #");
    expect(page).toContain("calculateStatusDurations");
    expect(page).toContain("formatDuration");
    expect(page).toContain("المدة حتى الآن");
    expect(page).toContain("window.setInterval");
    expect(page).not.toContain("سجل الشكاوى في Google Sheets");
    expect(page).not.toContain("17lxuTvPRPayqbdzBtAX6BaU2i5OhxZcxSTkr0xWdzUE");
  });

  it("keeps Google Sheets access scoped to the purchases dashboard", () => {
    const purchases = readFileSync(resolve(process.cwd(), "client/src/pages/AdminPurchases.tsx"), "utf8");
    expect(purchases).toContain("فتح سجل Google Sheets");
    expect(purchases).toContain("1O6JEqrlxfaVui-BQ8VOr6nv9JxLd2Qz3013xfjFuirw");
  });
});
