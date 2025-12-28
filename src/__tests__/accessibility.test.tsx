/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import EmergencyForm from '../components/emergency/EmergencyForm';
import Navbar from '../components/Navbar';
import { vi } from 'vitest';

vi.mock('lucide-react', () => ({
  Camera: () => null,
  Upload: () => null,
  Plus: () => null,
  Trash2: () => null,
  Shield: () => null,
}));

expect.extend(toHaveNoViolations as any);

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
    expect(results).toHaveNoViolations();
  });

  it('Navbar has no critical axe violations', async () => {
    const { container } = render(<Navbar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
