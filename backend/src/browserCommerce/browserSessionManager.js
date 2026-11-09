import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";
import { assertDomainAllowed, attachNavigationGuard } from "./securityEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Windows Edge & Chrome candidate paths (Prefer user's primary browser: Microsoft Edge)
const BROWSER_EXECUTABLE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

export function findBrowserExecutable() {
  for (const p of BROWSER_EXECUTABLE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Session status enum
 */
export const SessionStatus = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  AUTHENTICATED: "AUTHENTICATED",
  EXPIRED: "EXPIRED",
  BUSY: "BUSY",
  ERROR: "ERROR",
};

/**
 * Manages isolated, persistent browser profiles and sessions per user & merchant.
 * Ensures zero leakage of credentials, tokens, or raw cookies.
 */
export class BrowserSessionManager {
  constructor(baseProfileDir) {
    this.baseProfileDir =
      baseProfileDir || path.resolve(__dirname, "../../../.agent_browser_profiles");
    if (!fs.existsSync(this.baseProfileDir)) {
      fs.mkdirSync(this.baseProfileDir, { recursive: true });
    }

    // In-memory active session registry: sessionId -> { context, page, userId, merchant, createdAt, lastActive }
    this.activeSessions = new Map();
  }

  /**
   * Generates a deterministic hash for isolated profile directory per user & merchant.
   */
  getProfilePath(userId, merchant) {
    const cleanUser = crypto.createHash("sha256").update(userId || "default_user").digest("hex").slice(0, 16);
    const cleanMerchant = (merchant || "generic").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const dir = path.join(this.baseProfileDir, cleanUser, cleanMerchant);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Acquires or launches an isolated persistent browser session.
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.merchant - 'amazon' | 'zomato' | 'swiggy' | etc.
   * @param {boolean} [params.headless=false] - Default visible browser
   * @param {string[]} [params.allowedDomains]
   * @returns {Promise<{ sessionId: string, context: import('playwright-core').BrowserContext, page: import('playwright-core').Page }>}
   */
  async acquireSession({ userId = "user_default", merchant = "zomato", headless = false, allowedDomains }) {
    const sessionId = `${userId}_${merchant}_${Date.now()}`;
    const profilePath = this.getProfilePath(userId, merchant);
    const executablePath = findBrowserExecutable();

    if (!executablePath) {
      throw new Error("No installed Google Chrome or Microsoft Edge browser executable found on system.");
    }

    // Clean up stale lockfiles if present from previous interrupted runs
    const lockfilePath = path.join(profilePath, "lockfile");
    if (fs.existsSync(lockfilePath)) {
      try {
        fs.unlinkSync(lockfilePath);
      } catch (_) {}
    }

    let context;
    try {
      context = await chromium.launchPersistentContext(profilePath, {
        executablePath,
        headless,
        viewport: { width: 1280, height: 850 },
        args: [
          "--start-maximized",
          "--new-window",
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
        ],
      });
    } catch (err) {
      try {
        // If profile is temporarily locked, launch with unique fallback dir
        const fallbackDir = path.join(profilePath, `fallback_${Date.now()}`);
        fs.mkdirSync(fallbackDir, { recursive: true });
        context = await chromium.launchPersistentContext(fallbackDir, {
          executablePath,
          headless,
          viewport: { width: 1280, height: 850 },
          args: [
            "--start-maximized",
            "--new-window",
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
          ],
        });
      } catch (fbErr) {
        // Fallback to launch
        const browser = await chromium.launch({
          executablePath,
          headless,
          args: [
            "--start-maximized",
            "--new-window",
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
          ],
        });
        context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
      }
    }

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.bringToFront().catch(() => {});

    // Attach security engine navigation guard to block unauthorized domain jumps
    await attachNavigationGuard(page, allowedDomains, (violation) => {
      console.warn(`[SecurityGuard] Blocked unauthorized navigation: ${violation.url}`);
    });

    const sessionRecord = {
      sessionId,
      userId,
      merchant,
      context,
      page,
      profilePath,
      createdAt: new Date(),
      lastActive: new Date(),
    };

    this.activeSessions.set(sessionId, sessionRecord);
    return { sessionId, context, page };
  }

  /**
   * Evaluates if the merchant session has an active, authenticated user login.
   * Checks for account markers without extracting sensitive credentials.
   * @param {import('playwright-core').Page} page
   * @param {string} merchant
   * @returns {Promise<{ status: string, userGreeting?: string }>}
   */
  async checkSessionAuth(page, merchant) {
    const m = merchant.toLowerCase();

    try {
      if (m.includes("amazon")) {
        // Amazon login indicators
        const accountNav = page.locator("#nav-link-accountList-nav-line-1");
        if ((await accountNav.count()) > 0) {
          const text = (await accountNav.innerText()).trim();
          if (text.toLowerCase().includes("hello, sign in") || text.toLowerCase().includes("sign in")) {
            return { status: SessionStatus.UNAUTHENTICATED };
          }
          return { status: SessionStatus.AUTHENTICATED, userGreeting: text };
        }
      } else if (m.includes("zomato")) {
        // Zomato login indicators
        const userAvatar = page.locator('header img[alt*="profile"], header div:has-text("Log out"), div[class*="user-avatar"]');
        const loginBtn = page.locator('header button:has-text("Log in"), header a:has-text("Log in")');

        if ((await loginBtn.count()) > 0 && (await loginBtn.first().isVisible())) {
          return { status: SessionStatus.UNAUTHENTICATED };
        }
        if ((await userAvatar.count()) > 0) {
          return { status: SessionStatus.AUTHENTICATED };
        }
      }

      // Default fallback: check if page URL contains 'login' or 'signin'
      const currentUrl = page.url();
      if (/login|signin|auth/i.test(currentUrl)) {
        return { status: SessionStatus.UNAUTHENTICATED };
      }

      return { status: SessionStatus.AUTHENTICATED };
    } catch (err) {
      return { status: SessionStatus.ERROR, error: err.message };
    }
  }

  /**
   * Retrieves an active session by its ID.
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Gracefully closes an active session.
   */
  async closeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    try {
      await session.context.close();
    } catch (err) {
      // Ignore if already closed
    }

    this.activeSessions.delete(sessionId);
    return true;
  }

  /**
   * Cleans up all active sessions on server shutdown.
   */
  async closeAll() {
    for (const [id, session] of this.activeSessions.entries()) {
      try {
        await session.context.close();
      } catch (err) {}
    }
    this.activeSessions.clear();
  }
}

export const defaultSessionManager = new BrowserSessionManager();

