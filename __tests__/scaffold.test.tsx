import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../src/App';

describe('scaffold', () => {
  it('renders the revitalization placeholder text', async () => {
    const { getByText } = await render(<App />);
    expect(getByText('NotifyAvailability is being revitalized.')).toBeTruthy();
  });
});
