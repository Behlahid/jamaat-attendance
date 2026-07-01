// src/app/login/__tests__/LoginPage.test.js
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Auth context
jest.mock('@/lib/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Helper to mock the check‑setup endpoint
const mockCheckSetup = (hasAdmin) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ hasAdmin }),
    })
  );
};

describe('LoginPage', () => {
  const replaceMock = jest.fn();
  beforeEach(() => {
    // Reset mocks before each test
    useRouter.mockReturnValue({ replace: replaceMock, push: replaceMock });
    jest.clearAllMocks();
  });

  test('shows loading spinner while auth is loading', async () => {
    const mockAuth = {
      user: null,
      profile: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
    };
    require('@/lib/AuthContext').useAuth.mockReturnValue(mockAuth);
    mockCheckSetup(true);

    render(<LoginPage />);

    // The loading UI contains the class "auth-loading"
    expect(screen.getByText(/Jamaat Attendance/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders admin‑setup form when no admin exists', async () => {
    const mockAuth = {
      user: null,
      profile: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
    };
    require('@/lib/AuthContext').useAuth.mockReturnValue(mockAuth);
    mockCheckSetup(false); // hasAdmin = false → isSetup = true

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText(/Admin Setup/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create Admin Account/i })
    ).toBeInTheDocument();
  });

  test('renders normal sign‑in when admin already exists', async () => {
    const mockAuth = {
      user: null,
      profile: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
    };
    require('@/lib/AuthContext').useAuth.mockReturnValue(mockAuth);
    mockCheckSetup(true); // hasAdmin = true → isSetup = false

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText(/Jamaat Attendance/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/Your Name/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign In/i })
    ).toBeInTheDocument();
  });

  test('shows validation error when display name missing on admin setup', async () => {
    const mockSignUp = jest.fn();
    const mockAuth = {
      user: null,
      profile: null,
      loading: false,
      signIn: jest.fn(),
      signUp: mockSignUp,
    };
    require('@/lib/AuthContext').useAuth.mockReturnValue(mockAuth);
    mockCheckSetup(false);

    render(<LoginPage />);
    await waitFor(() => expect(screen.getByText(/Admin Setup/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Secret123' } });
    // Leave display name empty
    fireEvent.click(screen.getByRole('button', { name: /Create Admin Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please enter your name/i)).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('displays string error from signIn', async () => {
    const mockSignIn = jest.fn().mockRejectedValue('Invalid credentials');
    const mockAuth = {
      user: null,
      profile: null,
      loading: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
    };
    require('@/lib/AuthContext').useAuth.mockReturnValue(mockAuth);
    mockCheckSetup(true);

    render(<LoginPage />);
    await waitFor(() => expect(screen.getByText(/Jamaat Attendance/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
    expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'wrong');
  });

  test('successful admin setup redirects to /admin', async () => {
    const mockSignUp = jest.fn().mockResolvedValue(undefined);
    const mockAuth = {
      user: null,
      profile: null,
      loading: false,
      signIn: jest.fn(),
      signUp: mockSignUp,
    };
    require('@/lib/AuthContext').useAuth.mockReturnValue(mockAuth);
    mockCheckSetup(false);

    render(<LoginPage />);
    await waitFor(() => expect(screen.getByText(/Admin Setup/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Your Name/i), { target: { value: 'Admin User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'StrongPass123' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Admin Account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'admin@example.com',
        'StrongPass123',
        'Admin User',
        'admin'
      );
    });
    // The component uses setTimeout(…,1000) before routing
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin'), { timeout: 2000 });
  });
});
