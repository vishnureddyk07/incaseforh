/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmergencyQRCode from '../components/emergency/EmergencyQRCode';

// Mock QR generation to speed tests
vi.mock('qrcode', () => ({
  toDataURL: vi.fn(async () => 'data:image/png;base64,fake'),
}));

vi.mock('lucide-react', () => ({
  Shield: () => null,
  CheckCircle: () => null,
  Upload: () => null,
  Loader: () => null,
  Plus: () => null,
  Trash2: () => null,
}));

beforeEach(() => {
  // Define alert for jsdom
  (globalThis as any).alert = () => {};
  vi.spyOn(globalThis as any, 'alert').mockImplementation(() => {});
});

describe('EmergencyQRCode submission validation', () => {
  it('blocks submit without consent', () => {
    render(<EmergencyQRCode />);
    const btn = screen.getByRole('button', { name: /submit information/i });
    fireEvent.click(btn);
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/consent/i));
  });

  it('blocks submit without required fields', () => {
    render(<EmergencyQRCode />);
    const consent = screen.getByRole('checkbox');
    fireEvent.click(consent);
    const btn = screen.getByRole('button', { name: /submit information/i });
    fireEvent.click(btn);
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/full name.*phone number.*date of birth/i));
  });

  it('blocks submit if emergency contacts incomplete', () => {
    render(<EmergencyQRCode />);
    const consent = screen.getByRole('checkbox');
    fireEvent.click(consent);
    // Fill required personal fields
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'User Name' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2000-01-01' } });
    // Leave emergency contact empty
    const btn = screen.getByRole('button', { name: /submit information/i });
    fireEvent.click(btn);
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/add at least 1 emergency contact/i));
  });
});
