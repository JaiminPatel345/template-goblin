/**
 * External links and computed paths shared across the site. Keeping them in
 * one place means the navbar, footer, and CTAs never drift out of sync.
 */

/** GitHub repository. */
export const GITHUB_URL = 'https://github.com/JaiminPatel345/template-goblin'
/** Issue tracker — the source of truth for bugs and feature requests. */
export const ISSUES_URL = `${GITHUB_URL}/issues`
/** The published library on npm. */
export const NPM_URL = 'https://www.npmjs.com/package/template-goblin'
/** The visual builder package on npm. */
export const NPM_UI_URL = 'https://www.npmjs.com/package/template-goblin-ui'
/** Author profile (footer credit). */
export const AUTHOR_URL = 'https://github.com/JaiminPatel345'
/** Server-rendered stars count — zero JS, no GitHub API rate limits. */
export const STARS_BADGE =
  'https://img.shields.io/github/stars/JaiminPatel345/template-goblin?style=flat&logo=github&label=stars&color=2EE6A6'

/**
 * The React playground is a *separate* Vite app deployed as a sibling at
 * `<base>/playground/`. It must be reached with a real navigation (full page
 * load), never React Router — its bundle and base path are independent. In
 * local dev (`base` = `/`) this points at `/playground/`; run the UI dev
 * server separately to exercise it.
 */
export const PLAYGROUND_URL = `${import.meta.env.BASE_URL}playground/`
