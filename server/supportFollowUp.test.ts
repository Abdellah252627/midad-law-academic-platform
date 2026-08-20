import { describe, expect, it } from "vitest";
import { supportFollowUpFieldsSchema } from "../shared/supportFollowUp";

describe("support follow-up validation", () => {
  it("accepts a Moroccan phone number with a message", () => {
    const result = supportFollowUpFieldsSchema.safeParse({ phone: "06 12-34-56-78", message: "أرغب في معرفة موعد التواصل" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("0612345678");
  });

  it("accepts a valid phone number without an email address", () => {
    const result = supportFollowUpFieldsSchema.safeParse({ phone: "0612345678", message: "أحتاج إلى مساعدة من الفريق" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("");
  });

  it("accepts an optional valid email address", () => {
    const result = supportFollowUpFieldsSchema.safeParse({ phone: "0612345678", email: "student@example.com" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("student@example.com");
  });

  it("rejects a request without a phone number and invalid phone numbers", () => {
    expect(supportFollowUpFieldsSchema.safeParse({ message: "أحتاج إلى تواصل" }).success).toBe(false);
    expect(supportFollowUpFieldsSchema.safeParse({ phone: "", message: "أحتاج إلى تواصل" }).success).toBe(false);
    expect(supportFollowUpFieldsSchema.safeParse({ phone: "123", message: "أحتاج إلى تواصل" }).success).toBe(false);
  });

  it("rejects an invalid optional email", () => {
    expect(supportFollowUpFieldsSchema.safeParse({ phone: "0612345678", email: "not-an-email" }).success).toBe(false);
  });
});
