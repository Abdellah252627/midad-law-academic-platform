export type QuizQuestion = { question: string; options: string[]; correctIndex: number; explanation?: string; reviewConcept?: string };

export function calculateQuizScore(questions: QuizQuestion[], answers: Array<number | null>) {
  return questions.reduce((score, question, index) => score + (answers[index] === question.correctIndex ? 1 : 0), 0);
}

export function getQuizQuestionState(answers: Array<number | null>, evaluated: boolean[], index: number) {
  return { selectedIndex: answers[index] ?? null, submitted: evaluated[index] ?? false };
}

export const QUIZ_PASSING_PERCENTAGE = 60;

export function getQuizChapterAnchor(chapterNumber: string) {
  return `chapter-${chapterNumber}`;
}

export function getQuizResultStatus(score: number, total: number, passingPercentage = QUIZ_PASSING_PERCENTAGE) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const safePassingPercentage = Math.min(100, Math.max(0, Math.round(passingPercentage)));
  return { percentage, passingPercentage: safePassingPercentage, passed: percentage >= safePassingPercentage };
}

export function getIncorrectReviewConcepts(questions: QuizQuestion[], answers: Array<number | null>) {
  return Array.from(new Set(
    questions
      .filter((question, index) => answers[index] !== question.correctIndex)
      .map(question => question.reviewConcept?.trim())
      .filter((concept): concept is string => Boolean(concept)),
  ));
}

export function shuffleQuizQuestions(questions: QuizQuestion[], random: () => number = Math.random): QuizQuestion[] {
  return questions.map(question => {
    const optionsWithIndexes = question.options.map((option, index) => ({ option, index }));
    for (let index = optionsWithIndexes.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [optionsWithIndexes[index], optionsWithIndexes[swapIndex]] = [optionsWithIndexes[swapIndex], optionsWithIndexes[index]];
    }
    return {
      ...question,
      options: optionsWithIndexes.map(item => item.option),
      correctIndex: optionsWithIndexes.findIndex(item => item.index === question.correctIndex),
    };
  });
}
