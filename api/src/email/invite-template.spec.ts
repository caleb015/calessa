import { INVITE_DEFAULTS, renderInvitation, resolveTemplate } from './invite-template';

const data = {
  guestName: 'Juan dela Cruz',
  rsvpLink: 'https://raissaandcaleb.com/rsvp/TESTCODE',
  weddingDate: new Date('2027-02-12T07:00:00.000Z'),
  coupleNameA: 'Caleb',
  coupleNameB: 'Raissa',
};

describe('resolveTemplate', () => {
  it('uses defaults for missing, null, and empty overrides', () => {
    expect(resolveTemplate(null)).toEqual(INVITE_DEFAULTS);
    expect(resolveTemplate({ inviteSubject: null, inviteHeading: '' })).toEqual(INVITE_DEFAULTS);
  });

  it('applies provided overrides', () => {
    const t = resolveTemplate({ inviteButtonText: 'Reply', inviteAccentColor: '#c84b7a' });
    expect(t.inviteButtonText).toBe('Reply');
    expect(t.inviteAccentColor).toBe('#c84b7a');
  });

  it('ignores color overrides that are not hex colors', () => {
    const t = resolveTemplate({ inviteAccentColor: 'red; background: url(x)' });
    expect(t.inviteAccentColor).toBe(INVITE_DEFAULTS.inviteAccentColor);
  });
});

describe('renderInvitation', () => {
  it('renders the default invitation with placeholders filled', () => {
    const { subject, html } = renderInvitation(null, data);
    expect(subject).toBe("You're invited! — Caleb & Raissa's Wedding");
    expect(html).toContain('Caleb &amp; Raissa</h1>');
    expect(html).toContain('Dear Juan dela Cruz,');
    expect(html).toContain('Please join us on Friday, February 12, 2027.');
    expect(html).toContain('href="https://raissaandcaleb.com/rsvp/TESTCODE"');
    expect(html).toContain('RSVP Here');
  });

  it('applies colors to the background, text, heading, button, and muted text', () => {
    const { html } = renderInvitation(
      {
        inviteBackgroundColor: '#faf7f2',
        inviteTextColor: '#111111',
        inviteAccentColor: '#c84b7a',
        inviteMutedColor: '#7a8e82',
        inviteButtonTextColor: '#000000',
      },
      data,
    );
    expect(html).toContain('background-color: #faf7f2');
    expect(html).toContain('color: #111111');
    expect(html).toContain('color: #c84b7a; margin: 0 0 8px;'); // heading
    expect(html).toContain('background-color: #c84b7a; color: #000000'); // button
    expect(html).toContain('color: #7a8e82');
  });

  it('turns blank lines into paragraphs and single newlines into line breaks', () => {
    const { html } = renderInvitation({ inviteMessage: 'First line\nsecond line\n\nNew paragraph' }, data);
    expect(html).toContain('>First line<br />second line</p>');
    expect(html).toContain('>New paragraph</p>');
  });

  it('escapes HTML in admin text and guest data but keeps the subject plain', () => {
    const { subject, html } = renderInvitation(
      { inviteMessage: '<b>bold</b> & {guestName}', inviteSubject: 'Hi {guestName} & co' },
      { ...data, guestName: '<script>x</script>' },
    );
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt; &amp; &lt;script&gt;x&lt;/script&gt;');
    expect(subject).toBe('Hi <script>x</script> & co');
  });

  it('does not expand placeholders that appear inside guest data', () => {
    const { html } = renderInvitation(null, { ...data, guestName: '{coupleA}' });
    expect(html).toContain('Dear {coupleA},');
  });

  it('says the date is to be announced when there is no wedding date', () => {
    const { html } = renderInvitation(null, { ...data, weddingDate: null });
    expect(html).toContain('Please join us on a date to be announced.');
  });
});
