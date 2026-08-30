export default {
  plugins: {
    // Tailwind v4 moved its PostCSS integration to a separate package.
    // It vendor-prefixes internally (via Lightning CSS), so autoprefixer
    // is no longer needed alongside it.
    "@tailwindcss/postcss": {},
  },
}
