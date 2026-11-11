import React, { useState } from 'react';
import axios from 'axios';
import * as bi from 'react-icons/bi';
import OtpInput from './otpInput';

function Forgot({ setRespond, onBack }) {
  const [step, setStep] = useState(1);
  const [process, setProcess] = useState(false);
  const [visible, setVisible] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  const [form, setForm] = useState({
    username: '',
    otp: '',
    password: '',
    confirm: '',
  });

  const update = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const requestCode = async (e) => {
    try {
      if (e) e.preventDefault();

      setProcess(true);
      setRespond({ success: true, message: null });

      const { data } = await axios.post('/users/forgot-password', {
        username: form.username.trim(),
      });

      if (data.otp) {
        setDevOtp(String(data.otp));
        setForm((prev) => ({ ...prev, otp: String(data.otp) }));
      }

      setStep(2);
      setRespond({
        success: true,
        message: data.message || 'Reset code sent',
      });
    } catch (error0) {
      setRespond({
        success: false,
        message:
          error0.response?.data?.message || 'Unable to request a reset code',
      });
    } finally {
      setProcess(false);
    }
  };

  const resetPassword = async (e) => {
    try {
      e.preventDefault();

      const code = form.otp.replace(/\s/g, '');

      if (code.length !== 4) {
        setRespond({ success: false, message: 'Enter the 4-digit code' });
        return;
      }

      if (form.password !== form.confirm) {
        setRespond({ success: false, message: 'Passwords do not match' });
        return;
      }

      setProcess(true);

      const { data } = await axios.post('/users/reset-password', {
        username: form.username.trim(),
        otp: Number(code),
        password: form.password,
      });

      localStorage.setItem('token', data.payload);
      setRespond({ success: true, message: data.message });
      setTimeout(() => window.location.reload(), 800);
    } catch (error0) {
      setProcess(false);
      setRespond({
        success: false,
        message:
          error0.response?.data?.message || 'Unable to reset the password',
      });
    }
  };

  return (
    <div className="grid gap-4">
      <button
        type="button"
        className="mb-1 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-ink-500 transition hover:bg-spill-100 hover:text-ink-800 dark:text-white/50 dark:hover:bg-spill-800 dark:hover:text-white"
        onClick={onBack}
      >
        <bi.BiArrowBack size={15} />
        Back to sign in
      </button>

      {step === 1 && (
        <form className="grid gap-4" onSubmit={requestCode}>
          <label htmlFor="forgot-username" className="grid gap-1.5">
            <span className="text-xs font-bold text-ink-600 dark:text-white/60">
              Username or email
            </span>
            <span className="relative flex items-center">
              <i className="pointer-events-none absolute left-4 text-ink-400">
                <bi.BiUser size={19} />
              </i>
              <input
                type="text"
                name="username"
                id="forgot-username"
                placeholder="alex or alex@wpmessager.dev"
                className="h-12 w-full rounded-xl border border-spill-200 bg-spill-50/60 pl-11 pr-4 text-sm font-medium text-ink-900 transition placeholder:text-ink-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-spill-700 dark:bg-spill-950/60 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-900/40"
                value={form.username}
                onChange={update}
                required
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={process}
            className="flex h-12 items-center justify-center gap-2 rounded-xl brand-gradient text-sm font-bold text-white shadow-soft transition hover:brightness-110 disabled:opacity-60"
          >
            {process ? (
              <i className="animate-spin">
                <bi.BiLoaderAlt size={18} />
              </i>
            ) : (
              <>
                <span>Send reset code</span>
                <bi.BiRightArrowAlt size={19} />
              </>
            )}
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="grid gap-4" onSubmit={resetPassword}>
          <div>
            <p className="text-xs font-bold text-ink-600 dark:text-white/60">
              Verification code
            </p>
            <div className="mt-3">
              <OtpInput
                value={form.otp}
                error={!devOtp && form.otp.replace(/\s/g, '').length > 0}
                onChange={(otp) => setForm((prev) => ({ ...prev, otp }))}
              />
            </div>
            {devOtp && (
              <p className="mt-3 rounded-xl border border-dashed border-sky-300 bg-sky-50 px-3 py-2 text-center text-xs text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                Demo mode — your reset code is{' '}
                <span className="font-display text-sm font-bold tracking-[0.25em]">
                  {devOtp}
                </span>
              </p>
            )}
          </div>

          <label htmlFor="forgot-password" className="grid gap-1.5">
            <span className="text-xs font-bold text-ink-600 dark:text-white/60">
              New password
            </span>
            <span className="relative flex items-center">
              <i className="pointer-events-none absolute left-4 text-ink-400">
                <bi.BiLockAlt size={19} />
              </i>
              <input
                type={visible ? 'text' : 'password'}
                name="password"
                id="forgot-password"
                placeholder="At least 6 characters"
                minLength={6}
                className="h-12 w-full rounded-xl border border-spill-200 bg-spill-50/60 pl-11 pr-12 text-sm font-medium text-ink-900 transition placeholder:text-ink-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-spill-700 dark:bg-spill-950/60 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-900/40"
                value={form.password}
                onChange={update}
                required
              />
              <button
                type="button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                className="absolute right-3 rounded-lg p-1.5 text-ink-400 hover:bg-spill-100 dark:hover:bg-spill-800"
                onClick={() => setVisible((prev) => !prev)}
              >
                {visible ? <bi.BiHide size={18} /> : <bi.BiShow size={18} />}
              </button>
            </span>
          </label>

          <label htmlFor="forgot-confirm" className="grid gap-1.5">
            <span className="text-xs font-bold text-ink-600 dark:text-white/60">
              Confirm new password
            </span>
            <span className="relative flex items-center">
              <i className="pointer-events-none absolute left-4 text-ink-400">
                <bi.BiLockAlt size={19} />
              </i>
              <input
                type={visible ? 'text' : 'password'}
                name="confirm"
                id="forgot-confirm"
                placeholder="Repeat your new password"
                minLength={6}
                className="h-12 w-full rounded-xl border border-spill-200 bg-spill-50/60 pl-11 pr-4 text-sm font-medium text-ink-900 transition placeholder:text-ink-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-spill-700 dark:bg-spill-950/60 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-900/40"
                value={form.confirm}
                onChange={update}
                required
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={process}
            className="flex h-12 items-center justify-center gap-2 rounded-xl brand-gradient text-sm font-bold text-white shadow-soft transition hover:brightness-110 disabled:opacity-60"
          >
            {process ? (
              <i className="animate-spin">
                <bi.BiLoaderAlt size={18} />
              </i>
            ) : (
              <>
                <span>Reset password</span>
                <bi.BiCheck size={19} />
              </>
            )}
          </button>

          <button
            type="button"
            className="text-xs font-bold text-sky-700 hover:underline dark:text-sky-300"
            onClick={requestCode}
          >
            Send a new code
          </button>
        </form>
      )}
    </div>
  );
}

export default Forgot;
