/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // The app has no dark theme (see #78). Default 'media' strategy made the
  // handful of existing `dark:` classes in CalendarView react to the OS
  // color scheme while nothing else in the app did, producing a half-dark
  // UI. Scoping to a selector that's never applied keeps them inert until
  // real dark-mode support lands.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {},
  },
  plugins: [],
}

