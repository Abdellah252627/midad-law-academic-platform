import { describe, expect, it } from "vitest";
import { calculateQuizScore } from "@shared/quiz";

describe("multi-question quiz scoring", () => {
  const questions = [
    { question: "سؤال 1", options: ["أ", "ب"], correctIndex: 0 },
    { question: "سؤال 2", options: ["أ", "ب"], correctIndex: 1 },
    { question: "سؤال 3", options: ["أ", "ب"], correctIndex: 0 },
  ];

  it("counts only selected correct answers", () => {
    expect(calculateQuizScore(questions, [0, 0, 0])).toBe(2);
    expect(calculateQuizScore(questions, [null, 1, null])).toBe(1);
  });

  it("calculates the final success rate", () => {
    const score = calculateQuizScore(questions, [0, 1, 1]);
    expect(score).toBe(2);
    expect(Math.round((score / questions.length) * 100)).toBe(67);
  });
});
