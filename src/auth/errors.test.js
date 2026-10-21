import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  isSessionError,
  loginErrorMessage,
  signupErrorMessage,
  signupOutcome,
} from './errors.js';

describe('loginErrorMessage', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, MESSAGES.invalidCredentials],
    [{ code: 'email_not_confirmed', status: 400 }, MESSAGES.emailNotConfirmed],
    [{ code: 'over_request_rate_limit', status: 429 }, MESSAGES.rateLimited],
    [{ status: 429 }, MESSAGES.rateLimited],
    [{ name: 'AuthRetryableFetchError', status: 0 }, MESSAGES.network],
    [{ status: 500, code: 'unexpected_failure' }, MESSAGES.network],
  ])('%o', (error, message) => {
    expect(loginErrorMessage(error)).toBe(message);
  });
});

describe('signupErrorMessage', () => {
  it.each([
    [{ code: 'user_already_exists', status: 422 }, MESSAGES.alreadyRegistered],
    [{ code: 'email_exists', status: 422 }, MESSAGES.alreadyRegistered],
    [{ code: 'weak_password', status: 422 }, MESSAGES.weakPassword],
    [{ code: 'over_email_send_rate_limit', status: 429 }, MESSAGES.rateLimited],
    [{ code: 'unexpected_failure', status: 500 }, MESSAGES.notRegistered],
    // Dạng lỗi thật khi trigger lien_ket_tai_khoan từ chối (đã kiểm tra với Supabase, không có code)
    [{ name: 'AuthRetryableFetchError', status: 500, message: 'Database error saving new user' }, MESSAGES.notRegistered],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, MESSAGES.network],
  ])('%o', (error, message) => {
    expect(signupErrorMessage(error)).toBe(message);
  });
});

describe('signupOutcome', () => {
  it('identities rỗng → email đã có tài khoản', () => {
    expect(signupOutcome({ user: { identities: [] }, session: null })).toBe('exists');
  });

  it('có user, chưa có phiên → chờ xác nhận email', () => {
    expect(signupOutcome({ user: { identities: [{ id: '1' }] }, session: null })).toBe('confirm-email');
  });

  it('có phiên → đã đăng nhập', () => {
    expect(signupOutcome({ user: { identities: [{ id: '1' }] }, session: {} })).toBe('signed-in');
  });
});

describe('isSessionError', () => {
  it.each([
    [{ code: 'PGRST301' }, true],
    [{ code: 'PGRST303' }, true],
    [{ status: 401 }, true],
    [{ code: '42501' }, false],
    [null, false],
    [undefined, false],
  ])('%o → %s', (error, expected) => {
    expect(isSessionError(error)).toBe(expected);
  });
});
