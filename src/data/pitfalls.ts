export const pitfallsDocs = `# Common Pitfalls and Solutions — Trimble Connect Extensions

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| Recharts Tooltip crash | White screen on chart hover | Use a custom absolute HTML tooltip instead of the built-in Recharts Tooltip |
| HMR not updating | Changes not visible after save | Force a page reload instead of HMR update |
| tsc fails on import.meta.env | TS2339: Property 'env' does not exist | Create src/vite-env.d.ts with /// <reference types="vite/client" /> |
| tsc fails on import './index.css' | TS2307: Cannot find module | Normal with Vite — vite build works. Ignore for tsc --noEmit |
| Bundle too large (>1MB) | Slow loading in the iframe | Code splitting (lazy tabs) + manualChunks. Target: core < 300KB gzip |
| setObjectState incorrect format | Silent error, nothing changes | The selector must be { modelObjectIds: [{ modelId, objectRuntimeIds }] } and NOT { modelId, objectRuntimeIds } |
| isolateEntities format | Error or unexpected behavior | The parameter is [{ modelObjectIds: [...] }] — an array of objects containing modelObjectIds |
| Drag & Drop in narrow panel | Erratic behavior | Use the native HTML5 API instead of a heavy library |
| Inline PDF in extension | New tab opens instead of inline display | Use <iframe src={pdfUrl} /> for inline display |
| BCF API URLs | 404 or connection refused | BCF URLs (openXX) are DIFFERENT from Core API URLs (appXX) |
| Expired token | 401 Unauthorized | In integrated mode, listen for extension.accessToken. In standalone, implement refresh |
| CORS blocked | API calls fail from the iframe | Use a backend proxy |
| Markup vs viewer coordinates | Markups incorrectly positioned | Markups in MILLIMETERS, viewer in METERS. Multiply by 1000 |
| getObjectProperties timeout | Timeout on large models | Batch in groups of 50 runtimeIds max |

## Dark Mode in the TC iframe

Trimble Connect does not directly provide the theme to the iframe. The extension must manage its own dark mode:

\`\`\`typescript
function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: useCallback(() => setDark(d => !d), []) };
}
\`\`\`

## Validated Stack for 3D Viewer Extension

| Layer | Choice | Version | Justification |
|-------|--------|---------|---------------|
| Framework | React | 19.x | Rich ecosystem, native lazy loading |
| Build | Vite | 6.x | Fast build, reliable HMR |
| CSS | Tailwind CSS | 4.x | Utility-first, native dark mode |
| Charts | recharts | 2.x | Chart component recommended by shadcn/ui |
| PDF Export | jsPDF + html2canvas | 4.x / 1.4.x | Works in the TC iframe |
| Icons | lucide-react | 0.4x | Tree-shakeable, consistent with shadcn/ui |
| Types | TypeScript | 5.7+ | Strict mode |
`;
