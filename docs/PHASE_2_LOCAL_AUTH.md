# Phase 2: Local Username/Password Auth Setup

**Status: Complete (2026-05-25)**

## Goal
Add a local authentication path (email + password) to the existing NestJS + Prisma backend and integrate with the existing frontend stub.

## 1. Environment setup
- Copy `api/.env.example` to `api/.env`.
- Set PostgreSQL connection:
  - `DATABASE_URL=postgresql://user:password@localhost:5432/auth_template?schema=public`
  - `JWT_SECRET=supersecret-please-change`  
  - `JWT_EXPIRES_IN=7d`

## 2. Prisma schema update
File: `api/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  password    String?
  provider    String   @default("local")
  providerId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- Run migrations:
  - `cd api`
  - `npx prisma migrate dev --name local-auth
  - `npx prisma generate`

## 3. Dependencies
In `api`:
- `npm install bcrypt`
- `npm install -D @types/bcrypt`

## 4. Users service: add local auth methods
File: `api/src/users/users.service.ts`

- `findByEmail(email)`
- `createLocalUser(email, password)` (bcrypt hash)
- `validateLocalUser(email, password)` (bcrypt compare)

## 5. Auth service and strategy
File: `api/src/auth/auth.service.ts`
- `validateUser(email, password)` -> user w/o password
- `login(user)` -> JWT token
- `register(email, password)` -> create user

File: `api/src/auth/local.strategy.ts`
- `PassportStrategy(Strategy)` with `usernameField: 'email'`
- `validate` calls `AuthService.validateUser`

File: `api/src/auth/guards/local-auth.guard.ts`
- extends `AuthGuard('local')`

## 6. AuthController
File: `api/src/auth/auth.controller.ts`

- POST `/auth/register` body `{email,password}`
- POST `/auth/login` guarded by `LocalAuthGuard`
- GET `/auth/me` guarded by `JwtAuthGuard`

Example:

```ts
@Post('register')
async register(@Body() body: {email: string; password: string}) {
  const user = await this.authService.register(body.email, body.password);
  const { password, ...result } = user;
  return result;
}

@UseGuards(LocalAuthGuard)
@Post('login')
async login(@Request() req) {
  return this.authService.login(req.user);
}

@UseGuards(JwtAuthGuard)
@Get('me')
async me(@Request() req) {
  return req.user;
}
```

## 7. Auth module configuration
File: `api/src/auth/auth.module.ts`

- Import `PassportModule`, `JwtModule`, `UsersModule`
- Provide `LocalStrategy`, `JwtStrategy`, `AuthService`

## 8. API run
- `cd api`
- `npm run start:dev`

## 9. Postman / curl test
- POST `/auth/register`
- POST `/auth/login` -> receive token
- GET `/auth/me` with header `Authorization: Bearer <token>`

## 10. Frontend connect
- `web` should call:
  - `POST ${appConfig.apiUrl}/auth/login`
  - `POST ${appConfig.apiUrl}/auth/register`
- On success save:
  - `localStorage.setItem('access_token', token)`
  - `localStorage.setItem('user_email', email)`

## 11. Validation
1. `npm run lint`
2. `npm run test
3. `npm run build`

---

### Notes
- Existing OAuth flow remains usable (provider-based path in `AuthController`).
- `provider` field is `local` for username/password users by default.
- `providerId` stays optional for local flow.
