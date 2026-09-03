import React, { useState, useEffect } from 'react';
import { CourtEmblem, PaBjmLogoIcon } from '../common/CourtEmblem';
import { LiveClock } from '../common/LiveClock';
import { OfficerUser } from '../../types/posbakum';
import { setAuthenticatedOfficer, logActivity } from '../../services/storageService';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  FileSpreadsheet, 
  QrCode, 
  Settings, 
  LogOut, 
  ExternalLink, 
  Menu, 
  X, 
  ShieldCheck,
  ChevronDown,
  UserCheck,
  Building2,
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Visit } from '../../types/posbakum';
import { 
  subscribeToNewVisits, 
  broadcastNewVisit, 
  playNotificationChime, 
  getNotificationSoundEnabled, 
  setNotificationSoundEnabled 
} from '../../services/notificationService';
import { NewVisitNotificationPopup } from './NewVisitNotificationPopup';

interface AdminLayoutProps {
  currentOfficer: OfficerUser;
  activeMenu: 'dashboard' | 'visits' | 'statistics' | 'export' | 'qr' | 'settings';
  onMenuChange: (menu: 'dashboard' | 'visits' | 'statistics' | 'export' | 'qr' | 'settings') => void;
  onLogout: () => void;
  onOpenPublicGuestbook: () => void;
  onViewDetailVisit?: (visit: Visit) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentOfficer,
  activeMenu,
  onMenuChange,
  onLogout,
  onOpenPublicGuestbook,
  onViewDetailVisit,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Notification popup & queue states
  const [notificationQueue, setNotificationQueue] = useState<Visit[]>([]);
  const [currentPopupVisit, setCurrentPopupVisit] = useState<Visit | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<Visit[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(getNotificationSoundEnabled());

  // Listen to incoming visits in real-time (cross-tab, Firestore, and same-window)
  useEffect(() => {
    const unsubscribe = subscribeToNewVisits((newVisit) => {
      // Add to history list
      setNotificationHistory((prev) => [newVisit, ...prev.filter((v) => v.id !== newVisit.id)].slice(0, 25));
      setUnreadCount((prev) => prev + 1);

      // Add to popup queue
      setNotificationQueue((prev) => {
        if (prev.some((v) => v.id === newVisit.id) || currentPopupVisit?.id === newVisit.id) {
          return prev;
        }
        return [...prev, newVisit];
      });
    });

    return unsubscribe;
  }, [currentPopupVisit]);

  // Process queue into current popup
  useEffect(() => {
    if (!currentPopupVisit && notificationQueue.length > 0) {
      const [nextVisit, ...remaining] = notificationQueue;
      setCurrentPopupVisit(nextVisit);
      setNotificationQueue(remaining);
    }
  }, [currentPopupVisit, notificationQueue]);

  const handleDismissCurrentPopup = () => {
    setCurrentPopupVisit(null);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setNotificationSoundEnabled(next);
    if (next) {
      playNotificationChime();
    }
  };

  const handleClearNotifications = () => {
    setUnreadCount(0);
  };

  // Test notification helper for admin to verify
  const handleTriggerTestNotification = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    
    const sampleVisit: Visit = {
      id: `simulasi-${Date.now()}`,
      visitNumber: `KJG-${dateStr}-SIMULASI`,
      visitedAt: now.toISOString(),
      dateDisplay: 'Hari Ini',
      timeDisplay: `${hours}:${minutes} WITA`,
      name: 'Hj. Siti Aisyah, S.Pd.',
      ktpAddress: 'Jl. Ahmad Yani Km. 4.5 No. 18, RT 012/RW 003, Banjarmasin Timur',
      domicileAddress: 'Jl. Ahmad Yani Km. 4.5 No. 18, RT 012/RW 003, Banjarmasin Timur',
      domicileSameAsKtp: true,
      email: 'sitiaisyah@gmail.com',
      whatsapp: '081255551234',
      occupation: 'Guru / Tenaga Pendidik',
      caseCategory: 'Perdata Gugatan',
      caseType: 'Gugatan Perceraian (Cerai Gugat)',
      selfieUrl: '',
      selfieFileName: '',
      signatureUrl: '',
      signatureFileName: '',
      status: 'Menunggu',
      createdAt: now.toISOString(),
    };

    broadcastNewVisit(sampleVisit);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'visits', label: 'Data Kunjungan', icon: Users },
    { id: 'statistics', label: 'Statistik & Tren', icon: BarChart3 },
    { id: 'export', label: 'Export & Google Sheets', icon: FileSpreadsheet },
    { id: 'qr', label: 'QR Code Petugas', icon: QrCode },
    { id: 'settings', label: 'Pengaturan & Log', icon: Settings },
  ] as const;

  const handleSelectMenu = (id: typeof activeMenu) => {
    onMenuChange(id);
    setIsMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    logActivity({
      userId: currentOfficer.id,
      userName: currentOfficer.name,
      userRole: currentOfficer.role,
      action: 'LOGOUT',
      description: `Petugas ${currentOfficer.name} berhasil keluar (logout)`,
      badgeColor: 'amber',
    });
    setAuthenticatedOfficer(null);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col font-sans text-slate-900 antialiased text-xs">
      {/* Top Header Bar - High Density */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 h-13 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2.5">
              <PaBjmLogoIcon sizeClass="w-8 h-8" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Portal Petugas
                </div>
                <div className="font-extrabold text-sm text-slate-100">
                  POS BANTUAN HUKUM (POSBAKUM)
                </div>
              </div>
            </div>
          </div>

          {/* Right Header Elements */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 border border-slate-700/70 rounded-lg text-slate-300 text-[11px]">
              <LiveClock variant="inline" />
            </div>

            {/* Switch to Public Form */}
            <button
              type="button"
              onClick={onOpenPublicGuestbook}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-lg text-[11px] font-bold text-emerald-300 transition"
              title="Buka Form Buku Tamu Publik"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Form Pengunjung</span>
            </button>

            {/* Real-time Notification Bell Popover */}
            <div className="relative">
              <button
                type="button"
                id="btn-admin-notifications-bell"
                onClick={() => {
                  setShowNotificationsDropdown(!showNotificationsDropdown);
                  if (!showNotificationsDropdown) {
                    setUnreadCount(0);
                  }
                }}
                className={`relative p-2 rounded-lg border transition ${
                  unreadCount > 0 
                    ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/30 shadow-xs' 
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Pemberitahuan Kunjungan Buku Tamu"
              >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-bounce text-emerald-300' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[9px] shadow-sm animate-pulse ring-2 ring-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 z-50 animate-fadeIn overflow-hidden text-xs">
                  {/* Panel Header */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-bold text-xs">Pemberitahuan Buku Tamu</div>
                        <div className="text-[10px] text-slate-300">Notifikasi otomatis saat form tamu diisi</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleToggleSound}
                        className="p-1 text-slate-300 hover:text-white rounded-lg transition"
                        title={soundEnabled ? 'Suara notifikasi aktif' : 'Suara notifikasi senyap'}
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNotificationsDropdown(false)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerTestNotification}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      title="Uji coba efek pop-up pemberitahuan langsung"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-700" />
                      <span>Tes Pop-up Notifikasi</span>
                    </button>

                    {notificationHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold underline"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notificationHistory.length === 0 ? (
                      <div className="p-6 text-center space-y-2 text-slate-500">
                        <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Bell className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Belum ada pengisian baru</p>
                        <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto">
                          Ketika masyarakat mengisi form di buku tamu publik, data akan langsung terekam dan memunculkan pop-up pemberitahuan di sini.
                        </p>
                        <button
                          type="button"
                          onClick={handleTriggerTestNotification}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-800 transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Coba Simulasi Tamu Masuk</span>
                        </button>
                      </div>
                    ) : (
                      notificationHistory.map((visit) => (
                        <div 
                          key={visit.id}
                          className="p-3 hover:bg-slate-50/80 transition flex items-start justify-between gap-2.5"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            {visit.selfieUrl ? (
                              <img
                                src={visit.selfieUrl}
                                alt={visit.name}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-lg object-cover border border-emerald-500 shrink-0 mt-0.5"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                {visit.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {visit.visitNumber}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{visit.timeDisplay || 'Baru saja'}</span>
                                </span>
                              </div>

                              <div className="font-bold text-slate-900 text-xs truncate mt-0.5">
                                {visit.name}
                              </div>

                              <div className="text-[10px] text-slate-600 truncate">
                                {visit.caseCategory} • {visit.caseType}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setShowNotificationsDropdown(false);
                              if (onViewDetailVisit) {
                                onViewDetailVisit(visit);
                              }
                            }}
                            className="shrink-0 p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition"
                            title="Buka Detail Kunjungan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Panel Footer */}
                  {notificationHistory.length > 0 && (
                    <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotificationsDropdown(false);
                          handleSelectMenu('visits');
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                      >
                        Buka Semua Data Kunjungan &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Officer Profile Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                  {currentOfficer.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-[11px] font-bold text-slate-200 leading-tight">
                    {currentOfficer.name}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    {currentOfficer.role}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
              </button>

              {/* Officer Dropdown menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-fadeIn text-xs">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-900">{currentOfficer.name}</div>
                    <div className="text-[10px] text-slate-500">{currentOfficer.username}</div>
                    <div className="text-[10px] font-mono text-emerald-700 font-semibold mt-0.5">{currentOfficer.nip || 'NIP Petugas'}</div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenPublicGuestbook();
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Buka Form Pengunjung</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogoutClick();
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition mt-0.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar - High Density */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 py-4 flex gap-4">
        {/* Desktop Sidebar (Left) - High Density Dark / Crisp */}
        <aside className="hidden lg:block w-56 shrink-0 space-y-3">
          <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-xs border border-slate-800 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Navigasi Layanan
            </div>

            <nav className="space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectMenu(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 mt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Logout Petugas</span>
              </button>
            </div>
          </div>

          {/* Institutional Court Box - High Density */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200 space-y-1.5 text-slate-700">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PA Banjarmasin Kelas 1A</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Pos Bantuan Hukum (Posbakum) melayani konsultasi hukum, pembuatan berkas gugatan, permohonan, dan informasi biaya perkara gratis bagi masyarakat tidak mampu.
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex">
            <div className="w-64 bg-slate-900 text-white h-full p-4 flex flex-col justify-between shadow-2xl border-r border-slate-800 animate-fadeIn">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="font-bold text-xs text-emerald-400 uppercase tracking-wider">
                    Menu Petugas Posbakum
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectMenu(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onOpenPublicGuestbook}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Form Pengunjung</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-rose-900/30 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Center Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Floating Pop-up Notification for New Incoming Guest Submissions */}
      <NewVisitNotificationPopup
        currentNotification={currentPopupVisit}
        queueCount={notificationQueue.length + (currentPopupVisit ? 1 : 0)}
        onDismiss={handleDismissCurrentPopup}
        onViewDetail={(visit) => {
          if (onViewDetailVisit) {
            onViewDetailVisit(visit);
          }
        }}
        onNavigateToVisits={() => handleSelectMenu('visits')}
      />
    </div>
  );
};
