import { describe, expect, it } from "vitest";
import { isQuizPreviewReady } from "./quiz";

describe("isQuizPreviewReady", () => {
  const validQuestion = {
    question: "ما المقصود بالقانون؟",
    options: ["تعريف أول", "تعريف ثان", "تعريف ثالث", "تعريف رابع"],
    correctIndex: 1,
    explanation: "تفسير مختصر",
  };

  it("accepts a complete local draft before preview", () => {
    expect(isQuizPreviewReady([validQuestion])).toBe(true);
  });

  it("rejects empty or incomplete drafts", () => {
    expect(isQuizPreviewReady([])).toBe(false);
    expect(isQuizPreviewReady([{ ...validQuestion, question: "" }])).toBe(false);
    expect(isQuizPreviewReady([{ ...validQuestion, options: ["أ", "ب", "", "د"] }])).toBe(false);
    expect(isQuizPreviewReady([{ ...validQuestion, correctIndex: 4 }])).toBe(false);
  });
});
