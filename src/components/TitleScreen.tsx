import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

interface TitleScreenProps {
  onStartGame: (token: string, mayorHandle: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const [customMayorName, setCustomMayorName] = useState('mayor_tashkent');
  const [authBusy, setAuthBusy] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleQuickStart = () => {
    const clean =
      customMayorName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
      'mayor_tashkent';
    onStartGame(`commander-session:${clean}`, clean);
  };

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const handle =
        cred.user.displayName?.toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
        cred.user.email?.split('@')[0] ||
        'mayor';
      onStartGame(idToken, handle);
    } catch {
      // Fallback to Commander session if popup is blocked in headless/iframe
      handleQuickStart();
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0D1821] select-none flex items-center">
      {/* Key Art Backdrop with CSS Fallback */}
      <div className="absolute inset-0 z-0">
        {!imgFailed ? (
          <img
            src="/src/assets/images/title_bg_1794314344430.jpg"
            alt="Aurelia sunlit eco-metropolis skyline with suspension bridges"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-right"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0B151E] via-[#132A38] to-[#1D4E4A]" />
        )}
        {/* Measured left contrast scrim over the 40% negative space */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(9, 17, 24, 0.94) 0%, rgba(9, 17, 24, 0.84) 38%, rgba(9, 17, 24, 0.22) 72%, rgba(9, 17, 24, 0.05) 100%)',
          }}
        />
      </div>

      {/* Left Negative-Space Composition */}
      <div className="relative z-10 w-full max-w-xl px-8 sm:px-14 py-10 flex flex-col items-start gap-6">
        {/* Custom Inline SVG Title Lockup & Crest */}
        <div className="flex flex-col items-start gap-3">
          <svg
            viewBox="0 0 420 88"
            className="w-80 sm:w-96 h-auto drop-shadow"
            role="img"
            aria-label="Aurelia Idle City Builder Emblem"
          >
            {/* Architectural Crest */}
            <g transform="translate(4, 6)">
              <polygon
                points="36,4 68,20 68,56 36,72 4,56 4,20"
                fill="#112230"
                stroke="#F59E0B"
                strokeWidth="2.5"
              />
              <rect x="20" y="28" width="10" height="30" fill="#38BDF8" />
              <rect x="33" y="18" width="12" height="40" fill="#F59E0B" />
              <rect x="48" y="34" width="8" height="24" fill="#10B981" />
              <path
                d="M12 58 Q36 44 60 58"
                fill="none"
                stroke="#F8FAFC"
                strokeWidth="2.5"
              />
            </g>
            {/* Display Lockup Text */}
            <text
              x="86"
              y="44"
              fill="#F8FAFC"
              fontFamily="Outfit, sans-serif"
              fontWeight="700"
              fontSize="38"
              letterSpacing="3"
            >
              AURELIA
            </text>
            <text
              x="88"
              y="68"
              fill="#F59E0B"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="600"
              fontSize="13"
              letterSpacing="3"
            >
              IDLE METROPOLIS ARCHITECT
            </text>
          </svg>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-md">
            Balance residential workforce capacity, high-yield commercial towers,
            and botanical ecology while forging up to 9 inter-city suspension
            bridges for a +45% tourism revenue boost.
          </p>
        </div>

        {/* Mayor Handle Input & Start Handshake Controls (<= 3 menu actions) */}
        <div className="w-full max-w-md flex flex-col gap-3 bg-[#101E2B]/95 border border-slate-700/70 rounded-xl p-5 shadow-2xl">
          <label
            htmlFor="mayor-handle-input"
            className="text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            Mayor Handle (City Charter Identity)
          </label>
          <input
            id="mayor-handle-input"
            type="text"
            value={customMayorName}
            onChange={(e) => setCustomMayorName(e.target.value)}
            placeholder="mayor_tashkent"
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#09121A] border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-400"
          />

          <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                handleQuickStart();
              }}
              className="flex-1 py-3 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-semibold text-sm tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
            >
              Launch City Charter
            </button>

            <button
              type="button"
              disabled={authBusy}
              onClick={(e) => {
                e.currentTarget.blur();
                handleGoogleSignIn();
              }}
              className="py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {authBusy ? 'Connecting...' : 'Google Sign-In'}
            </button>
          </div>
        </div>
      </div>

      {/* Single flat borderless control hint line in bottom safe margin */}
      <div className="absolute bottom-5 left-8 sm:left-14 z-10 text-xs text-slate-300/90 font-mono tracking-wide">
        Click Tile Build or Upgrade · B Bridges · L Leaderboards · C Step 1-4 Blueprints · P Pause
      </div>
    </div>
  );
};
