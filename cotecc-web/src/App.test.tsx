import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

test('renders logo with alt text', () => {
  render(<App />);
  const logo = screen.getByAltText('logo');
  expect(logo).toBeInTheDocument();
  expect(logo.tagName).toBe('IMG');
});

test('learn react link has correct attributes', () => {
  render(<App />);
  const link = screen.getByRole('link', { name: /learn react/i });
  expect(link).toHaveAttribute('href', 'https://reactjs.org');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('displays edit instruction text', () => {
  render(<App />);
  expect(screen.getByText(/edit/i)).toBeInTheDocument();
  expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
});

test('renders without crashing (snapshot)', () => {
  const { container } = render(<App />);
  expect(container.firstChild).toMatchSnapshot();
});
