import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as bi from 'react-icons/bi';
import { setModal } from '../../redux/features/modal';
import config from '../../config';

const TERMS = [
  {
    title: 'Using MZ chat',
    body: 'MZ chat is a realtime messaging workspace. Keep your login details private and only share content you have the right to share.',
  },
  {
    title: 'Your data',
    body: 'Account details, contacts, messages and uploaded files are stored in the self-hosted database only for the purpose of running this workspace. Uploaded media is kept locally unless cloud storage is configured.',
  },
  {
    title: 'Passwords and privacy',
    body: 'Passwords are stored as one-way bcrypt hashes. Verification codes expire after ten minutes. Private profile details such as email and phone are only shown to accepted contacts.',
  },
  {
    title: 'Prototype notice',
    body: 'This application is provided as-is for demonstration and coursework. Back up anything important and do not use it as a production service without additional security, moderation and retention controls.',
  },
];

const LICENSES = [
  { name: 'React', license: 'MIT' },
  { name: 'Node.js / Express', license: 'MIT' },
  { name: 'MongoDB / Mongoose', license: 'SSPL / MIT' },
  { name: 'Socket.IO', license: 'MIT' },
  { name: 'Tailwind CSS', license: 'MIT' },
  { name: 'React Icons', license: 'MIT' },
  { name: 'MZ chat', license: 'GPL-3.0' },
];

function Feedback() {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      const previous = JSON.parse(localStorage.getItem('wp-feedback') || '[]');
      previous.push({ message: message.trim(), at: new Date().toISOString() });
      localStorage.setItem('wp-feedback', JSON.stringify(previous));
    } catch (error0) {
      // storing feedback is a convenience only
    }

    setSent(true);
    setMessage('');
  };

  if (sent) {
    return (
      <div className="py-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
          <bi.BiCheckCircle size={28} />
        </span>
        <p className="mt-4 font-display text-lg font-bold">Thanks for the feedback!</p>
        <p className="mt-1 text-sm text-ink-500 dark:text-white/50">
          It was saved locally for this prototype. You can also email{' '}
          <a href={`mailto:${config.brandEmail}`}>{config.brandEmail}</a>.
        </p>
        <button
          type="button"
          className="mt-5 rounded-xl border border-spill-200 px-4 py-2 text-sm font-bold hover:bg-spill-50 dark:border-spill-700 dark:hover:bg-spill-800"
          onClick={() => setSent(false)}
        >
          Send more feedback
        </button>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <p className="text-sm leading-relaxed text-ink-500 dark:text-white/50">
        Found a bug or have an idea for {config.brandName}? Tell us what happened
        and we will use it to improve the prototype.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        maxLength={600}
        required
        placeholder="What would you like us to know?"
        className="w-full resize-none rounded-xl border border-spill-200 bg-spill-50/60 p-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-spill-700 dark:bg-spill-950/60 dark:text-white dark:focus:border-sky-400 dark:focus:ring-sky-900/40"
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] text-ink-400 dark:text-white/35">
          {message.length}/600 characters
        </p>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-soft hover:brightness-110"
        >
          <bi.BiSend size={16} />
          Send feedback
        </button>
      </div>
    </form>
  );
}

function InfoModal() {
  const dispatch = useDispatch();
  const topic = useSelector((state) => state.modal.infoModal);

  const close = () => dispatch(setModal({ target: 'infoModal', data: false }));

  const meta = {
    feedback: {
      title: 'Send feedback',
      subtitle: 'Help shape the next version of MZ chat.',
      icon: <bi.BiMessageDetail />,
    },
    terms: {
      title: 'Terms & privacy',
      subtitle: 'How this prototype handles your account and content.',
      icon: <bi.BiCheckShield />,
    },
    license: {
      title: 'Licenses',
      subtitle: 'The open-source building blocks behind this project.',
      icon: <bi.BiInfoCircle />,
    },
  }[topic];

  return (
    <div
      aria-hidden
      className={`
        ${topic ? 'z-50 opacity-100' : '-z-50 opacity-0 delay-300'}
        absolute w-full h-full flex justify-center items-center bg-ink-950/70 p-4 backdrop-blur-sm transition
      `}
      onClick={close}
    >
      <div
        aria-hidden
        className={`${
          !topic && 'scale-95'
        } flex max-h-[85vh] w-[520px] max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-glow transition dark:bg-spill-800`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-spill-100 p-5 dark:border-spill-700">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
            {meta?.icon || <bi.BiInfoCircle />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold">
              {meta?.title || 'Information'}
            </h1>
            <p className="mt-0.5 text-xs text-ink-500 dark:text-white/45">
              {meta?.subtitle}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="rounded-full p-2 text-ink-500 hover:bg-spill-100 dark:text-white/60 dark:hover:bg-spill-700"
            onClick={close}
          >
            <bi.BiX />
          </button>
        </div>

        <div className="overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-spill-200 dark:scrollbar-thumb-spill-700">
          {topic === 'feedback' && <Feedback />}
          {topic === 'terms' && (
            <div className="grid gap-4">
              {TERMS.map((section) => (
                <div key={section.title}>
                  <p className="text-sm font-bold">{section.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-white/50">
                    {section.body}
                  </p>
                </div>
              ))}
              <p className="text-[11px] text-ink-400 dark:text-white/35">
                Last updated: November 2026. Questions? Email{' '}
                <a href={`mailto:${config.brandEmail}`}>{config.brandEmail}</a>.
              </p>
            </div>
          )}
          {topic === 'license' && (
            <div className="grid gap-4">
              <p className="text-sm leading-relaxed text-ink-500 dark:text-white/50">
                {config.brandName} is released under the GPL-3.0 license. It
                builds on these open-source projects:
              </p>
              <div className="overflow-hidden rounded-xl border border-spill-200 dark:border-spill-700">
                {LICENSES.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-4 border-0 border-b border-solid border-spill-100 px-4 py-2.5 text-sm last:border-b-0 dark:border-spill-700"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs font-bold text-ink-500 dark:text-white/45">
                      {item.license}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-ink-400 dark:text-white/35">
                Full license texts are available in the project repository and
                from each project website.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
