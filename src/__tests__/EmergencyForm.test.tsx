/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmergencyForm from '../components/emergency/EmergencyForm';
import { vi } from 'vitest';

vi.mock('lucide-react', () => ({
  Camera: () => null,
  Upload: () => null,
  Plus: () => null,
  Trash2: () => null,
}));

const setup = (overrides: Partial<any> = {}) => {
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
    ...overrides,
  };
  const onChange = vi.fn();
  const onPhotoChange = vi.fn();
  const onAddEmergencyContact = vi.fn();
  const onRemoveEmergencyContact = vi.fn();
  const onEmergencyContactChange = vi.fn();

  render(
    <EmergencyForm
      emergencyInfo={emergencyInfo}
      onChange={onChange}
      onPhotoChange={onPhotoChange}
      onAddEmergencyContact={onAddEmergencyContact}
      onRemoveEmergencyContact={onRemoveEmergencyContact}
      onEmergencyContactChange={onEmergencyContactChange}
    />
  );
  return { onAddEmergencyContact, onRemoveEmergencyContact, onEmergencyContactChange };
};

describe('EmergencyForm dynamic contacts', () => {
  it('shows Add button and calls handler', () => {
    const { onAddEmergencyContact } = setup();
    const addBtn = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addBtn);
    expect(onAddEmergencyContact).toHaveBeenCalledTimes(1);
  });

  it('shows Remove button disabled when only 1 contact', () => {
    setup();
    const removeBtn = screen.getByRole('button', { name: /remove contact/i });
    expect(removeBtn).toBeDisabled();
  });

  it('updates contact fields via handler', () => {
    const { onEmergencyContactChange } = setup();
    const nameInput = screen.getByPlaceholderText(/contact name/i);
    const phoneInput = screen.getByPlaceholderText('+91 98765 43210');
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(phoneInput, { target: { value: '+919876543210' } });
    expect(onEmergencyContactChange).toHaveBeenCalledWith(0, 'name', 'John Doe');
    expect(onEmergencyContactChange).toHaveBeenCalledWith(0, 'phone', '+919876543210');
  });
});
