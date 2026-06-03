/** @param {import('i18next').TFunction} t */
export function getLocalizedQuestions(t, isTasks, categoryKey, fallbackQuestions) {
  const prefix = isTasks ? 'templates.taskQuestions' : 'templates.interviewQuestions';
  const translated = t(`${prefix}.${categoryKey}`, { returnObjects: true });
  if (Array.isArray(translated) && translated.length > 0
      && translated.every((q) => typeof q === 'string')) {
    return translated;
  }
  return fallbackQuestions;
}

/** @param {import('i18next').TFunction} t */
export function getLocalizedCategoryLabel(t, isTasks, categoryKey, fallbackLabel) {
  const key = isTasks
    ? `templates.taskCategories.${categoryKey}`
    : `templates.categories.${categoryKey}`;
  return t(key, fallbackLabel);
}

export function formatQuestionList(questions) {
  return questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
}
