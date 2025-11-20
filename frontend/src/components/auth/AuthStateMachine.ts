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
  | 'error'
  | 'personal_details'
  | 'name_pronunciation'
  | 'account_details';

// Auth flow events
export type AuthEvent =
  | { type: 'START_LOGIN' }
  | { type: 'START_REGISTER' }
  | { type: 'START_FORGOT_PASSWORD' }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SUBMIT' }
  | { type: 'VOICE_COMMAND'; command: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'SUCCESS'; userId: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

// Auth mode
export type AuthMode = 'login' | 'register' | 'forgot-password';

// Form data
export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
  phoneticName?: string;
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

  // Field with error (for targeted error display)
  fieldError: string | null;

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
    'forgot-password': {
      text: "No worries! Let's get your password reset.",
      emotion: 'happy',
    },
  },
  email: {
    login: {
      text: "What's your email address, or what would you like to do?",
      emotion: 'listening',
    },
    register: {
      text: "First, what's your email?",
      emotion: 'listening',
    },
    'forgot-password': {
      text: "What's the email address for your account?",
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
    'forgot-password': {
      text: "",
      emotion: 'idle',
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
    'forgot-password': {
      text: "",
      emotion: 'idle',
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
    'forgot-password': {
      text: "",
      emotion: 'idle',
    },
  },
  processing: {
    login: {
      text: "Checking your credentials.",
      emotion: 'idle',
    },
    register: {
      text: "Creating your account.",
      emotion: 'idle',
    },
    'forgot-password': {
      text: "Sending reset instructions...",
      emotion: 'idle',
    },
  },
  success: {
    login: {
      text: "Welcome back. I'm logging you in.",
      emotion: 'success',
    },
    register: {
      text: "Thank you for registering. I'm logging you in now.",
      emotion: 'success',
    },
    'forgot-password': {
      text: "Check your email! I've sent you a link to reset your password.",
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
    'forgot-password': {
      text: "I couldn't find that email. Want to try again?",
      emotion: 'error',
    },
  },
  personal_details: {
    login: { text: "", emotion: 'idle' },
    register: { text: "Let's start with your name.", emotion: 'listening' },
    'forgot-password': { text: "", emotion: 'idle' }
  },
  name_pronunciation: {
    login: { text: "", emotion: 'idle' },
    register: { text: "Great! Now, how do you pronounce that?", emotion: 'listening' },
    'forgot-password': { text: "", emotion: 'idle' }
  },
  account_details: {
    login: { text: "", emotion: 'idle' },
    register: { text: "Now, let's set up your email and password.", emotion: 'listening' },
    'forgot-password': { text: "", emotion: 'idle' }
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
  personal_details: 'field',
  name_pronunciation: 'field',
  account_details: 'field',
};

// State transitions
const LOGIN_FLOW: AuthState[] = ['email', 'password', 'processing'];
const REGISTER_FLOW: AuthState[] = ['personal_details', 'name_pronunciation', 'account_details', 'processing'];
const FORGOT_PASSWORD_FLOW: AuthState[] = ['email', 'processing'];

export const useAuthStateMachine = create<AuthStateMachineStore>((set, get) => ({
  currentState: 'email',
  mode: 'login',
  formData: {
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    phoneticName: '',
  },
  errorMessage: null,
  fieldError: null,
  userId: null,
  stateHistory: [],

  dispatch: (event: AuthEvent) => {
    const state = get();
    const currentState = state.currentState;
    const mode = state.mode;
    let flow = LOGIN_FLOW;
    if (mode === 'register') flow = REGISTER_FLOW;
    if (mode === 'forgot-password') flow = FORGOT_PASSWORD_FLOW;

    const currentIndex = flow.indexOf(currentState);

    switch (event.type) {
      case 'START_LOGIN':
        set({
          mode: 'login',
          currentState: 'email',
          stateHistory: [],
          formData: { email: '', password: '' },
          errorMessage: null,
          fieldError: null,
          userId: null,
        });
        break;

      case 'START_REGISTER':
        set({
          mode: 'register',
          currentState: 'personal_details',
          stateHistory: [],
          formData: { email: '', password: '', name: '', confirmPassword: '', phoneticName: '' },
          errorMessage: null,
          fieldError: null,
          userId: null,
        });
        break;

      case 'START_FORGOT_PASSWORD':
        set({
          mode: 'forgot-password',
          currentState: 'email',
          stateHistory: [],
          formData: { email: '', password: '', name: '', confirmPassword: '' },
          errorMessage: null,
          fieldError: null,
          userId: null,
        });
        break;      case 'NEXT':
        if (currentIndex < flow.length - 1) {
          const nextState = flow[currentIndex + 1];
          set({
            currentState: nextState,
            stateHistory: [...state.stateHistory, currentState],
            errorMessage: null,
            fieldError: null,
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
            fieldError: null,
          });
        }
        break;

      case 'SUBMIT':
        console.log('[AuthStateMachine] SUBMIT action, transitioning to processing');
        set({
          currentState: 'processing',
          stateHistory: [...state.stateHistory, currentState],
        });
        break;

      case 'VALIDATION_ERROR':
        // Determine which field has the error based on message
        let fieldWithError = null;
        const msg = event.message.toLowerCase();
        if (msg.includes('email')) fieldWithError = 'email';
        else if (msg.includes('password')) fieldWithError = 'password';
        else if (msg.includes('name')) fieldWithError = 'name';

        set({
          // Keep current state to show error on the form
          errorMessage: event.message,
          fieldError: fieldWithError,
          // currentState: 'error',
          // stateHistory: [...state.stateHistory, currentState],
        });
        break;

      case 'SUCCESS':
        set({
          currentState: 'success',
          userId: event.userId,
          errorMessage: null,
          fieldError: null,
          stateHistory: [...state.stateHistory, currentState],
        });
        break;

      case 'ERROR':
        // Determine which field has the error based on message
        let errorField = null;
        const errorMsg = event.message.toLowerCase();
        if (errorMsg.includes('email')) errorField = 'email';
        else if (errorMsg.includes('password')) errorField = 'password';
        else if (errorMsg.includes('name')) errorField = 'name';

        // If we are in processing state, we need to go back to the previous state (the form)
        // so the user can correct the error.
        if (state.currentState === 'processing' && state.stateHistory.length > 0) {
          const previousState = state.stateHistory[state.stateHistory.length - 1];
          const newHistory = state.stateHistory.slice(0, -1);
          set({
            currentState: previousState,
            stateHistory: newHistory,
            errorMessage: event.message,
            fieldError: errorField,
          });
        } else {
          // If not processing (or no history), just set the error message on current state
          set({
            errorMessage: event.message,
            fieldError: errorField,
          });
        }
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
    console.log('[AuthStateMachine] setFormField called:', { field, value });
    set((state) => ({
      formData: {
        ...state.formData,
        [field]: value,
      },
      errorMessage: null,
      fieldError: null,
    }));
  },

  reset: () => {
    set({
      currentState: 'email',
      mode: 'login',
      formData: { email: '', password: '', name: '', confirmPassword: '', phoneticName: '' },
      errorMessage: null,
      fieldError: null,
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
    } else if (mode === 'register') {
      return (
        !!formData.name &&
        !!formData.email &&
        !!formData.password &&
        !!formData.confirmPassword &&
        formData.password === formData.confirmPassword
      );
    } else {
      // forgot-password
      return !!formData.email;
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
    case 'log in':
      // If we're already in login mode and can submit, treat this as a submit command
      if (state.mode === 'login' && state.canSubmit()) {
        state.dispatch({ type: 'SUBMIT' });
      } else {
        state.dispatch({ type: 'START_LOGIN' });
      }
      break;

    case 'register':
    case 'sign up':
    case 'create account':
      // If we're already in register mode and can submit, treat this as a submit command
      if (state.mode === 'register' && state.canSubmit()) {
        state.dispatch({ type: 'SUBMIT' });
      } else {
        state.dispatch({ type: 'START_REGISTER' });
      }
      break;

    case 'forgot password':
    case 'reset password':
      state.dispatch({ type: 'START_FORGOT_PASSWORD' });
      break;

    case 'submit':
    case 'done':
    case 'finish':
    case 'send':
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
