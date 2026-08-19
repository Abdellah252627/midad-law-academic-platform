import { describe, expect, it } from "vitest";
import { supportFollowUpFieldsSchema } from "../shared/supportFollowUp";

describe("support follow-up validation", () => {
  it("accepts a Moroccan phone number with a message", () => {
    const result = supportFollowUpFieldsSchema.safeParse({ phone: "06 12-34-56-78", message: "أرغب في معرفة موعد التواصل" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("0612345678");
  });

  it("accepts a message without requiring a phone number", () => {
    const result = supportFollowUpFieldsSchema.safeParse({ message: "أحتاج إلى مساعدة من الفريق" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("");
  });

  it("rejects an empty request and invalid phone number", () => {
    expect(supportFollowUpFieldsSchema.safeParse({ phone: "", message: "" }).success).toBe(false);
    expect(supportFollowUpFieldsSchema.safeParse({ phone: "123", message: "أحتاج إلى تواصل" }).success).toBe(false);
  });

  it("rejects a message shorter than five characters", () => {
    expect(supportFollowUpFieldsSchema.safeParse({ message: "نعم" }).success).toBe(false);
  });
});
