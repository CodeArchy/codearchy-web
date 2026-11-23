import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@codearchy/ui/styles.css';
import './app.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);

// Offline shell + update prompt (no inline script, so the CSP stays strict).
const updateSW = registerSW({
    onNeedRefresh() {
        const bar = document.createElement('div');
        bar.className = 'update-bar';
        bar.setAttribute('role', 'status');
        bar.textContent = 'A new version of CodeArchy is available. ';
        const reload = document.createElement('button');
        reload.type = 'button';
        reload.textContent = 'Reload';
        reload.onclick = () => void updateSW(true);
        bar.append(reload);
        document.body.append(bar);
    },
});
