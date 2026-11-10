/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FoodDonation, UserRole } from './types';
import { storageAdapter } from './services/storageAdapter';
import { authService } from './services/authService';

// Common Components
import { RoleSwitcherBanner } from './components/common/RoleSwitcherBanner';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';

// Views
import { LandingPage } from './components/landing/LandingPage';
import { DonorDashboard } from './components/donor/DonorDashboard';
import { NgoDashboard } from './components/ngo/NgoDashboard';
import { VolunteerDashboard } from './components/volunteer/VolunteerDashboard';
import { WasteIntelligenceDashboard } from './components/intelligence/WasteIntelligenceDashboard';
import { FoodSafetyPage } from './components/safety/FoodSafetyPage';
import { ImpactView } from './components/impact/ImpactView';

// Modals
import { FoodSafetyInspectorModal } from './components/safety/FoodSafetyInspectorModal';
import { AuthModal } from './components/auth/AuthModal';

interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function App() {
  const [session, setSession] = useState(authService.getCurrentSession());
  const [currentView, setCurrentView] = useState<string>('landing');
  const [auditingDonation, setAuditingDonation] = useState<FoodDonation | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'signin' | 'register'>('signin');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Subscribe to storage mutations so UI remains 100% reactive across all components
  useEffect(() => {
    const unsubscribe = storageAdapter.subscribe(() => {
      setSession(authService.getCurrentSession());
    });
    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'public') {
      authService.signOut();
      setCurrentView('landing');
      showToast('Switched to Public Editorial view.', 'info');
    } else {
      authService.signInWithDemoPersona(role);
      if (role === 'donor') setCurrentView('donor_dashboard');
      if (role === 'ngo') setCurrentView('ngo_discovery');
      if (role === 'volunteer') setCurrentView('volunteer_dashboard');
      showToast(`Switched perspective to ${role.toUpperCase()} Portal.`, 'info');
    }
  };

  const handleSignOut = () => {
    authService.signOut();
    setCurrentView('landing');
    showToast('Signed out successfully.', 'info');
  };

  const handleOpenAuth = (tab: 'signin' | 'register' = 'signin') => {
    setAuthModalInitialTab(tab);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (role: UserRole) => {
    if (role === 'donor') setCurrentView('donor_dashboard');
    else if (role === 'ngo') setCurrentView('ngo_discovery');
    else if (role === 'volunteer') setCurrentView('volunteer_dashboard');
    else setCurrentView('landing');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F0] text-[#252923]">
      {/* 1. Evaluation Sandbox Perspective Switcher */}
      <RoleSwitcherBanner
        currentRole={session.role}
        onSelectRole={handleRoleSelect}
        activeUserName={session.profile?.organizationName || session.profile?.fullName}
        onShowToast={showToast}
      />

      {/* 2. Primary 3-Zone Top Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={handleOpenAuth}
        currentRole={session.role}
        userName={session.profile?.fullName}
        onSignOut={handleSignOut}
      />

      {/* 3. Main View Port */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={(view) => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentView === 'how_it_works' && (
          <div className="space-y-12">
            <LandingPage
              onNavigate={(view) => {
                setCurrentView(view);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAuth={handleOpenAuth}
            />
          </div>
        )}

        {currentView === 'donor_dashboard' && (
          <DonorDashboard
            user={session.profile}
            onViewSafetyAudit={(donation) => setAuditingDonation(donation)}
            onShowToast={showToast}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'ngo_discovery' && (
          <NgoDashboard
            user={session.profile}
            onViewSafetyAudit={(donation) => setAuditingDonation(donation)}
            onShowToast={showToast}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'volunteer_dashboard' && (
          <VolunteerDashboard
            user={session.profile}
            onViewSafetyAudit={(donation) => setAuditingDonation(donation)}
            onShowToast={showToast}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'intelligence' && <WasteIntelligenceDashboard />}

        {currentView === 'safety' && <FoodSafetyPage />}

        {currentView === 'impact' && <ImpactView />}
      </main>

      {/* 4. Footer */}
      <Footer
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Food Safety Audit Modal */}
      <FoodSafetyInspectorModal
        donation={auditingDonation}
        onClose={() => setAuditingDonation(null)}
      />

      {/* Real Auth / Registration Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalInitialTab}
        onClose={() => setAuthModalOpen(false)}
        onShowToast={showToast}
        onAuthenticated={handleAuthenticated}
      />

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border text-xs font-medium flex items-center justify-between gap-3 transition-all transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-[#183D2B] text-white border-[#2A523C]'
                : toast.type === 'error'
                ? 'bg-red-800 text-white border-red-900'
                : toast.type === 'warning'
                ? 'bg-[#C77A54] text-white border-[#a35d3b]'
                : 'bg-[#252923] text-white border-[#3d4239]'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
