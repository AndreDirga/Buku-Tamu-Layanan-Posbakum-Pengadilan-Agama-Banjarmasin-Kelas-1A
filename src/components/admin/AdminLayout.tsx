import React, { useState } from 'react';
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
  Building2
} from 'lucide-react';

interface AdminLayoutProps {
  currentOfficer: OfficerUser;
  activeMenu: 'dashboard' | 'visits' | 'statistics' | 'export' | 'qr' | 'settings';
  onMenuChange: (menu: 'dashboard' | 'visits' | 'statistics' | 'export' | 'qr' | 'settings') => void;
  onLogout: () => void;
  onOpenPublicGuestbook: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentOfficer,
  activeMenu,
  onMenuChange,
  onLogout,
  onOpenPublicGuestbook,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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
              <PaBjmLogoIcon sizeClass="w-8 h-9.5" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Sistem Petugas Posbakum
                </div>
                <div className="font-extrabold text-sm text-slate-100 hidden sm:block">
                  Pengadilan Agama Banjarmasin Kelas 1A
                </div>
                <div className="font-bold text-xs text-slate-100 sm:hidden">
                  PA Banjarmasin
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
    </div>
  );
};
