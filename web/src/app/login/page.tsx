import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      {/* LoginForm reads ?expired and ?next from the URL */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
