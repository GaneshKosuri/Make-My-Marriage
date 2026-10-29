/** "an Admin", "a Manager": the indefinite article for a word, by its first letter. */
export function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
}
