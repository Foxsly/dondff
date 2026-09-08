import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, login as loginUser, register as registerUser } from '../api/auth';
import { AuthContext } from '../contexts/AuthContext';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Field,
  Input,
  LoadingSpinner,
  Logo,
  TabPanel,
  Tabs,
  useToast,
} from './ui';

type Mode = 'signin' | 'register';

/** Good enough to catch typos before a round trip; the backend is the authority. */
const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const SignIn: React.FC = () => {
  const { setUser } = useContext(AuthContext);
  const { success } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signin');
  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; name?: string }>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await getCurrentUser();
        if (!cancelled) setUser(current);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  // Switching tabs should clear whatever the other form complained about,
  // rather than carrying a stale error across.
  const handleModeChange = (next: string) => {
    setMode(next as Mode);
    setFormError('');
    setFieldErrors({});
  };

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email.trim())) {
      errors.email = 'That doesn\'t look like an email address.';
    }

    if (mode === 'register' && !name.trim()) {
      errors.name = 'Name is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const user =
        mode === 'register'
          ? await registerUser(name.trim(), email.trim(), password)
          : await loginUser(email.trim(), password);

      setUser(user);
      success(mode === 'register' ? 'Account created' : `Signed in as ${user.email}`);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(`${mode} error`, err);
      setFormError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return <LoadingSpinner message="Checking your session..." />;
  }

  const isRegister = mode === 'register';

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {isRegister && (
        <Field label="Name" error={fieldErrors.name} required>
          {(field) => (
            <Input
              {...field}
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
      )}

      <Field label="Email" error={fieldErrors.email} required>
        {(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}
      </Field>

      <Field label="Password">
        {(field) => (
          <Input
            {...field}
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      {formError && <Alert variant="danger">{formError}</Alert>}

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {isRegister ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-5 text-2xl font-bold">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          {isRegister
            ? 'Set up an account to join a league and start drafting.'
            : 'Sign in to pick up your leagues where you left off.'}
        </p>
      </div>

      <Card>
        <CardBody>
          <Tabs
            items={[
              { value: 'signin', label: 'Sign in' },
              { value: 'register', label: 'Create account' },
            ]}
            value={mode}
            onChange={handleModeChange}
          >
            <TabPanel value="signin">{form}</TabPanel>
            <TabPanel value="register">{form}</TabPanel>
          </Tabs>
        </CardBody>
      </Card>

      {process.env.NODE_ENV === 'development' && (
        <p className="mt-4 text-center text-xs text-text-faint">
          Development note: the backend ignores the password field until real
          auth is implemented.
        </p>
      )}
    </div>
  );
};

export default SignIn;
