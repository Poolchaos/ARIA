/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

test.describe('Voice Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Inject MockSpeechRecognition before the app loads
    await page.addInitScript(() => {
      // Mock Auth Storage
      const mockUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        householdId: 'test-household',
        onboardingCompleted: true,
      };

      const authState = {
        state: {
          user: mockUser,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          isAuthenticated: true,
        },
        version: 0,
      };

      localStorage.setItem('auth-storage', JSON.stringify(authState));
      localStorage.setItem('accessToken', 'mock-access-token');

      class MockSpeechRecognition extends EventTarget {
        continuous = false;
        interimResults = false;
        lang = 'en-US';
        onresult: ((event: any) => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        onstart: (() => void) | null = null;

        start() {
          console.log('Mock Speech Recognition Started');
          if (this.onstart) this.onstart();
        }

        stop() {
          console.log('Mock Speech Recognition Stopped');
          if (this.onend) this.onend();
        }

        abort() {
          this.stop();
        }

        // Helper to simulate speech
        emitResult(transcript: string, isFinal = true) {
          const event = {
            resultIndex: 0,
            results: {
              0: {
                0: { transcript, confidence: 1 },
                isFinal,
                length: 1,
              },
              length: 1,
            },
          };
          if (this.onresult) this.onresult(event);
        }
      }

      // Expose the mock class and instance to the window
      (window as any).MockSpeechRecognition = MockSpeechRecognition;

      // Replace the native API
      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;

      // Create a global instance we can control
      (window as any).mockVoiceInstance = new MockSpeechRecognition();

      // Override the constructor to return our controllable instance
      (window as any).SpeechRecognition = function() {
        return (window as any).mockVoiceInstance;
      };
      (window as any).webkitSpeechRecognition = (window as any).SpeechRecognition;
    });

    await page.goto('/');
  });

  test('should show listening state when wake word is detected', async ({ page }) => {
    // Wait for app to load (Home Page)
    await expect(page.getByText('System Online')).toBeVisible();

    // Simulate "Hey Aria"
    await page.evaluate(() => {
      (window as any).mockVoiceInstance.emitResult('Hey Aria');
    });

    // Expect UI to change to "Listening..."
    await expect(page.getByText('Listening...', { exact: true })).toBeVisible();
  });
});
