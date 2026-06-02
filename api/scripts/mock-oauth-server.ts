import { OAuth2Server, Events } from 'oauth2-mock-server';

const PROFILES: Record<string, { sub: string; email: string; name: string }> = {
  'mock-google-client-id': {
    sub: 'mock-google-001',
    email: 'mockuser.google@example.com',
    name: 'Mock Google User',
  },
  'mock-facebook-client-id': {
    sub: 'mock-facebook-001',
    email: 'mockuser.facebook@example.com',
    name: 'Mock Facebook User',
  },
  'mock-x-client-id': {
    sub: 'mock-x-001',
    email: 'mockuser.x@example.com',
    name: 'Mock X User',
  },
};

const DEFAULT_PROFILE = {
  sub: 'mock-user-001',
  email: 'mockuser@example.com',
  name: 'Mock User',
};

const server = new OAuth2Server();

async function main() {
  await server.issuer.keys.generate('RS256');

  server.service.on(Events.BeforeAuthorizeRedirect, (_authorizeRedirectUri, req) => {
    console.log(`[mock-oauth] authorize  ${req.url}`);
  });

  server.service.on(Events.BeforeTokenSigning, (token, req) => {
    console.log(`[mock-oauth] token      ${req.method} ${req.url}`);
    const clientId = (req as any).body?.client_id;
    const profile = PROFILES[clientId] ?? DEFAULT_PROFILE;
    token.payload.sub = profile.sub;
    token.payload.email = profile.email;
    token.payload.name = profile.name;
    // Store client_id in token so BeforeUserinfo can read it
    token.payload.client_id = clientId;
  });

  server.service.on(Events.BeforeUserinfo, (userInfo, req) => {
    console.log(`[mock-oauth] userinfo   ${req.method} ${req.url}`);
    // Resolve profile from the Bearer token's client_id claim
    const authHeader = (req as any).headers?.authorization ?? '';
    const rawToken = authHeader.replace('Bearer ', '');
    let clientId: string | undefined;
    try {
      clientId = JSON.parse(Buffer.from(rawToken.split('.')[1], 'base64').toString()).client_id;
    } catch {
      // ignore decode errors — fall back to default
    }
    const profile = (clientId && PROFILES[clientId]) || DEFAULT_PROFILE;
    userInfo.body.sub = profile.sub;
    userInfo.body.email = profile.email;
    userInfo.body.name = profile.name;
  });

  await server.start(8080, 'localhost');
  console.log('Mock OAuth server running at http://localhost:8080');
  console.log('');
  console.log('Profiles:');
  for (const [clientId, profile] of Object.entries(PROFILES)) {
    console.log(`  ${clientId} → ${profile.email}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
