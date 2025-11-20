import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { HomePage } from '@/pages/HomePage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VoicePermissionModal } from '@/components/auth/VoicePermissionModal';
import { setVoicePermissionModalHandler, retryPendingPlayback } from '@/services/audioService';
import { useEffect, useState } from 'react';

function App() {
  const [showVoicePermissionModal, setShowVoicePermissionModal] = useState(false);

  useEffect(() => {
    // Register the voice permission modal handler globally
    setVoicePermissionModalHandler(() => {
      setShowVoicePermissionModal(true);
    });
  }, []);

  const handleEnableVoice = () => {
    setShowVoicePermissionModal(false);
    localStorage.setItem('aria_voice_modal_seen', 'true');
    localStorage.setItem('aria_voice_enabled', 'true');

    // Retry the pending playback after a short delay to ensure user interaction is registered
    setTimeout(() => {
      retryPendingPlayback();
    }, 100);
  };

  const handleSkipVoice = () => {
    setShowVoicePermissionModal(false);
    localStorage.setItem('aria_voice_modal_seen', 'true');
    localStorage.setItem('aria_voice_enabled', 'false');
  };

  return (
    <BrowserRouter>
      {showVoicePermissionModal && (
        <VoicePermissionModal
          onRequestPermission={handleEnableVoice}
          onDismiss={handleSkipVoice}
        />
      )}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
