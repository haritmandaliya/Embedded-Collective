import { Link } from 'react-router-dom'
import { ChipIcon } from './shared/ChipIcon'
import { CONTACT } from '../data/content'
import { useCommunity } from '../context/CommunityContext'
//import { useTheme } from '../context/ThemeContext'
//import { Sun, Moon } from 'lucide-react'

export function Footer() {
  const { user, setAuthModalOpen } = useCommunity()


  return (
    <footer className="relative bg-deep border-t border-red-core/20 py-12 px-6">
      {/* Laser scan line overlay */}
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="h-full w-24 bg-gradient-to-r from-transparent via-red-glow to-transparent blur-sm animate-[scan_6s_linear_infinite]"
        />
        <style>{`
          @keyframes scan {
            0% { transform: translateX(-100px); }
            100% { transform: translateX(100vw); }
          }
        `}</style>
      </div>

      <div className="max-w-content mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-10">
        {/* Col 1: PORTFOLIO */}
        <div className="lg:col-span-3">
          <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-red-core mb-4 border-l-2 border-red-core pl-2">
            PORTFOLIO
          </h4>
          <ul className="space-y-2 font-mono text-xs text-text-secondary">
            {[
              { label: 'About', href: '/#about' },
              { label: 'Skills', href: '/#skills' },
              { label: 'Experience', href: '/#experience' },
              { label: 'Education', href: '/#education' },
              { label: 'Training', href: '/#training' },
              { label: 'Projects', href: '/#projects' },
              { label: 'Achievements', href: '/#achievements' },
              { label: 'Contact', href: '/#contact' },
            ].map((link) => (
              <li key={link.label}>
                <a href={link.href} className="hover:text-red-glow transition-colors">
                  &gt; {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 2: COMMUNITY */}
        <div className="lg:col-span-3">
          <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-red-core mb-4 border-l-2 border-red-core pl-2">
            COMMUNITY
          </h4>
          <ul className="space-y-2 font-mono text-xs text-text-secondary">
            <li>
              <Link to="/community" className="hover:text-red-glow transition-colors">
                &gt; Feed
              </Link>
            </li>
            <li>
              <Link to="/community/ask" className="hover:text-red-glow transition-colors">
                &gt; Ask a Problem
              </Link>
            </li>
            <li>
              <Link to="/community/leaderboard" className="hover:text-red-glow transition-colors">
                &gt; Leaderboard
              </Link>
            </li>
            {!user ? (
              <>
                <li>
                  <button
                    onClick={() => setAuthModalOpen(true, 'signin')}
                    className="hover:text-red-glow transition-colors text-left"
                  >
                    &gt; Sign In
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setAuthModalOpen(true, 'signup')}
                    className="hover:text-red-glow transition-colors text-left"
                  >
                    &gt; Sign Up
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link to="/community/settings" className="hover:text-red-glow transition-colors">
                  &gt; Profile Settings
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Col 3: CONNECT */}
        <div className="lg:col-span-3">
          <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-red-core mb-4 border-l-2 border-red-core pl-2">
            CONNECT
          </h4>
          <ul className="space-y-2 font-mono text-xs text-text-secondary">
            <li>
              <a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-glow transition-colors"
              >
                &gt; LinkedIn
              </a>
            </li>
            <li>
              <a
                href={CONTACT.hackerrank}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-glow transition-colors"
              >
                &gt; HackerRank
              </a>
            </li>
            <li>
              <a
                href={CONTACT.leetcode}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-glow transition-colors"
              >
                &gt; LeetCode
              </a>
            </li>
            {CONTACT.github && (
              <li>
                <a
                  href={CONTACT.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-glow transition-colors"
                >
                  &gt; GitHub
                </a>
              </li>
            )}
            <li>
              <a href={`mailto:${CONTACT.email}`} className="hover:text-red-glow transition-colors">
                &gt; Email
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: IDENTITY (C struct pointer block) */}
        <div className="lg:col-span-3">
          <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-red-core mb-4 border-l-2 border-red-core pl-2">
            IDENTITY
          </h4>
          <div className="font-mono text-[11px] leading-relaxed p-3 rounded glass-card border border-red-core/10">
            <span className="text-red-core">struct</span> <span className="text-cyan-spark">Developer</span> {'{'}
            <div className="pl-4">
              <span className="text-red-core">char*</span> name = <span className="text-emerald-600 dark:text-emerald-400">"Harit Mandaliya"</span>;
              <br />
              <span className="text-red-core">char*</span> role = <span className="text-emerald-600 dark:text-emerald-400">"Embedded Systems"</span>;
              <br />
              <span className="text-red-core">int</span> status = <span className="text-emerald-600 dark:text-emerald-400">0x01</span>;
            </div>
            {'};'}
            <br />
            <span className="text-red-core">struct</span> <span className="text-cyan-spark">Developer</span>* dev = &amp;harit;
            <br />
            dev<span className="text-red-glow font-bold inline-block mx-0.5 animate-pulse">-&gt;</span>competence++;
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-content mx-auto border-t border-red-core/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ChipIcon size={20} />
          <p className="font-mono text-[10px] text-text-secondary">
            © 2026 | Built with passion for embedded engineering.
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* System Online Status */}
          <p className="font-mono text-[10px] text-green-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 status-dot" />
            SYSTEM ONLINE
          </p>
        </div>
      </div>
    </footer>
  )
}
