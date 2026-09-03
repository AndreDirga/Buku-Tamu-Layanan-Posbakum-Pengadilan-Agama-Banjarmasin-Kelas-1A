import React, { useState, useEffect } from 'react';
import { Visit, OfficerUser } from './types/posbakum';
import { 
  getStoredVisits, 
  subscribeToVisits,
  getAuthenticatedOfficer, 
  setAuthenticatedOfficer,
  deleteVisit,
  deleteMultipleVisits
} from './services/storageService';

// Public / Guest & Portal Components
import { CourtEmblem } from './components/common/CourtEmblem';
import { LiveClock } from './components/common/LiveClock';
import { RoleSelectionPortal } from './components/portal/RoleSelectionPortal';
import { GuestBookForm } from './components/guest/GuestBookForm';
import { SuccessReceipt } from './components/guest/SuccessReceipt';

// Admin / Petugas Components
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardOverview } from './components/admin/DashboardOverview';
import { VisitsList } from './components/admin/VisitsList';
import { StatisticsView } from './components/admin/StatisticsView';
import { ExportDataView } from './components/admin/ExportDataView';
import { QrCodeManager } from './components/admin/QrCodeManager';
import { SettingsAndLogs } from './components/admin/SettingsAndLogs';
import { VisitDetailModal } from './components/admin/VisitDetailModal';

import { ArrowLeft, Home } from 'lucide-react';

export default function App() {
  // Main view state: 'portal' | 'guest' | 'login' | 'admin'
  const [currentView, setCurrentView] = useState<'portal' | 'guest' | 'login' | 'admin'>('portal');
  
  // Guest submission success receipt state
  const [submittedVisit, setSubmittedVisit] = useState<Visit | null>(null);

  // Officer auth state
  const [currentOfficer, setCurrentOfficer] = useState<OfficerUser | null>(null);

  // Admin sub-menu state
  const [adminMenu, setAdminMenu] = useState<'dashboard' | 'visits' | 'statistics' | 'export' | 'qr' | 'settings'>('dashboard');

  // Selected visit for detail modal
  const [selectedVisitForModal, setSelectedVisitForModal] = useState<Visit | null>(null);

  // Visits in state
  const [visits, setVisits] = useState<Visit[]>([]);

  // Token from URL parameter if any
  const [activeQrToken, setActiveQrToken] = useState<string | undefined>(undefined);

  // Initial load & Firestore real-time sync
  useEffect(() => {
    // 1. Initial cached visits
    const loadedVisits = getStoredVisits();
    setVisits(loadedVisits);

    // 2. Real-time Cloud Firestore subscription
    const unsubscribe = subscribeToVisits((cloudVisits) => {
      setVisits(cloudVisits);
    });

    const officer = getAuthenticatedOfficer();
    if (officer) {
      setCurrentOfficer(officer);
    }

    // Check URL parameters for mode or token
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      const tokenParam = params.get('t');

      if (tokenParam) {
        setActiveQrToken(tokenParam);
        setCurrentView('guest');
      }

      if (modeParam === 'admin') {
        if (officer) {
          setCurrentView('admin');
        } else {
          setCurrentView('login');
        }
      } else if (modeParam === 'guest') {
        setCurrentView('guest');
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshVisits = () => {
    setVisits(getStoredVisits());
  };

  const handleDeleteVisit = async (visitId: string) => {
    await deleteVisit(visitId, currentOfficer?.name || 'Admin');
    refreshVisits();
    if (selectedVisitForModal?.id === visitId) {
      setSelectedVisitForModal(null);
    }
  };

  const handleDeleteMultipleVisits = async (visitIds: string[]) => {
    await deleteMultipleVisits(visitIds, currentOfficer?.name || 'Admin');
    refreshVisits();
    if (selectedVisitForModal && visitIds.includes(selectedVisitForModal.id)) {
      setSelectedVisitForModal(null);
    }
  };

  // Guest Form submission success
  const handleGuestSubmitSuccess = (newVisit: Visit) => {
    setSubmittedVisit(newVisit);
    refreshVisits();
  };

  const handleResetGuestForm = () => {
    setSubmittedVisit(null);
  };

  // Switch to Petugas Login or Admin Panel from Portal
  const handleSelectOfficer = () => {
    if (currentOfficer) {
      setCurrentView('admin');
    } else {
      setCurrentView('login');
    }
  };

  // Logout
  const handleLogout = () => {
    setCurrentOfficer(null);
    setCurrentView('portal');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-600 selection:text-white">
      {/* 1. INITIAL ROLE SELECTION PORTAL VIEW */}
      {currentView === 'portal' && (
        <RoleSelectionPortal
          onSelectGuest={() => setCurrentView('guest')}
          onSelectOfficer={handleSelectOfficer}
        />
      )}

      {/* 2. PUBLIC GUESTBOOK VIEW (No officer login link/icon) */}
      {currentView === 'guest' && (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col justify-between">
          {/* Top Bar with Court Header & Clean Back to Portal */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
              <CourtEmblem size="sm" showSubtitle={true} />

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block">
                  <LiveClock variant="inline" />
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentView('portal')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition shadow-2xs"
                >
                  <Home className="w-3.5 h-3.5 text-slate-500" />
                  <span>Menu Awal</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Guest Content */}
          <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {submittedVisit ? (
              <SuccessReceipt
                visit={submittedVisit}
                onReset={handleResetGuestForm}
                onBackToPortal={() => {
                  setSubmittedVisit(null);
                  setCurrentView('portal');
                }}
              />
            ) : (
              <GuestBookForm
                qrTokenParam={activeQrToken}
                onSuccess={handleGuestSubmitSuccess}
                onBackToPortal={() => setCurrentView('portal')}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-1">
            <div className="font-bold text-slate-700">
              POS BANTUAN HUKUM (POSBAKUM)
            </div>
            <div className="text-[11px] text-slate-400">
              Sistem Informasi & Buku Tamu Digital Layanan Bantuan Hukum
            </div>
          </footer>
        </div>
      )}

      {/* 3. OFFICER LOGIN VIEW */}
      {currentView === 'login' && (
        <AdminLogin
          onLoginSuccess={(officer) => {
            setCurrentOfficer(officer);
            setCurrentView('admin');
          }}
          onBackToGuest={() => setCurrentView('portal')}
        />
      )}

      {/* 4. OFFICER PORTAL / DASHBOARD VIEW */}
      {currentView === 'admin' && currentOfficer && (
        <AdminLayout
          currentOfficer={currentOfficer}
          activeMenu={adminMenu}
          onMenuChange={(menu) => setAdminMenu(menu)}
          onLogout={handleLogout}
          onOpenPublicGuestbook={() => setCurrentView('guest')}
          onViewDetailVisit={(v) => setSelectedVisitForModal(v)}
        >
          {adminMenu === 'dashboard' && (
            <DashboardOverview
              visits={visits}
              onViewDetail={(v) => setSelectedVisitForModal(v)}
              onNavigateToVisits={() => setAdminMenu('visits')}
              onNavigateToStats={() => setAdminMenu('statistics')}
              onNavigateToExport={() => setAdminMenu('export')}
              onNavigateToQr={() => setAdminMenu('qr')}
            />
          )}

          {adminMenu === 'visits' && (
            <VisitsList
              visits={visits}
              onViewDetail={(v) => setSelectedVisitForModal(v)}
              onNavigateToExport={() => setAdminMenu('export')}
              onDeleteVisit={handleDeleteVisit}
              onDeleteMultipleVisits={handleDeleteMultipleVisits}
            />
          )}

          {adminMenu === 'statistics' && (
            <StatisticsView visits={visits} />
          )}

          {adminMenu === 'export' && (
            <ExportDataView visits={visits} />
          )}

          {adminMenu === 'qr' && (
            <QrCodeManager
              onOpenGuestWithToken={(token) => {
                setActiveQrToken(token);
                setCurrentView('guest');
              }}
            />
          )}

          {adminMenu === 'settings' && (
            <SettingsAndLogs onDataReset={refreshVisits} />
          )}

          {/* Modal Detail Kunjungan */}
          {selectedVisitForModal && (
            <VisitDetailModal
              visit={selectedVisitForModal}
              onClose={() => setSelectedVisitForModal(null)}
              onVisitUpdated={(updated) => {
                setSelectedVisitForModal(updated);
                refreshVisits();
              }}
              onDeleteVisit={handleDeleteVisit}
            />
          )}
        </AdminLayout>
      )}
    </div>
  );
}
