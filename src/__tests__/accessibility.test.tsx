/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import EmergencyForm from '../components/emergency/EmergencyForm';
import Navbar from '../components/Navbar';
import { BrowserRouter } from 'react-router-dom';

vi.mock('lucide-react', () => ({
  Camera: () => null,
  Upload: () => null,
  Plus: () => null,
  Trash2: () => null,
  Shield: () => null,
  Menu: () => null,
  X: () => null,
  Heart: () => null,
}));

describe('Accessibility checks', () => {
  it('EmergencyForm has no critical axe violations', async () => {
    const emergencyInfo = {
      fullName: '',
      email: '',
      bloodType: '',
      emergencyContacts: [{ name: '', phone: '' }],
      allergies: '',
      medications: '',
      medicalConditions: '',
      photo: null,
      dateOfBirth: '',
      address: '',
      phoneNumber: '',
    };
    const { container } = render(
      <EmergencyForm
        emergencyInfo={emergencyInfo}
        onChange={() => {}}
        onPhotoChange={() => {}}
      />
    );
    const results = await axe(container);
    expect(results.violations.length).toBe(0);
  });

  it('Navbar has no critical axe violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    const results = await axe(container);
    expect(results.violations.length).toBe(0);
  });
});
