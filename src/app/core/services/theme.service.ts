import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';

export type ThemeId = 'light' | 'dark' | 'ocean' | 'forest';
export type ThemePreference = ThemeId | 'system';

export interface ThemeOption {
  id: ThemePreference;
  label: string;
  description: string;
  /** [surface, brand, accent] - used to draw the swatch in the picker */
  swatch: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'system', label: 'System', description: 'Follow your device setting', swatch: ['#f6f7f9', '#1e3a5f', '#161f2c'] },
  { id: 'light', label: 'Light', description: 'Classic navy on white', swatch: ['#ffffff', '#1e3a5f', '#2f6fde'] },
  { id: 'dark', label: 'Dark', description: 'Easy on the eyes at night', swatch: ['#161f2c', '#3d73c4', '#5b93f0'] },
  { id: 'ocean', label: 'Ocean', description: 'Calm teal tones', swatch: ['#ffffff', '#0f5e66', '#0e9f9e'] },
  { id: 'forest', label: 'Forest', description: 'Fresh green tones', swatch: ['#ffffff', '#1f5135', '#2f9e63'] }
];

/** Theme of whoever used this browser last - applied on the login page and by the boot script in index.html. */
export const LAST_THEME_KEY = 'ffm_theme';
const USER_THEME_PREFIX = 'ffm_theme_user_';

const VALID = new Set<string>(THEME_OPTIONS.map((t) => t.id));

/**
 * Application-wide theme. Writes `data-theme` on <html>; every colour in the app
 * comes from CSS custom properties defined per theme in styles.scss, so all modules
 * pick it up without per-component code.
 *
 * Preferences are saved per user (keyed by userId) so they survive refresh,
 * navigation, logout/login and reopening the browser.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private auth = inject(AuthService);
  private media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  private systemDark = signal(!!this.media?.matches);
  readonly preference = signal<ThemePreference>(this.read(LAST_THEME_KEY) ?? 'light');
  readonly activeTheme = computed<ThemeId>(() => {
    const p = this.preference();
    return p === 'system' ? (this.systemDark() ? 'dark' : 'light') : p;
  });
  readonly options = THEME_OPTIONS;

  constructor() {
    this.media?.addEventListener?.('change', (e) => {
      this.systemDark.set(e.matches);
      this.apply();
    });

    // Switch to the signed-in user's saved theme whenever the user changes (login / app start).
    this.auth.currentUser$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((user) => {
      if (!user) return; // keep the last theme on the login screen after logout
      const saved = this.read(USER_THEME_PREFIX + user.userId);
      if (saved) {
        this.preference.set(saved);
      } else {
        // First login on this browser: adopt the current theme as the user's preference.
        this.write(USER_THEME_PREFIX + user.userId, this.preference());
      }
      this.write(LAST_THEME_KEY, this.preference());
      this.apply();
    });

    this.apply();
  }

  setTheme(pref: ThemePreference): void {
    if (!VALID.has(pref)) return;
    this.preference.set(pref);
    const user = this.auth.currentUser;
    if (user) this.write(USER_THEME_PREFIX + user.userId, pref);
    this.write(LAST_THEME_KEY, pref);
    this.apply();
  }

  private apply(): void {
    const root = this.document.documentElement;
    const theme = this.activeTheme();
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    const meta = this.document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#0b1119' : theme === 'ocean' ? '#083a40' : theme === 'forest' ? '#10301f' : '#0f2238');
  }

  private read(key: string): ThemePreference | null {
    try {
      const v = localStorage.getItem(key);
      return v && VALID.has(v) ? (v as ThemePreference) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable (private mode) - theme still applies for this session */
    }
  }
}
