import { describe, expect, it } from "vitest";
import { calculateQuizScore, getIncorrectReviewConcepts, getQuizChapterAnchor, getQuizQuestionState, getQuizResultStatus, QUIZ_PASSING_PERCENTAGE, shuffleQuizQuestions } from "@shared/quiz";

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

  it("restores the selected answer and submitted state when navigating back", () => {
    const answers = [0, 1, null];
    const evaluated = [true, true, false];
    expect(getQuizQuestionState(answers, evaluated, 0)).toEqual({ selectedIndex: 0, submitted: true });
    expect(getQuizQuestionState(answers, evaluated, 2)).toEqual({ selectedIndex: null, submitted: false });
  });

  it("uses 60% as the passing threshold", () => {
    expect(QUIZ_PASSING_PERCENTAGE).toBe(60);
    expect(getQuizResultStatus(3, 5)).toEqual({ percentage: 60, passed: true, passingPercentage: 60 });
    expect(getQuizResultStatus(2, 5)).toEqual({ percentage: 40, passed: false, passingPercentage: 60 });
  });

  it("creates a stable chapter anchor for the review action", () => {
    expect(getQuizChapterAnchor("04")).toBe("chapter-04");
  });

  it("lists unique review concepts for incorrect answers", () => {
    const conceptQuestions = [
      { question: "سؤال 1", options: ["أ", "ب"], correctIndex: 0, reviewConcept: "القاعدة القانونية" },
      { question: "سؤال 2", options: ["أ", "ب"], correctIndex: 1, reviewConcept: "مصادر القانون" },
      { question: "سؤال 3", options: ["أ", "ب"], correctIndex: 0, reviewConcept: "مصادر القانون" },
    ];
    expect(getIncorrectReviewConcepts(conceptQuestions, [1, 1, 1])).toEqual(["القاعدة القانونية", "مصادر القانون"]);
  });

  it("moves the correct answer with its option when choices are shuffled", () => {
    const [shuffled] = shuffleQuizQuestions([{ question: "سؤال", options: ["الصحيح", "الخاطئ", "المشتت"], correctIndex: 0 }], () => 0);
    expect(shuffled.options).toEqual(["الخاطئ", "المشتت", "الصحيح"]);
    expect(shuffled.correctIndex).toBe(2);
    expect(calculateQuizScore([shuffled], [2])).toBe(1);
  });
});
