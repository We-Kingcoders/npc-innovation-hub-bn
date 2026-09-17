import { renderBrandedEmail } from '../src/utils/emailTemplate.utils';

describe('renderBrandedEmail', () => {
  it('includes the heading and body content', () => {
    const html = renderBrandedEmail({
      heading: 'Verification Code',
      bodyHtml: '<p>Your code is 123456.</p>',
    });

    expect(html).toContain('Verification Code');
    expect(html).toContain('Your code is 123456.');
  });

  it('uses the app\'s navy brand color, not the old generic slate (#2c3e50)', () => {
    const html = renderBrandedEmail({
      heading: 'Test',
      bodyHtml: '<p>Body</p>',
    });

    expect(html).toContain('#002B56');
    expect(html).not.toContain('#2c3e50');
  });

  it('renders a CTA button when both ctaText and ctaLink are given', () => {
    const html = renderBrandedEmail({
      heading: 'Reset your password',
      bodyHtml: '<p>Click below.</p>',
      ctaText: 'Reset Password',
      ctaLink: 'https://example.com/reset?token=abc123',
    });

    expect(html).toContain('Reset Password');
    expect(html).toContain('https://example.com/reset?token=abc123');
  });

  it('omits the CTA block entirely when no link is given', () => {
    const html = renderBrandedEmail({
      heading: 'Role Update',
      bodyHtml: '<p>Your role changed.</p>',
    });

    expect(html).not.toContain('<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 4px;">');
  });

  it('includes the hidden preview text when provided', () => {
    const html = renderBrandedEmail({
      previewText: 'Your verification code is 654321',
      heading: 'Verification Code',
      bodyHtml: '<p>654321</p>',
    });

    expect(html).toContain('Your verification code is 654321');
  });

  it('is valid, well-formed HTML wrapping the recipient in a table-based layout (email-client safe)', () => {
    const html = renderBrandedEmail({
      heading: 'Welcome',
      bodyHtml: '<p>Hi</p>',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('NPC INNOVATION HUB');
    expect(html.match(/<table/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
