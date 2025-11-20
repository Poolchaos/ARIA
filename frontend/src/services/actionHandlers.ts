/**
 * Action Handlers - Execute actions based on intent analysis
 * Each handler is responsible for a specific action category
 */

import type { IntentAnalysis } from './intentService';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  navigationTarget?: string;
  modalType?: string;
  error?: string;
}

/**
 * Base Action Handler interface
 */
export interface ActionHandler {
  canHandle(intent: IntentAnalysis): boolean;
  execute(intent: IntentAnalysis, context?: Record<string, unknown>): Promise<ActionResult>;
}

/**
 * Weather Action Handler
 */
export class WeatherHandler implements ActionHandler {
  canHandle(intent: IntentAnalysis): boolean {
    return intent.actionCategory === 'weather';
  }

  async execute(intent: IntentAnalysis): Promise<ActionResult> {
    const location = intent.entities.location || 'your location';

    // TODO: Integrate with actual weather API (OpenWeatherMap, WeatherAPI, etc.)
    console.log('[WeatherHandler] Fetching weather for:', location);

    // Mock weather data for now
    const mockWeather = {
      location,
      temperature: 22,
      condition: 'Partly Cloudy',
      forecast: 'Clear skies expected this afternoon',
    };

    return {
      success: true,
      message: `The weather in ${location} is ${mockWeather.temperature}°C and ${mockWeather.condition}. ${mockWeather.forecast}`,
      data: mockWeather,
      modalType: 'weather',
    };
  }
}

/**
 * Calendar Action Handler
 */
export class CalendarHandler implements ActionHandler {
  canHandle(intent: IntentAnalysis): boolean {
    return intent.actionCategory === 'calendar';
  }

  async execute(intent: IntentAnalysis): Promise<ActionResult> {
    const { date, time, description } = intent.entities;

    // TODO: Integrate with actual calendar API or database
    console.log('[CalendarHandler] Creating appointment:', { date, time, description });

    // Mock calendar entry
    const appointment = {
      id: Date.now().toString(),
      date,
      time,
      description: description || 'Appointment',
      created: new Date().toISOString(),
    };

    return {
      success: true,
      message: `I've added "${description || 'your appointment'}" to your calendar for ${date} at ${time}`,
      data: appointment,
      navigationTarget: '/calendar',
    };
  }
}

/**
 * Grocery Action Handler
 */
export class GroceryHandler implements ActionHandler {
  canHandle(intent: IntentAnalysis): boolean {
    return intent.actionCategory === 'grocery';
  }

  async execute(intent: IntentAnalysis): Promise<ActionResult> {
    const action = intent.actionPayload?.action;
    const items = intent.entities.items || [];

    if (action === 'view') {
      // TODO: Fetch from database
      const mockList = [
        { id: '1', name: 'Milk', quantity: 2, checked: false },
        { id: '2', name: 'Bread', quantity: 1, checked: false },
        { id: '3', name: 'Eggs', quantity: 12, checked: true },
      ];

      return {
        success: true,
        message: 'Here\'s your grocery list',
        data: mockList,
        navigationTarget: '/grocery',
      };
    } else if (action === 'add' && items.length > 0) {
      // TODO: Add to database
      console.log('[GroceryHandler] Adding items:', items);

      return {
        success: true,
        message: `I've added ${items.join(', ')} to your grocery list`,
        data: { items },
      };
    }

    return {
      success: false,
      message: 'I\'m not sure what to do with your grocery list',
      error: 'Unknown grocery action',
    };
  }
}

/**
 * Navigation/Maps Action Handler
 */
export class NavigationHandler implements ActionHandler {
  canHandle(intent: IntentAnalysis): boolean {
    return intent.actionCategory === 'navigation_maps';
  }

  async execute(intent: IntentAnalysis): Promise<ActionResult> {
    const destination = intent.entities.location;
    const from = intent.actionPayload?.from || 'Current Location';

    // TODO: Integrate with Google Maps API or similar
    console.log('[NavigationHandler] Getting directions:', { from, destination });

    // Mock directions
    const mockDirections = {
      from,
      to: destination,
      distance: '12.5 km',
      duration: '18 minutes',
      route: 'Via N1 Highway',
    };

    return {
      success: true,
      message: `The route to ${destination} is ${mockDirections.distance} and will take about ${mockDirections.duration} ${mockDirections.route}`,
      data: mockDirections,
      modalType: 'navigation',
    };
  }
}

/**
 * Budget Action Handler
 */
export class BudgetHandler implements ActionHandler {
  canHandle(intent: IntentAnalysis): boolean {
    return intent.actionCategory === 'budget';
  }

  async execute(): Promise<ActionResult> {
    // TODO: Fetch from database
    console.log('[BudgetHandler] Fetching budget data');

    const mockBudget = {
      totalSpent: 3542.50,
      budget: 5000,
      categories: {
        groceries: 850,
        utilities: 1200,
        entertainment: 450,
        transport: 380,
      },
    };

    return {
      success: true,
      message: `You've spent R${mockBudget.totalSpent} out of your R${mockBudget.budget} budget this month`,
      data: mockBudget,
      navigationTarget: '/budget',
    };
  }
}

/**
 * Settings Action Handler
 */
export class SettingsHandler implements ActionHandler {
  canHandle(intent: IntentAnalysis): boolean {
    return intent.actionCategory === 'settings';
  }

  async execute(): Promise<ActionResult> {
    return {
      success: true,
      message: 'Opening your settings',
      navigationTarget: '/settings',
      modalType: 'settings',
    };
  }
}

/**
 * General/Conversation Handler
 */
export class GeneralHandler implements ActionHandler {
  canHandle(intent: IntentAnalysis): boolean {
    return intent.actionCategory === 'general' || intent.actionCategory === 'none';
  }

  async execute(intent: IntentAnalysis): Promise<ActionResult> {
    return {
      success: true,
      message: intent.suggestedResponse || 'How can I help you?',
    };
  }
}

/**
 * Action Router - Routes intents to appropriate handlers
 */
export class ActionRouter {
  private handlers: ActionHandler[] = [];

  constructor() {
    // Register all handlers
    this.handlers = [
      new WeatherHandler(),
      new CalendarHandler(),
      new GroceryHandler(),
      new NavigationHandler(),
      new BudgetHandler(),
      new SettingsHandler(),
      new GeneralHandler(), // Fallback handler
    ];
  }

  /**
   * Route intent to appropriate handler and execute
   */
  async route(intent: IntentAnalysis, context?: Record<string, unknown>): Promise<ActionResult> {
    console.log('[ActionRouter] Routing intent:', intent);

    // If clarification is needed, return immediately
    if (intent.intentType === 'clarification' || intent.clarificationNeeded) {
      return {
        success: true,
        message: intent.suggestedResponse || intent.clarificationNeeded || 'Could you clarify that?',
      };
    }

    // Find appropriate handler
    const handler = this.handlers.find(h => h.canHandle(intent));

    if (!handler) {
      console.warn('[ActionRouter] No handler found for intent:', intent);
      return {
        success: false,
        message: 'I\'m not sure how to help with that yet',
        error: 'No handler available',
      };
    }

    try {
      const result = await handler.execute(intent, context);
      console.log('[ActionRouter] Action result:', result);
      return result;
    } catch (error) {
      console.error('[ActionRouter] Handler error:', error);
      return {
        success: false,
        message: 'Sorry, something went wrong while processing that',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add custom handler
   */
  addHandler(handler: ActionHandler) {
    // Add before the GeneralHandler (which is the fallback)
    this.handlers.splice(this.handlers.length - 1, 0, handler);
  }
}

// Singleton instance
let actionRouterInstance: ActionRouter | null = null;

export function getActionRouter(): ActionRouter {
  if (!actionRouterInstance) {
    actionRouterInstance = new ActionRouter();
  }
  return actionRouterInstance;
}
