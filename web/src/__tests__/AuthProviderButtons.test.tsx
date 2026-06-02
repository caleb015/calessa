import { render, screen } from '@testing-library/react';
import AuthProviderButtons from '@/components/AuthProviderButtons';

describe('AuthProviderButtons', () => {
  it('renders enabled provider links', () => {
    render(<AuthProviderButtons />);
    expect(screen.getByRole('link', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /facebook/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue with x/i })).toBeInTheDocument();
  });

  it('does not render a Twitter link', () => {
    render(<AuthProviderButtons />);
    expect(screen.queryByRole('link', { name: /twitter/i })).not.toBeInTheDocument();
  });

  it('Google link points to backend OAuth URL', () => {
    render(<AuthProviderButtons />);
    expect(screen.getByRole('link', { name: /google/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/oauth/google'),
    );
  });

  it('Facebook link points to backend OAuth URL', () => {
    render(<AuthProviderButtons />);
    expect(screen.getByRole('link', { name: /facebook/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/oauth/facebook'),
    );
  });

  it('X link points to backend OAuth URL', () => {
    render(<AuthProviderButtons />);
    expect(screen.getByRole('link', { name: /continue with x/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/oauth/x'),
    );
  });

  it('applies className prop to wrapper', () => {
    const { container } = render(<AuthProviderButtons className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
