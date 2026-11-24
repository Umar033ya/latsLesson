import { loadLanguage } from './i18n';

void loadLanguage().then(() => import('./main'));
