import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ParticleCanvas } from './ParticleCanvas';
import { ParticleInput } from './ParticleInput';
import { VoicePrompt } from './VoicePrompt';
import { VoicePermissionModal } from './VoicePermissionModal';
import { useAuthStateMachine } from './AuthStateMachine';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { authApi } from '../../lib/api';

interface ParticleAuthProps {
  mode: 'login' | 'register';
}

export function ParticleAuth({ mode }: ParticleAuthProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [audioLevel] = useState(0);
  const [showVoicePermissionModal, setShowVoicePermissionModal] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const {
    currentState,
    dispatch,
    formData,
    setFormField,
    getParticleFormation,
    getParticleEmotion,
    getVoicePrompt,
    canGoBack,
    canSubmit,
    errorMessage,
  } = useAuthStateMachine();

  // Initialize mode
  useEffect(() => {
    dispatch({ type: mode === 'login' ? 'START_LOGIN' : 'START_REGISTER' });
    
    // Check if we should show voice permission modal
    const hasSeenVoiceModal = localStorage.getItem('aria_voice_modal_seen');
    if (!hasSeenVoiceModal && 'speechSynthesis' in window) {
      // Small delay to let the page load
      const timer = setTimeout(() => {
        setShowVoicePermissionModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, dispatch]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!canSubmit()) return;

    dispatch({ type: 'SUBMIT' });

    try {
      if (mode === 'login') {
        const response = await authApi.login({
          email: formData.email,
          password: formData.password,
        });
        const { user, accessToken, refreshToken } = response.data.data;
        setAuth(user, accessToken, refreshToken);
        dispatch({ type: 'SUCCESS', userId: user.id });
      } else {
        if (!formData.name || formData.password !== formData.confirmPassword) {
          dispatch({
            type: 'VALIDATION_ERROR',
            message: formData.password !== formData.confirmPassword
              ? "Hmm, those passwords don't match. Let's try again."
              : "I need all the details to create your account.",
          });
          return;
        }

        const response = await authApi.register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        });
        const { user, accessToken, refreshToken } = response.data.data;
        setAuth(user, accessToken, refreshToken);
        dispatch({ type: 'SUCCESS', userId: user.id });
      }

      // Success celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#60A5FA', '#34D399', '#A78BFA'],
      });

      // Navigate to home after success
      setTimeout(() => {
        navigate('/');
      }, 2500);
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      dispatch({
        type: 'ERROR',
        message: errorMessage || 'Something went wrong. Let\'s give that another try.',
      });
    }
  };

  // Handle enter key
  const handleEnter = () => {
    if (currentState === 'greeting') {
      dispatch({ type: 'NEXT' });
    } else if (canSubmit() && (currentState === 'password' || currentState === 'confirmPassword')) {
      handleSubmit();
    } else if (getCurrentFieldValue()) {
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
  const getCurrentFieldValue = (): string => {
    switch (currentState) {
      case 'email':
        return formData.email;
      case 'password':
        return formData.password;
      case 'name':
        return formData.name || '';
      case 'confirmPassword':
        return formData.confirmPassword || '';
      default:
        return '';
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
            error={errorMessage || undefined}
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
            error={errorMessage || undefined}
          />
        );

      case 'name':
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
            error={errorMessage || undefined}
          />
        );

      case 'confirmPassword':
        return (
          <ParticleInput
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword || ''}
            onChange={(value) => setFormField('confirmPassword', value)}
            placeholder="One more time"
            autoFocus
            onEnter={handleEnter}
            onEscape={handleEscape}
            error={errorMessage || undefined}
          />
        );

      default:
        return null;
    }
  };

  const voicePrompt = getVoicePrompt();

  const handleEnableVoice = () => {
    setVoiceEnabled(true);
    setShowVoicePermissionModal(false);
    localStorage.setItem('aria_voice_modal_seen', 'true');
  };

  const handleSkipVoice = () => {
    setVoiceEnabled(false);
    setShowVoicePermissionModal(false);
    localStorage.setItem('aria_voice_modal_seen', 'true');
  };

  const handleVoicePermissionDenied = () => {
    // Voice was denied, show a toast or message
    setVoiceEnabled(false);
  };

  return (
    <div className="relative w-full h-screen bg-dark-200 overflow-hidden">
      {/* Particle Canvas Background */}
      <div className="absolute inset-0">
        <ParticleCanvas
          formation={getParticleFormation()}
          emotion={getParticleEmotion()}
          audioLevel={audioLevel}
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
        {voiceEnabled && voicePrompt.text && (
          <VoicePrompt
            key={currentState}
            text={voicePrompt.text}
            emotion={voicePrompt.emotion}
            onPermissionDenied={handleVoicePermissionDenied}
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

          {currentState === 'greeting' && (
            <button
              onClick={() => dispatch({ type: 'NEXT' })}
              className="px-6 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors"
            >
              Let's go! →
            </button>
          )}

          {(currentState === 'email' || currentState === 'password' || currentState === 'name' || currentState === 'confirmPassword') && (
            <div className="flex gap-2">
              {getCurrentFieldValue() && currentState !== 'password' && currentState !== 'confirmPassword' && (
                <button
                  onClick={() => dispatch({ type: 'NEXT' })}
                  className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors"
                >
                  Next →
                </button>
              )}

              {canSubmit() && (currentState === 'password' || currentState === 'confirmPassword') && (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors font-medium"
                >
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                </button>
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
      <div className="absolute top-8 right-8">
        <button
          onClick={() => navigate(mode === 'login' ? '/register' : '/login')}
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
