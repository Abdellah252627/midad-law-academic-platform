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


it("supports the final preview result with passing status and review concepts", async () => {
  const { getIncorrectReviewConcepts, getQuizResultStatus } = await import("./quiz");
  const questions = [
    { question: "س1", options: ["أ", "ب", "ج", "د"], correctIndex: 0, reviewConcept: "المفهوم الأول" },
    { question: "س2", options: ["أ", "ب", "ج", "د"], correctIndex: 2, reviewConcept: "المفهوم الثاني" },
    { question: "س3", options: ["أ", "ب", "ج", "د"], correctIndex: 1, reviewConcept: "المفهوم الأول" },
  ];
  expect(getQuizResultStatus(2, questions.length, 60)).toMatchObject({ percentage: 67, passingPercentage: 60, passed: true });
  expect(getIncorrectReviewConcepts(questions, [0, 0, 1])).toEqual(["المفهوم الثاني", "المفهوم الأول"]);
});


it("builds immediate passing and failing preview answers without mutating questions", async () => {
  const { buildPreviewAnswers } = await import("./quiz");
  const questions = [
    { question: "س1", options: ["أ", "ب", "ج", "د"], correctIndex: 0 },
    { question: "س2", options: ["أ", "ب", "ج", "د"], correctIndex: 2 },
  ];
  expect(buildPreviewAnswers(questions, true)).toEqual([0, 2]);
  expect(buildPreviewAnswers(questions, false)).toEqual([1, 0]);
  expect(questions[0].correctIndex).toBe(0);
});
