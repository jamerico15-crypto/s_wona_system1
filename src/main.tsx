import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { ToastProvider } from '@/components/Toast';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { VisibilityProvider } from '@/contexts/VisibilityContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <LanguageProvider>
        <BrandingProvider>
          <AuthProvider>
            <ProjectProvider>
              <VisibilityProvider>
                <App />
              </VisibilityProvider>
            </ProjectProvider>
          </AuthProvider>
        </BrandingProvider>
      </LanguageProvider>
    </ToastProvider>
  </StrictMode>
);
