/**
 * Profanity Detection and Emotional Response System
 * Tracks user's language and provides varied responses with escalating emotions
 */

// Common profanity patterns (censored for code)
const PROFANITY_PATTERNS = [
  /\bf+u+c+k+/i,
  /\bs+h+i+t+/i,
  /\bb+i+t+c+h+/i,
  /\ba+s+s+h+o+l+e+/i,
  /\bd+a+m+n+/i,
  /\bc+r+a+p+/i,
  /\bh+e+l+l+/i,
  /\bb+a+s+t+a+r+d+/i,
  /\bp+i+s+s+/i,
  /\bc+u+n+t+/i,
  /\bw+h+o+r+e+/i,
  /\bs+l+u+t+/i,
  /\bd+i+c+k+/i,
  /\bc+o+c+k+/i,
];

export interface ProfanityState {
  count: number;
  lastOffense: number;
  emotionalLevel: 'calm' | 'annoyed' | 'frustrated' | 'angry';
}

const STORAGE_KEY = 'aria_profanity_state';
const OFFENSE_TIMEOUT = 5 * 60 * 1000; // 5 minutes - reset emotional state after this

/**
 * Get current profanity state
 */
export function getProfanityState(): ProfanityState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as ProfanityState;

      // Reset if it's been more than timeout since last offense
      if (Date.now() - state.lastOffense > OFFENSE_TIMEOUT) {
        return {
          count: 0,
          lastOffense: 0,
          emotionalLevel: 'calm',
        };
      }

      return state;
    }
  } catch {
    // Ignore parse errors
  }

  return {
    count: 0,
    lastOffense: 0,
    emotionalLevel: 'calm',
  };
}

/**
 * Update profanity state after an offense
 */
export function updateProfanityState(): ProfanityState {
  const current = getProfanityState();

  const newState: ProfanityState = {
    count: current.count + 1,
    lastOffense: Date.now(),
    emotionalLevel: getEmotionalLevel(current.count + 1),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  return newState;
}

/**
 * Reset profanity state (e.g., after user apologizes)
 */
export function resetProfanityState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Determine emotional level based on offense count
 */
function getEmotionalLevel(count: number): ProfanityState['emotionalLevel'] {
  if (count <= 1) return 'calm';
  if (count <= 3) return 'annoyed';
  if (count <= 5) return 'frustrated';
  return 'angry';
}

/**
 * Check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  return PROFANITY_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Get appropriate response based on emotional state
 */
export function getProfanityResponse(state: ProfanityState): string {
  const responses = {
    calm: [
      "Please don't use language like that.",
      "I'd appreciate if you kept it clean.",
      "Let's keep our conversation respectful, shall we?",
      "I prefer polite conversation.",
      "Mind your language, please.",
    ],
    annoyed: [
      "I've asked you nicely - please stop cursing.",
      "That's the second time. I really don't appreciate that language.",
      "I'm starting to get annoyed with the profanity.",
      "Come on, we're better than this. No more swearing.",
      "I'm trying to help you, the least you could do is be polite.",
    ],
    frustrated: [
      "Seriously? I've asked you multiple times to stop swearing.",
      "If you continue cursing, I'm going to get angry.",
      "This is getting frustrating. Please, no more profanity.",
      "I've been very patient, but this needs to stop now.",
      "Last warning - keep it clean or I'll start ignoring you.",
    ],
    angry: [
      "That's it! I'm officially annoyed now!",
      "Okay, I'm genuinely upset. This is unacceptable.",
      "I've had enough! One more curse word and I'm done talking.",
      "You know what? I'm not helping until you apologize.",
      "I'm designed to be helpful, but I have limits!",
    ],
  };

  const emotionResponses = responses[state.emotionalLevel];
  return emotionResponses[Math.floor(Math.random() * emotionResponses.length)];
}

/**
 * Get apology acceptance response
 */
export function getApologyResponse(): string {
  const responses = [
    "Apology accepted. Let's start fresh!",
    "Thank you. I appreciate that. Now, how can I help?",
    "That's better. I forgive you. What can I do for you?",
    "Okay, we're good now. Let's move on.",
    "I accept your apology. Let's keep it civil going forward.",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
