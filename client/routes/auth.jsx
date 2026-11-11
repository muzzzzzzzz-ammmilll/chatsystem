import React, { useState } from 'react';
import * as comp from '../components/auth';
import Brand from '../components/brand';

function Auth() {
  const [respond, setRespond] = useState({ success: true, message: null });
  const [login, setLogin] = useState(true);

  return (
    <div className="absolute w-full h-full flex justify-center items-center overflow-auto bg-spill-50 py-8 px-4">
      <div className="w-full max-w-[440px]">
        <div className="flex justify-center mb-6">
          <Brand size={46} showTagline={true} />
        </div>
        {/* body */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-spill-200/80 shadow-soft">
          {/* header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
              {login ? 'Sign in to your account' : 'Create your account'}
            </h1>
            <p className="text-sm text-spill-500 mt-1">
              {login
                ? 'Welcome back! Enter your details to continue.'
                : 'A few details and you are ready to start messaging.'}
            </p>
            {respond.message && (
              <div
                className={`mt-4 p-3 rounded-xl text-sm font-medium ${
                  respond.success
                    ? 'bg-burgundy-50 text-burgundy-800 border border-burgundy-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {respond.message}
              </div>
            )}
          </div>
          {login ? (
            <comp.login setRespond={setRespond} />
          ) : (
            <comp.register setRespond={setRespond} />
          )}
        </div>
        <div className="pt-6 text-center">
          <p className="text-sm text-spill-500">
            <span>
              {login ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              type="button"
              className="font-bold text-burgundy-700 hover:text-burgundy-800 hover:underline transition"
              onClick={() => {
                setRespond({ success: true, message: null });
                setLogin((prev) => !prev);
              }}
            >
              {login ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;
