import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import * as bi from 'react-icons/bi';
import { v4 as uuidv4 } from 'uuid';
import { setModal } from '../../../redux/features/modal';
import { setPage } from '../../../redux/features/page';
import { setRefreshInbox } from '../../../redux/features/chore';
import { BrandMark } from '../../brand';

function Header({ setSearch }) {
  const dispatch = useDispatch();
  const inputTimeout = useRef(null);

  return (
    <div className="grid items-center z-10 bg-white dark:bg-spill-900 dark:text-white/90 border-b border-spill-200/70 dark:border-spill-800">
      <div className="h-16 pl-4 pr-2 flex gap-5 justify-between items-center">
        {/* brand name */}
        <div className="flex items-center gap-2.5">
          <BrandMark size={32} />
          <h1 className="text-xl font-bold font-display tracking-tight text-ink-900 dark:text-white">
            MZ <span className="text-burgundy-700 dark:text-burgundy-400">chat</span>
          </h1>
        </div>
        <div className="flex">
          {[
            {
              target: 'refresh-inbox',
              icon: <bi.BiRotateRight />,
              action() {
                dispatch(setRefreshInbox(uuidv4()));
              },
            },
            {
              target: 'contact',
              icon: <bi.BiMessageSquareDots />,
              action() {
                dispatch(setPage({ target: 'contact' }));
              },
            },
            {
              target: 'minibox',
              icon: <bi.BiDotsVerticalRounded />,
              action(e) {
                e.stopPropagation();
                dispatch(setModal({ target: 'minibox' }));
              },
            },
          ].map((elem) => (
            <button
              type="button"
              key={elem.target}
              className="p-2 rounded-full text-spill-600 hover:text-burgundy-700 hover:bg-burgundy-50 dark:hover:bg-spill-800 dark:text-white/80"
              onClick={elem.action}
            >
              {elem.icon}
            </button>
          ))}
        </div>
      </div>
      {/* search bar */}
      <div className="px-4 pb-3">
        <label
          htmlFor="search"
          className="flex gap-2.5 items-center bg-spill-50 dark:bg-spill-800/80 px-3 py-2 rounded-xl border border-spill-200/80 dark:border-spill-700 focus-within:border-burgundy-500 focus-within:ring-2 focus-within:ring-burgundy-100 transition"
        >
          <bi.BiSearchAlt className="text-spill-400 text-lg" />
          <input
            type="text"
            name="search"
            id="search"
            className="w-full text-sm text-ink-900 dark:text-white placeholder:text-spill-400"
            placeholder="Search chats..."
            onChange={(e) => {
              clearTimeout(inputTimeout.current);

              inputTimeout.current = setTimeout(() => {
                if (e.target.value.length < 3) {
                  setSearch('');
                } else {
                  setSearch(e.target.value);
                }
              }, 1000);
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default Header;
