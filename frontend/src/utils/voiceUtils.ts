/**
 * Checks if a specific word exists in a transcript as a standalone word.
 * This prevents false positives like finding "no" in "know" or "yes" in "yesterday".
 *
 * @param transcript The full text to search
 * @param targetWord The word to look for
 * @returns boolean
 */
export const isStandaloneWord = (transcript: string, targetWord: string): boolean => {
  const words = transcript.toLowerCase().trim().split(/\s+/);
  return words.includes(targetWord.toLowerCase());
};

/**
 * Checks if a transcript contains any word from a list of target words.
 *
 * @param transcript The full text to search
 * @param targetWords Array of words to look for
 * @returns boolean
 */
export const containsAnyWord = (transcript: string, targetWords: string[]): boolean => {
  const words = transcript.toLowerCase().trim().split(/\s+/);
  return targetWords.some(target => words.includes(target.toLowerCase()));
};

/**
 * Determines if a transcript is likely an echo of the system's own speech.
 *
 * @param transcript The text heard by the microphone
 * @returns boolean
 */
export const isSystemEcho = (transcript: string): boolean => {
  const lower = transcript.toLowerCase();
  // Common phrases ARIA uses in questions
  const echoPhrases = [
    'is that correct',
    'are you sure',
    'do you want to',
    'did you mean'
  ];
  return echoPhrases.some(phrase => lower.includes(phrase));
};
