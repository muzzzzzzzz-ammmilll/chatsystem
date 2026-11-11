import React, { useRef } from 'react';

function OtpInput({ value = '', onChange, error = false }) {
  const refs = useRef([]);
  const chars = value.padEnd(4, ' ').slice(0, 4).split('');

  const setDigit = (index, digit) => {
    const next = value.padEnd(4, ' ').split('');
    next[index] = digit || ' ';
    onChange(next.join('').replace(/ /g, ' ').trimEnd());
  };

  const handleChange = (index, raw) => {
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      setDigit(index, '');
      return;
    }

    // Support pasting or typing over a box.
    if (digits.length > 1) {
      const next = value.padEnd(4, ' ').split('');
      digits
        .slice(0, 4 - index)
        .split('')
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      const combined = next.join('').trimEnd();
      onChange(combined);
      const focusIndex = Math.min(index + digits.length, 3);
      refs.current[focusIndex]?.focus();
      return;
    }

    setDigit(index, digits);

    if (index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3">
      {chars.map((char, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={4}
          aria-label={`Digit ${index + 1}`}
          className={`h-16 w-14 rounded-2xl border-2 bg-spill-50/70 text-center font-display text-2xl font-bold text-ink-900 transition focus:bg-white focus:ring-4 focus:ring-sky-100 dark:bg-spill-950/60 dark:text-white dark:focus:ring-sky-900/40 ${
            error
              ? 'border-rose-400 dark:border-rose-500'
              : 'border-spill-200 focus:border-sky-500 dark:border-spill-700 dark:focus:border-sky-400'
          }`}
          value={char.trim()}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();

              if (char.trim()) {
                setDigit(index, '');
              } else if (index > 0) {
                setDigit(index - 1, '');
                refs.current[index - 1]?.focus();
              }
            }

            if (e.key === 'ArrowLeft' && index > 0) {
              refs.current[index - 1]?.focus();
            }

            if (e.key === 'ArrowRight' && index < 3) {
              refs.current[index + 1]?.focus();
            }
          }}
          onFocus={(e) => e.target.select()}
          autoFocus={index === 0 && !value}
          required
        />
      ))}
    </div>
  );
}

export default OtpInput;
