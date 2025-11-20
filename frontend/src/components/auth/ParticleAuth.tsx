import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ParticleWave } from './ParticleWave';
import { ParticleInput } from './ParticleInput';
import { VoicePrompt } from './VoicePrompt';
import { VoicePermissionModal } from './VoicePermissionModal';
import { VoiceNameInput } from './VoiceNameInput';
import { useAuthStateMachine } from './AuthStateMachine';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { authApi } from '../../lib/api';

interface ParticleAuthProps {
  mode: 'login' | 'register' | 'forgot-password';
}

export function ParticleAuth({ mode }: ParticleAuthProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showVoicePermissionModal, setShowVoicePermissionModal] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [hasUserInteractedWithVoice, setHasUserInteractedWithVoice] = useState(() => {
    // Check sessionStorage to see if user has interacted with voice in this session
    return sessionStorage.getItem('aria_voice_session_active') === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [replayVoice, setReplayVoice] = useState(0); // Trigger to replay voice prompt
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);

  const {
    currentState,
    dispatch,
    formData,
    setFormField,
    getParticleEmotion,
    getVoicePrompt,
    canGoBack,
    canSubmit,
    errorMessage,
    fieldError,
  } = useAuthStateMachine();

  // Initialize mode
  useEffect(() => {
    if (mode === 'login') {
      dispatch({ type: 'START_LOGIN' });
    } else if (mode === 'register') {
      dispatch({ type: 'START_REGISTER' });
    } else {
      dispatch({ type: 'START_FORGOT_PASSWORD' });
    }

    // Check voice preference from localStorage
    const hasSeenVoiceModal = localStorage.getItem('aria_voice_modal_seen');
    const voicePreference = localStorage.getItem('aria_voice_enabled');

    if (!hasSeenVoiceModal && 'speechSynthesis' in window) {
      // First time user - show permission modal
      const timer = setTimeout(() => {
        setShowVoicePermissionModal(true);
      }, 500);
      return () => clearTimeout(timer);
    } else if (hasSeenVoiceModal && voicePreference === 'true') {
      // User has previously enabled voice - enable it for TTS playback
      // But don't start voice command recognition until user interacts this session
      setVoiceEnabled(true);
    }
  }, [mode, dispatch]);

  // Handle form submission
  const handleSubmit = () => {
    if (!canSubmit()) return;
    dispatch({ type: 'SUBMIT' });
  };

  // Handle API calls when state becomes processing
  useEffect(() => {
    console.log('[ParticleAuth] currentState changed:', currentState);
    if (currentState !== 'processing') return;

    console.log('[ParticleAuth] Processing submission, mode:', mode);
    const performSubmission = async () => {
      try {
        if (mode === 'login') {
          const response = await authApi.login({
            email: formData.email,
            password: formData.password,
          });
          const { user, accessToken, refreshToken } = response.data.data;
          setAuth(user, accessToken, refreshToken);
          dispatch({ type: 'SUCCESS', userId: user.id });
        } else if (mode === 'register') {
          if (!formData.name || formData.password !== formData.confirmPassword) {
            dispatch({
              type: 'VALIDATION_ERROR',
              message: formData.password !== formData.confirmPassword
                ? "Hmm, those passwords don't match. Let's try again."
                : "I need all the details to create your account.",
            });
            return;
          }

          console.log('[ParticleAuth] Registering with formData:', formData);
          const response = await authApi.register({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            phoneticName: formData.phoneticName,
          });
          const { user, accessToken, refreshToken } = response.data.data;
          setAuth(user, accessToken, refreshToken);
          dispatch({ type: 'SUCCESS', userId: user.id });
        } else {
          // Forgot password
          await authApi.forgotPassword(formData.email);
          dispatch({ type: 'SUCCESS', userId: 'reset' });
        }

        // Success celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#60A5FA', '#34D399', '#A78BFA'],
        });

        // Navigate to home after success (wait for audio to complete)
        // Audio duration is ~3.24s, wait 4s to ensure completion + confetti
        setTimeout(() => {
          if (mode === 'forgot-password') {
            navigate('/login');
          } else {
            navigate('/');
          }
        }, 4000);
      } catch (error: unknown) {
        console.log('[ParticleAuth] Submission error:', error);
        let errorMessage = 'Something went wrong. Let\'s give that another try.';

        if (error && typeof error === 'object' && 'response' in error) {
          const responseData = (error as { response?: { data?: { error?: string, details?: Array<{ message: string }> } } }).response?.data;

          if (responseData?.details && responseData.details.length > 0) {
            errorMessage = responseData.details[0].message;
          } else if (responseData?.error) {
            errorMessage = responseData.error;
          }
        }

        console.log('[ParticleAuth] Dispatching ERROR with message:', errorMessage);
        dispatch({
          type: 'ERROR',
          message: errorMessage,
        });
      }
    };

    performSubmission();
  }, [currentState, mode, formData, dispatch, navigate, setAuth]);

  // Handle enter key
  const handleEnter = () => {
    if (canSubmit() && (currentState === 'password' || currentState === 'account_details')) {
      handleSubmit();
    } else if (isStepValid()) {
      dispatch({ type: 'NEXT' });
    }
  };

  // Handle escape key
  const handleEscape = () => {
    if (canGoBack()) {
      dispatch({ type: 'BACK' });
    }
  };

  // Get current field value
  const isStepValid = (): boolean => {
    switch (currentState) {
      case 'email':
        return !!formData.email;
      case 'password':
        return !!formData.password;
      case 'personal_details':
        return !!formData.name;
      case 'account_details':
        return !!formData.email && !!formData.password && !!formData.confirmPassword;
      default:
        return false;
    }
  };

  // Render input field based on current state
  const renderInput = () => {
    switch (currentState) {
      case 'email':
        return (
          <ParticleInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormField('email', value)}
            placeholder="your@email.com"
            autoFocus
            onEnter={handleEnter}
            onEscape={handleEscape}
            error={(fieldError === 'email' || fieldError === null) ? errorMessage || undefined : undefined}
            autoComplete="email"
          />
        );

      case 'password':
        return (
          <ParticleInput
            label="Password"
            type="password"
            value={formData.password}
            onChange={(value) => setFormField('password', value)}
            placeholder="At least 8 characters"
            autoFocus
            onEnter={handleEnter}
            onEscape={handleEscape}
            error={(fieldError === 'password' || fieldError === null) ? errorMessage || undefined : undefined}
            autoComplete="current-password"
          />
        );

      case 'personal_details':
        return (
          <ParticleInput
            label="Name"
            type="text"
            value={formData.name || ''}
            onChange={(value) => setFormField('name', value)}
            placeholder="What should I call you?"
            autoFocus
            onEnter={handleEnter}
            onEscape={handleEscape}
            error={(fieldError === 'name' || fieldError === null) ? errorMessage || undefined : undefined}
            autoComplete="name"
          />
        );

      case 'name_pronunciation':
        return (
          <VoiceNameInput
            name={formData.name || ''}
            isAssistantSpeaking={isSpeaking}
            onPhoneticNameCaptured={(phoneticName) => {
              setFormField('phoneticName', phoneticName);
              dispatch({ type: 'NEXT' });
            }}
            onSkip={() => dispatch({ type: 'NEXT' })}
          />
        );

      case 'account_details':
        return (
          <div className="flex flex-col gap-4 w-full max-w-md">
            <ParticleInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(value) => setFormField('email', value)}
              placeholder="your@email.com"
              autoFocus
              error={(fieldError === 'email' || fieldError === null) ? errorMessage || undefined : undefined}
              autoComplete="email"
            />
            <ParticleInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={(value) => setFormField('password', value)}
              placeholder="At least 8 characters"
              error={(fieldError === 'password' || fieldError === null) ? errorMessage || undefined : undefined}
              autoComplete="new-password"
            />
            <ParticleInput
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword || ''}
              onChange={(value) => setFormField('confirmPassword', value)}
              placeholder="One more time"
              onEnter={handleEnter}
              error={(fieldError === 'password' || fieldError === null) ? errorMessage || undefined : undefined}
              autoComplete="new-password"
            />
          </div>
        );

      case 'processing':
        return null;

      case 'success':
        return null;

      case 'error':
        return (
          <div className="text-center animate-fade-in max-w-md mx-auto px-4">
            <div className="text-red-400 text-lg mb-6 font-medium">
              {errorMessage || "Something went wrong."}
            </div>
            <button
              onClick={() => dispatch({ type: 'BACK' })}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors border border-white/20 backdrop-blur-sm"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const voicePrompt = getVoicePrompt();

  const handleEnableVoice = () => {
    console.log('[ParticleAuth] Enable voice clicked');
    // Enable voice immediately
    setVoiceEnabled(true);
    setHasUserInteractedWithVoice(true);
    sessionStorage.setItem('aria_voice_session_active', 'true');
    setShowVoicePermissionModal(false);
    localStorage.setItem('aria_voice_modal_seen', 'true');
    localStorage.setItem('aria_voice_enabled', 'true');

    // Trigger replay with a longer delay to ensure state has propagated
    setTimeout(() => {
      console.log('[ParticleAuth] Triggering voice replay, current state:', currentState, 'new count:', replayVoice + 1);
      setReplayVoice(prev => prev + 1);
    }, 500);
  };  const handleSkipVoice = () => {
    setVoiceEnabled(false);
    setHasUserInteractedWithVoice(true);
    sessionStorage.setItem('aria_voice_session_active', 'false');
    setShowVoicePermissionModal(false);
    localStorage.setItem('aria_voice_modal_seen', 'true');
    localStorage.setItem('aria_voice_enabled', 'false');
  };

  const handleVoicePermissionDenied = () => {
    // Browser blocked voice - show permission modal to get user interaction
    console.log('[ParticleAuth] Voice permission denied, showing modal');
    setShowVoicePermissionModal(true);
  };

  // Voice command detection
  useEffect(() => {
    // Only start voice recognition if voice is enabled AND user has interacted with the modal
    if (!voiceEnabled || !hasUserInteractedWithVoice) return;

    // Don't run voice commands during name pronunciation - user needs dedicated speech recognition
    if (currentState === 'name_pronunciation') return;

    // @ts-expect-error - SpeechRecognition is not in standard types yet
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    console.log('[ParticleAuth] Starting voice command recognition');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Track if we intentionally stopped recognition to prevent unwanted restarts
    let isIntentionalStop = false;
    let restartAttempts = 0;
    const MAX_RESTART_ATTEMPTS = 3;
    let restartTimeout: ReturnType<typeof setTimeout> | null = null;

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const command = lastResult[0].transcript.trim().toLowerCase();
      console.log('[ParticleAuth] Voice command detected:', command);

      // Reset restart attempts on successful recognition
      restartAttempts = 0;

      if (mode === 'login' && (command.includes('sign up') || command.includes('register') || command.includes('create account'))) {
        navigate('/register');
      } else if (mode === 'login' && (command.includes('forgot password') || command.includes('reset password') || command.includes('forgot my password'))) {
        navigate('/forgot-password');
      } else if ((mode === 'register' || mode === 'forgot-password') && (command.includes('log in') || command.includes('sign in') || command.includes('login'))) {
        navigate('/login');
      } else {
        dispatch({ type: 'VOICE_COMMAND', command });
      }
    };

    recognition.onerror = (event: any) => {
      // Ignore no-speech and aborted errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      // For other errors, increment restart attempts
      console.error('[ParticleAuth] Speech recognition error:', event.error);
      restartAttempts++;

      // If we've hit max restart attempts, stop trying
      if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
        console.log('[ParticleAuth] Max restart attempts reached, stopping voice recognition');
        isIntentionalStop = true;
      }
    };

    recognition.onend = () => {
      // Only restart if we didn't intentionally stop and haven't exceeded max attempts
      if (!isIntentionalStop && voiceEnabled && restartAttempts < MAX_RESTART_ATTEMPTS) {
        // Add a delay before restarting to prevent infinite loops
        restartTimeout = setTimeout(() => {
          try {
            console.log('[ParticleAuth] Recognition ended, restarting... (attempt', restartAttempts + 1, ')');
            recognition.start();
          } catch (e) {
            console.error('[ParticleAuth] Error restarting speech recognition:', e);
            restartAttempts++;
          }
        }, 1000); // 1 second delay
      } else if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
        console.log('[ParticleAuth] Not restarting - max attempts reached');
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('[ParticleAuth] Error starting speech recognition:', e);
      restartAttempts = MAX_RESTART_ATTEMPTS; // Don't try to restart if initial start fails
    }

    return () => {
      console.log('[ParticleAuth] Cleaning up voice command recognition');
      isIntentionalStop = true;
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      try {
        recognition.stop();
      } catch {
        // silently fail
      }
    };
  }, [voiceEnabled, hasUserInteractedWithVoice, currentState, mode, dispatch, navigate]);

  return (
    <div className="relative w-full h-screen bg-dark-200 overflow-hidden">
      {/* Particle Wave Background */}
      <div className="absolute inset-0">
        <ParticleWave
          isSpeaking={isSpeaking}
          emotion={getParticleEmotion()}
          audioAnalyser={audioAnalyser}
        />
      </div>

      {/* Voice Permission Modal */}
      {showVoicePermissionModal && (
        <VoicePermissionModal
          onRequestPermission={handleEnableVoice}
          onDismiss={handleSkipVoice}
        />
      )}

      {/* Voice Prompt */}
      <AnimatePresence mode="wait">
        {voiceEnabled && (voicePrompt.text || errorMessage) && (
          <VoicePrompt
            key={`${currentState}-${replayVoice}-${errorMessage ? 'error' : 'prompt'}`}
            text={errorMessage || voicePrompt.text}
            emotion={errorMessage ? 'error' : voicePrompt.emotion}
            autoSpeak={voiceEnabled}
            voiceEnabled={voiceEnabled}
            onPermissionDenied={handleVoicePermissionDenied}
            onSpeakingChange={setIsSpeaking}
            onAudioAnalyser={setAudioAnalyser}
          />
        )}
      </AnimatePresence>

      {/* Input Field */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {renderInput()}
        </AnimatePresence>
      </div>

      {/* Navigation Hints */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {canGoBack() && (
            <button
              onClick={() => dispatch({ type: 'BACK' })}
              className="px-4 py-2 rounded-lg bg-dark-300/50 hover:bg-dark-300 transition-colors"
            >
              ← Back
            </button>
          )}

          {(currentState === 'email' || currentState === 'password' || currentState === 'personal_details' || currentState === 'account_details') && (
            <div className="flex items-center gap-4">
              {/* Next button for multi-step flows */}
              {isStepValid() && currentState !== 'password' && currentState !== 'account_details' && mode !== 'forgot-password' && (
                <div className="flex items-center gap-3">
                  {voiceEnabled && <span className="text-xs italic text-gray-500">Say</span>}
                  <button
                    onClick={() => dispatch({ type: 'NEXT' })}
                    className="px-6 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors flex items-center gap-2"
                  >
                    Next ›
                  </button>
                </div>
              )}

              {/* Submit button */}
              {canSubmit() && (
                (currentState === 'password' || currentState === 'account_details') ||
                (mode === 'forgot-password' && currentState === 'email')
              ) && (
                <div className="flex items-center gap-3">
                  {voiceEnabled && <span className="text-xs italic text-gray-500">Say</span>}
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors font-medium"
                  >
                    {mode === 'login' ? 'Log In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyboard hints */}
        <div className="mt-3 text-center text-xs text-gray-500">
          <span className="inline-block px-2 py-1 rounded bg-dark-300/30 mr-2">Enter</span>
          to continue
          {canGoBack() && (
            <>
              <span className="mx-2">•</span>
              <span className="inline-block px-2 py-1 rounded bg-dark-300/30 mr-2">Esc</span>
              to go back
            </>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="absolute top-8 right-8 text-right">
        <p className="text-sm text-gray-400 mb-1">
          {mode === 'login'
            ? "Don't have an account?"
            : mode === 'register'
              ? 'Already have an account?'
              : 'Remember your password?'}
        </p>
        <button
          onClick={() => navigate(mode === 'login' ? '/register' : '/login')}
          className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-end gap-2 ml-auto"
        >
          {voiceEnabled && <span className="text-xs italic opacity-70">Say</span>}
          {mode === 'login' ? 'Sign Up' : 'Log In'}
        </button>

        {mode === 'login' && (
          <button
            onClick={() => navigate('/forgot-password')}
            className="mt-2 text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center justify-end gap-2 ml-auto"
          >
            {voiceEnabled && <span className="text-[10px] italic opacity-70">Say</span>}
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
