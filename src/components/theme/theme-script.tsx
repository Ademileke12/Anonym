/**
 * Inline script to apply theme before paint (avoids flash of wrong theme).
 * Keep STORAGE_KEY in sync with theme-provider.
 */
export function ThemeScript() {
  const code = `
(function () {
  try {
    var k = 'anonym-theme';
    var t = localStorage.getItem(k);
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = t === 'dark' || (t !== 'light' && prefersDark);
    var root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`.replace(/\n/g, "");

  return (
    <script
      id="anonym-theme-script"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
