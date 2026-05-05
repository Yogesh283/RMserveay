import './bootstrap';
import './i18n';
import { createRoot } from 'react-dom/client';
import Application from './Application.jsx';

const el = document.getElementById('app');

if (el) {
    createRoot(el).render(<Application />);
}
