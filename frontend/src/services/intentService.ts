/**
 * Intent Service - LLM-powered intent classification and action routing
 * Analyzes user speech to determine intent, extract entities, and route to appropriate handlers
 */

export type IntentType =
  | 'question'           // User asking for information
  | 'command'            // User requesting an action
  | 'navigation'         // User wants to navigate to a page/section
  | 'clarification'      // Need more information from user
  | 'conversation';      // Casual conversation/greeting

export type ActionCategory =
  | 'calendar'
  | 'weather'
  | 'navigation_maps'
  | 'grocery'
  | 'budget'
  | 'inventory'
  | 'settings'
  | 'general'
  | 'none';

export interface IntentAnalysis {
  intentType: IntentType;
  actionCategory: ActionCategory;
  confidence: 'high' | 'medium' | 'low';
  entities: {
    date?: string;
    time?: string;
    location?: string;
    items?: string[];
    amount?: number;
    person?: string;
    [key: string]: unknown;
  };
  clarificationNeeded?: string;
  suggestedResponse?: string;
  requiresAction: boolean;
  actionPayload?: Record<string, unknown>;
}

interface IntentServiceConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

class IntentService {
  private config: IntentServiceConfig;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor(config: IntentServiceConfig = {}) {
    this.config = {
      model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || config.apiKey,
      ...config,
    };
  }

  /**
   * Analyze user speech to determine intent and extract entities
   */
  async analyzeIntent(userSpeech: string, context?: Record<string, unknown>): Promise<IntentAnalysis> {
    console.log('[IntentService] Analyzing intent for:', userSpeech);

    // Add user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userSpeech,
    });

    // Keep only last 5 exchanges (10 messages) for context
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    const systemPrompt = `You are ARIA's intent classifier. Analyze user speech and classify the intent.

Your job is to:
1. Determine the intent type (question, command, navigation, clarification, conversation)
2. Identify the action category (calendar, weather, navigation_maps, grocery, budget, inventory, settings, general, none)
3. Extract entities (dates, times, locations, items, amounts, people)
4. Determine if clarification is needed
5. Assess confidence level (high, medium, low)

Respond ONLY with valid JSON in this exact format:
{
  "intentType": "question|command|navigation|clarification|conversation",
  "actionCategory": "calendar|weather|navigation_maps|grocery|budget|inventory|settings|general|none",
  "confidence": "high|medium|low",
  "entities": {
    "date": "ISO date or relative like 'tomorrow', 'friday'",
    "time": "time string like '12:00', '2pm'",
    "location": "location name",
    "items": ["item1", "item2"],
    "amount": 123.45,
    "person": "person name"
  },
  "clarificationNeeded": "question to ask user if unclear, null if not needed",
  "suggestedResponse": "natural language response to user",
  "requiresAction": true/false,
  "actionPayload": { /* action-specific data */ }
}

Examples:
- "What's the weather in Cape Town" → question, weather category, extract location: Cape Town
- "Book an appointment tomorrow at 12:00 for nails" → command, calendar category, extract date, time, description
- "Show me my grocery list for Friday" → navigation, grocery category, extract date
- "How do I get to Tygervalley from here" → question, navigation_maps category, extract destination
- "Add milk to my grocery list" → command, grocery category, extract item
- "How much did I spend this month" → question, budget category
- "Hey how are you" → conversation, general category

Current context: ${JSON.stringify(context || {})}`;

    try {
      // Use LLM if API key is configured
      if (this.config.apiKey && this.config.apiKey !== 'your-api-key-here') {
        console.log('[IntentService] Using LLM API for intent classification');

        const response = await fetch(this.config.endpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...this.conversationHistory,
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn('[IntentService] LLM API error, falling back to pattern matching:', errorData);
          return this.fallbackClassifier(userSpeech);
        }

        const data = await response.json();
        const analysisText = data.choices[0].message.content;

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, analysisText];
        const analysis = JSON.parse(jsonMatch[1].trim());

        console.log('[IntentService] LLM Intent analysis:', analysis);
        return analysis;
      } else {
        console.log('[IntentService] No API key configured, using pattern-based fallback');
        return this.fallbackClassifier(userSpeech);
      }
    } catch (error) {
      console.error('[IntentService] Analysis error:', error);
      // Fallback to basic pattern matching
      return this.fallbackClassifier(userSpeech);
    }
  }

  /**
   * Fallback pattern-based classifier (for when LLM is unavailable)
   */
  private async fallbackClassifier(speech: string): Promise<IntentAnalysis> {
    const lower = speech.toLowerCase().trim();

    // Weather patterns
    if (lower.match(/weather|temperature|forecast|rain|sunny/)) {
      const locationMatch = lower.match(/in\s+([a-z\s]+?)(?:\s+today|\s+tomorrow|$)/i);
      const location = locationMatch ? locationMatch[1].trim() : 'your location';

      return {
        intentType: 'question',
        actionCategory: 'weather',
        confidence: 'high',
        entities: { location },
        requiresAction: true,
        suggestedResponse: `Let me check the weather for ${location}`,
        actionPayload: { location },
      };
    }

    // Calendar/Appointment patterns
    if (lower.match(/book|schedule|appointment|calendar|meeting|remind/)) {
      const dateMatch = lower.match(/tomorrow|today|friday|saturday|sunday|monday|tuesday|wednesday|thursday|on\s+\w+/i);
      const timeMatch = lower.match(/at\s+(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))/i);

      const date = dateMatch ? dateMatch[0] : undefined;
      const time = timeMatch ? timeMatch[1] : undefined;

      if (!date || !time) {
        return {
          intentType: 'clarification',
          actionCategory: 'calendar',
          confidence: 'medium',
          entities: { date, time },
          requiresAction: false,
          clarificationNeeded: !date ? 'What day would you like to schedule this?' : 'What time works for you?',
          suggestedResponse: !date ? 'What day would you like to schedule this?' : 'What time works for you?',
        };
      }

      return {
        intentType: 'command',
        actionCategory: 'calendar',
        confidence: 'high',
        entities: { date, time, description: speech },
        requiresAction: true,
        suggestedResponse: `I'll add that to your calendar for ${date} at ${time}`,
        actionPayload: { date, time, description: speech },
      };
    }

    // Grocery list patterns
    if (lower.match(/grocery|shopping|list|buy|purchase/)) {
      if (lower.match(/show|view|see|display|check/)) {
        return {
          intentType: 'navigation',
          actionCategory: 'grocery',
          confidence: 'high',
          entities: {},
          requiresAction: true,
          suggestedResponse: 'Here\'s your grocery list',
          actionPayload: { action: 'view' },
        };
      } else if (lower.match(/add|put|include/)) {
        const itemMatch = lower.match(/(?:add|put|include)\s+(.+?)(?:\s+to|$)/i);
        const item = itemMatch ? itemMatch[1].trim() : undefined;

        if (!item) {
          return {
            intentType: 'clarification',
            actionCategory: 'grocery',
            confidence: 'low',
            entities: {},
            requiresAction: false,
            clarificationNeeded: 'What would you like to add to your grocery list?',
            suggestedResponse: 'What would you like to add to your grocery list?',
          };
        }

        return {
          intentType: 'command',
          actionCategory: 'grocery',
          confidence: 'high',
          entities: { items: [item] },
          requiresAction: true,
          suggestedResponse: `I've added ${item} to your grocery list`,
          actionPayload: { action: 'add', items: [item] },
        };
      }
    }

    // Navigation/Directions patterns
    if (lower.match(/how (?:do i|can i) get to|directions to|navigate to|route to|take me to/)) {
      const destinationMatch = lower.match(/(?:to|from here to)\s+(.+?)(?:\s+from|$)/i);
      const destination = destinationMatch ? destinationMatch[1].trim() : undefined;

      if (!destination) {
        return {
          intentType: 'clarification',
          actionCategory: 'navigation_maps',
          confidence: 'low',
          entities: {},
          requiresAction: false,
          clarificationNeeded: 'Where would you like to go?',
          suggestedResponse: 'Where would you like to go?',
        };
      }

      return {
        intentType: 'question',
        actionCategory: 'navigation_maps',
        confidence: 'high',
        entities: { location: destination },
        requiresAction: true,
        suggestedResponse: `Let me get directions to ${destination} for you`,
        actionPayload: { destination, from: 'current location' },
      };
    }

    // Budget patterns
    if (lower.match(/spend|spent|budget|money|expense|cost/)) {
      return {
        intentType: 'question',
        actionCategory: 'budget',
        confidence: 'high',
        entities: {},
        requiresAction: true,
        suggestedResponse: 'Let me check your spending',
        actionPayload: { action: 'view_spending' },
      };
    }

    // Settings patterns
    if (lower.match(/settings|preferences|change my|update my/)) {
      return {
        intentType: 'navigation',
        actionCategory: 'settings',
        confidence: 'high',
        entities: {},
        requiresAction: true,
        suggestedResponse: 'Opening your settings',
        actionPayload: { action: 'open_settings' },
      };
    }

    // Greetings and conversation
    if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening|how are you)/)) {
      return {
        intentType: 'conversation',
        actionCategory: 'general',
        confidence: 'high',
        entities: {},
        requiresAction: false,
        suggestedResponse: 'Hello! How can I help you today?',
      };
    }

    // Default: treat as general question
    return {
      intentType: 'question',
      actionCategory: 'general',
      confidence: 'low',
      entities: {},
      requiresAction: false,
      suggestedResponse: 'I\'m not sure I understood that. Could you rephrase?',
      clarificationNeeded: 'Could you rephrase that? I didn\'t quite understand.',
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.conversationHistory];
  }
}

// Singleton instance
let intentServiceInstance: IntentService | null = null;

export function getIntentService(config?: IntentServiceConfig): IntentService {
  if (!intentServiceInstance) {
    intentServiceInstance = new IntentService(config);
  }
  return intentServiceInstance;
}

export default IntentService;
