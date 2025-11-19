import { create } from 'zustand';

// Auth flow states
export type AuthState =
  | 'greeting'
  | 'email'
  | 'password'
  | 'name'
  | 'confirmPassword'
  | 'processing'
  | 'success'
  | 'error';

// Auth flow events
export type AuthEvent =
  | { type: 'START_LOGIN' }
  | { type: 'START_REGISTER' }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SUBMIT' }
  | { type: 'VOICE_COMMAND'; command: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'SUCCESS'; userId: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

// Auth mode
export type AuthMode = 'login' | 'register';

// Form data
export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}

// Particle formation for each state
export type ParticleFormation = 'face' | 'field' | 'button' | 'scattered' | 'loading';

// Particle emotion for each state
export type ParticleEmotion = 'idle' | 'happy' | 'listening' | 'error' | 'success';

// Voice prompt for each state
export interface VoicePrompt {
  text: string;
  emotion: ParticleEmotion;
}

// State machine store
interface AuthStateMachineStore {
  // Current state
  currentState: AuthState;

  // Auth mode (login/register)
  mode: AuthMode;

  // Form data
  formData: AuthFormData;

  // Error message
  errorMessage: string | null;

  // Success data
  userId: string | null;

  // State history for back navigation
  stateHistory: AuthState[];

  // Actions
  dispatch: (event: AuthEvent) => void;
  setFormField: (field: keyof AuthFormData, value: string) => void;
  reset: () => void;

  // Computed properties
  getParticleFormation: () => ParticleFormation;
  getParticleEmotion: () => ParticleEmotion;
  getVoicePrompt: () => VoicePrompt;
  canGoBack: () => boolean;
  canSubmit: () => boolean;
}

// Voice prompts for each state
const VOICE_PROMPTS: Record<AuthState, Record<AuthMode, VoicePrompt>> = {
  greeting: {
    login: {
      text: "Welcome back! Ready to log in?",
      emotion: 'happy',
    },
    register: {
      text: "Hey there! Let's get you set up with a new account.",
      emotion: 'happy',
    },
  },
  email: {
    login: {
      text: "What's your email address?",
      emotion: 'listening',
    },
    register: {
      text: "First, what's your email?",
      emotion: 'listening',
    },
  },
  password: {
    login: {
      text: "And your password?",
      emotion: 'listening',
    },
    register: {
      text: "Choose a secure password. At least 8 characters, please.",
      emotion: 'listening',
    },
  },
  name: {
    login: {
      text: "",
      emotion: 'idle',
    },
    register: {
      text: "Great! Now, what should I call you?",
      emotion: 'listening',
    },
  },
  confirmPassword: {
    login: {
      text: "",
      emotion: 'idle',
    },
    register: {
      text: "One more time, just to make sure.",
      emotion: 'listening',
    },
  },
  processing: {
    login: {
      text: "Looking for your profile...",
      emotion: 'idle',
    },
    register: {
      text: "Creating your account...",
      emotion: 'idle',
    },
  },
  success: {
    login: {
      text: "Ah, there you are! Welcome back.",
      emotion: 'success',
    },
    register: {
      text: "All set! Welcome to ARIA!",
      emotion: 'success',
    },
  },
  error: {
    login: {
      text: "Hmm, something's not right. Let's try again.",
      emotion: 'error',
    },
    register: {
      text: "Oops, hit a snag. Let's give that another shot.",
      emotion: 'error',
    },
  },
};

// Particle formations for each state
const PARTICLE_FORMATIONS: Record<AuthState, ParticleFormation> = {
  greeting: 'face',
  email: 'field',
  password: 'field',
  name: 'field',
  confirmPassword: 'field',
  processing: 'loading',
  success: 'scattered',
  error: 'face',
};

// State transitions
const LOGIN_FLOW: AuthState[] = ['greeting', 'email', 'password', 'processing'];
const REGISTER_FLOW: AuthState[] = ['greeting', 'name', 'email', 'password', 'confirmPassword', 'processing'];

export const useAuthStateMachine = create<AuthStateMachineStore>((set, get) => ({
  currentState: 'greeting',
  mode: 'login',
  formData: {
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  },
  errorMessage: null,
  userId: null,
  stateHistory: [],

  dispatch: (event: AuthEvent) => {
    const state = get();
    const currentState = state.currentState;
    const mode = state.mode;
    const flow = mode === 'login' ? LOGIN_FLOW : REGISTER_FLOW;
    const currentIndex = flow.indexOf(currentState);

    switch (event.type) {
      case 'START_LOGIN':
        set({
          mode: 'login',
          currentState: 'greeting',
          stateHistory: [],
          formData: { email: '', password: '' },
          errorMessage: null,
          userId: null,
        });
        break;

      case 'START_REGISTER':
        set({
          mode: 'register',
          currentState: 'greeting',
          stateHistory: [],
          formData: { email: '', password: '', name: '', confirmPassword: '' },
          errorMessage: null,
          userId: null,
        });
        break;

      case 'NEXT':
        if (currentIndex < flow.length - 1) {
          const nextState = flow[currentIndex + 1];
          set({
            currentState: nextState,
            stateHistory: [...state.stateHistory, currentState],
            errorMessage: null,
          });
        }
        break;

      case 'BACK':
        if (state.stateHistory.length > 0) {
          const previousState = state.stateHistory[state.stateHistory.length - 1];
          const newHistory = state.stateHistory.slice(0, -1);
          set({
            currentState: previousState,
            stateHistory: newHistory,
            errorMessage: null,
          });
        }
        break;

      case 'SUBMIT':
        set({
          currentState: 'processing',
          stateHistory: [...state.stateHistory, currentState],
        });
        break;

      case 'VALIDATION_ERROR':
        set({
          currentState: 'error',
          errorMessage: event.message,
          stateHistory: [...state.stateHistory, currentState],
        });
        break;

      case 'SUCCESS':
        set({
          currentState: 'success',
          userId: event.userId,
          errorMessage: null,
          stateHistory: [...state.stateHistory, currentState],
        });
        break;

      case 'ERROR':
        set({
          currentState: 'error',
          errorMessage: event.message,
          stateHistory: [...state.stateHistory, currentState],
        });
        break;

      case 'VOICE_COMMAND':
        handleVoiceCommand(event.command);
        break;

      case 'RESET':
        get().reset();
        break;
    }
  },

  setFormField: (field, value) => {
    set((state) => ({
      formData: {
        ...state.formData,
        [field]: value,
      },
    }));
  },

  reset: () => {
    set({
      currentState: 'greeting',
      mode: 'login',
      formData: { email: '', password: '', name: '', confirmPassword: '' },
      errorMessage: null,
      userId: null,
      stateHistory: [],
    });
  },

  getParticleFormation: () => {
    return PARTICLE_FORMATIONS[get().currentState];
  },

  getParticleEmotion: () => {
    const state = get();
    return VOICE_PROMPTS[state.currentState][state.mode].emotion;
  },

  getVoicePrompt: () => {
    const state = get();
    return VOICE_PROMPTS[state.currentState][state.mode];
  },

  canGoBack: () => {
    return get().stateHistory.length > 0;
  },

  canSubmit: () => {
    const state = get();
    const { formData, mode } = state;

    if (mode === 'login') {
      return !!formData.email && !!formData.password;
    } else {
      return (
        !!formData.name &&
        !!formData.email &&
        !!formData.password &&
        !!formData.confirmPassword &&
        formData.password === formData.confirmPassword
      );
    }
  },
}));

// Voice command handler
function handleVoiceCommand(command: string) {
  const normalizedCommand = command.toLowerCase().trim();
  const state = useAuthStateMachine.getState();

  switch (normalizedCommand) {
    case 'next':
    case 'continue':
      state.dispatch({ type: 'NEXT' });
      break;

    case 'back':
    case 'previous':
      state.dispatch({ type: 'BACK' });
      break;

    case 'login':
      state.dispatch({ type: 'START_LOGIN' });
      break;

    case 'register':
    case 'sign up':
    case 'create account':
      state.dispatch({ type: 'START_REGISTER' });
      break;

    case 'submit':
    case 'done':
    case 'finish':
      if (state.canSubmit()) {
        state.dispatch({ type: 'SUBMIT' });
      }
      break;

    case 'clear':
    case 'reset':
      state.reset();
      break;

    default:
      // Unknown command - could provide feedback
      console.log('Unknown voice command:', command);
  }
}
