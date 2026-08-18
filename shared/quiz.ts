export type QuizQuestion = { question: string; options: string[]; correctIndex: number; explanation?: string };

export function calculateQuizScore(questions: QuizQuestion[], answers: Array<number | null>) {
  return questions.reduce((score, question, index) => score + (answers[index] === question.correctIndex ? 1 : 0), 0);
}

export function getQuizQuestionState(answers: Array<number | null>, evaluated: boolean[], index: number) {
  return { selectedIndex: answers[index] ?? null, submitted: evaluated[index] ?? false };
}
