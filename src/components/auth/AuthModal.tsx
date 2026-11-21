import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { UserRole } from '../../types';
import { useModalA11y } from '../../hooks/useModalA11y';
import { X, ShieldCheck, HeartHandshake, Truck, Building2, MapPin, AlertCircle, Info } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'register';
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onAuthenticated: (role: UserRole) => void;
}

// Preset locations to allow easy selection or custom entry
const PRESET_LOCATIONS = [
  { label: 'Colaba / South Mumbai', lat: 18.9067, lng: 72.8147, address: 'Colaba Causeway, Mumbai 400005' },
  { label: 'Bandra West', lat: 19.0596, lng: 72.8295, address: 'Hill Road, Bandra West, Mumbai 400050' },
  { label: 'Andheri East', lat: 19.1136, lng: 72.8697, address: 'Chakala, Andheri East, Mumbai 400093' },
  { label: 'Dadar Central', lat: 19.0178, lng: 72.8478, address: 'Dadar TT Circle, Mumbai 400014' },
  { label: 'Kurla West', lat: 19.0657, lng: 72.8794, address: 'LBS Marg, Kurla West, Mumbai 400070' },
  { label: 'Thane West', lat: 19.2183, lng: 72.9781, address: 'Gokhale Road, Naupada, Thane West 400602' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'signin',
  onShowToast,
  onAuthenticated,
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>(initialTab);
  const [selectedRole, setSelectedRole] = useState<UserRole>('donor');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('hotel');
  const [ngoRegNo, setNgoRegNo] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [serviceRadius, setServiceRadius] = useState<number>(10);
  const [isLocating, setIsLocating] = useState(false);

  const isDemoAvailable = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true');

  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: typeof PRESET_LOCATIONS[0]) => {
    setAddress(preset.address);
    setLat(preset.lat.toString());
    setLng(preset.lng.toString());
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      onShowToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLat(pos.coords.latitude.toFixed(4));
        setLng(pos.coords.longitude.toFixed(4));
        onShowToast(`Detected coordinates: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, 'success');
      },
      (err) => {
        setIsLocating(false);
        onShowToast(`Location access denied or unavailable: ${err.message}`, 'warning');
      },
      { timeout: 8000 }
    );
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!lat.trim() || !lng.trim()) {
      onShowToast('Coordinates are required. Choose a quick preset, click "Use Browser GPS", or enter coordinates manually.', 'error');
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      onShowToast('Please specify valid numeric latitude and longitude coordinates.', 'error');
      return;
    }

    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
      onShowToast('Latitude must be between -90 and 90, and longitude between -180 and 180.', 'error');
      return;
    }

    const res = authService.register({
      email,
      role: selectedRole,
      fullName,
      organizationName: selectedRole !== 'volunteer' ? organizationName : undefined,
      organizationType: selectedRole === 'donor' ? organizationType : undefined,
      ngoRegistrationNumber: selectedRole === 'ngo' ? ngoRegNo : undefined,
      phone,
      address,
      lat: parsedLat,
      lng: parsedLng,
      serviceRadiusKm: selectedRole === 'volunteer' ? serviceRadius : undefined,
    });

    if (res.success && res.user) {
      onShowToast(
        `Registration complete for ${res.user.fullName}! Account created in pending verification status.`,
        'success'
      );
      onAuthenticated(selectedRole);
      onClose();
    } else {
      onShowToast(res.error || 'Registration failed.', 'error');
    }
  };

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = authService.signIn(email);
    if (res.success && res.user) {
      onShowToast(`Signed in as ${res.user.fullName} (${res.user.role.toUpperCase()}).`, 'success');
      onAuthenticated(res.user.role);
      onClose();
    } else {
      onShowToast(
        res.error ||
          (isDemoAvailable
            ? 'Failed to sign in. Please verify your email or use a Demo Persona below.'
            : 'Failed to sign in. Please verify your email or register a new account.'),
        'error'
      );
    }
  };

  const handleQuickPersona = (role: 'donor' | 'ngo' | 'volunteer') => {
    authService.signInWithDemoPersona(role);
    onShowToast(`Switched to Demo Persona: ${role.toUpperCase()} (Curated demo data).`, 'info');
    onAuthenticated(role);
    onClose();
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="bg-[#F7F6F0] rounded-xl max-w-4xl w-full border border-[#E2DFD2] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 max-h-[92vh]">
        {/* Left Side: Authentic Photography & Story */}
        <div className="hidden md:block md:col-span-5 relative bg-[#183D2B] text-white overflow-hidden">
          <img
            src="/images/auth_community_banner_1794331334583.webp"
            alt="FoodBridge Community Volunteers"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#183D2B] via-[#183D2B]/50 to-transparent p-6 flex flex-col justify-end space-y-2">
            <span className="font-editorial text-2xl font-bold leading-tight">
              Good food. Better futures.
            </span>
            <p className="text-xs text-[#D3DECD] leading-relaxed">
              Every day, wholesome surplus meals are redistributed across local shelters, community kitchens, and senior homes.
            </p>
          </div>
        </div>

        {/* Right Side: Auth & Registration Form */}
        <div className="md:col-span-7 p-4 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[90vh]">
          <div className="space-y-5 sm:space-y-6">
            {/* Top Bar with Close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 id="auth-modal-title" className="font-editorial text-lg sm:text-xl font-bold text-[#183D2B]">
                  FoodBridge
                </h2>
                <span className="text-xs text-[#50544C]">· Member Access</span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close authentication modal"
                className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#50544C] hover:text-[#252923] rounded focus-visible:ring-2 focus-visible:ring-[#183D2B] focus-visible:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher: Sign In vs Register */}
            <div className="flex border-b border-[#E2DFD2] text-xs font-semibold overflow-x-auto no-scrollbar">
              <button
                onClick={() => setTab('signin')}
                className={`pb-2.5 px-3 sm:px-4 transition-colors whitespace-nowrap min-h-[36px] cursor-pointer ${
                  tab === 'signin' ? 'border-b-2 border-[#183D2B] text-[#183D2B]' : 'text-[#737373]'
                }`}
              >
                Sign In (Registered Account)
              </button>
              <button
                onClick={() => setTab('register')}
                className={`pb-2.5 px-3 sm:px-4 transition-colors whitespace-nowrap min-h-[36px] cursor-pointer ${
                  tab === 'register' ? 'border-b-2 border-[#183D2B] text-[#183D2B]' : 'text-[#737373]'
                }`}
              >
                Register New Account
              </button>
            </div>

            {/* Role Selection for Registration */}
            {tab === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#252923]">
                  Select Stakeholder Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('donor')}
                    className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      selectedRole === 'donor'
                        ? 'border-[#183D2B] bg-[#E8EDE2] text-[#183D2B] font-semibold ring-1 ring-[#183D2B]'
                        : 'border-[#E2DFD2] bg-white text-[#50544C] hover:bg-[#F7F6F0]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#183D2B]" />
                    <span className="text-xs leading-none">Food Donor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('ngo')}
                    className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      selectedRole === 'ngo'
                        ? 'border-[#183D2B] bg-[#E8EDE2] text-[#183D2B] font-semibold ring-1 ring-[#183D2B]'
                        : 'border-[#E2DFD2] bg-white text-[#50544C] hover:bg-[#F7F6F0]'
                    }`}
                  >
                    <HeartHandshake className="w-4 h-4 text-[#C77A54]" />
                    <span className="text-xs leading-none">NGO / Shelter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('volunteer')}
                    className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      selectedRole === 'volunteer'
                        ? 'border-[#183D2B] bg-[#E8EDE2] text-[#183D2B] font-semibold ring-1 ring-[#183D2B]'
                        : 'border-[#E2DFD2] bg-white text-[#50544C] hover:bg-[#F7F6F0]'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-[#647C50]" />
                    <span className="text-xs leading-none">Volunteer</span>
                  </button>
                </div>
              </div>
            )}

            {/* FORM */}
            {tab === 'signin' ? (
              <form onSubmit={handleSignInSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Prototype Notice:</strong> This client-side prototype authenticates via registered email addresses.{isDemoAvailable ? ' Enter your registered email, or switch to one of the curated Demo Personas below to explore.' : ' Enter your registered email address or click "Register New Account" above to create one.'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. chef.marcus@grandmeridian.com or your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-base sm:text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="•••••••• (Mock prototype)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-base sm:text-sm bg-white border border-[#E2DFD2] rounded focus:border-[#183D2B] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs cursor-pointer flex items-center justify-center"
                >
                  Sign In to Registered Account
                </button>

                {/* 1-Click Persona Quick Logins for Evaluator Ease (Gated by Demo Mode Flag) */}
                {isDemoAvailable && (
                  <div className="pt-4 border-t border-[#E2DFD2] space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#647C50] uppercase tracking-wider">
                        Or Launch Instant Demo Persona:
                      </p>
                      <span className="text-[10px] bg-[#E8EDE2] text-[#183D2B] px-1.5 py-0.5 rounded font-mono font-medium">Demo Mode</span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleQuickPersona('donor')}
                        className="p-2.5 bg-white rounded border border-[#E2DFD2] hover:border-[#183D2B] text-left text-[#252923] flex items-center justify-between transition-colors min-h-[40px] cursor-pointer"
                      >
                        <div>
                          <span className="font-medium">Chef Marcus</span>
                          <span className="text-[11px] text-[#50544C]"> (Grand Meridian Banquet & Hotel)</span>
                        </div>
                        <span className="text-[10px] text-[#647C50] font-mono font-semibold">Donor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPersona('ngo')}
                        className="p-2.5 bg-white rounded border border-[#E2DFD2] hover:border-[#183D2B] text-left text-[#252923] flex items-center justify-between transition-colors min-h-[40px] cursor-pointer"
                      >
                        <div>
                          <span className="font-medium">Sister Teresa</span>
                          <span className="text-[11px] text-[#50544C]"> (Hope Community Kitchen & Shelter)</span>
                        </div>
                        <span className="text-[10px] text-[#C77A54] font-mono font-semibold">NGO</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPersona('volunteer')}
                        className="p-2.5 bg-white rounded border border-[#E2DFD2] hover:border-[#183D2B] text-left text-[#252923] flex items-center justify-between transition-colors min-h-[40px] cursor-pointer"
                      >
                        <div>
                          <span className="font-medium">Alex Rivera</span>
                          <span className="text-[11px] text-[#50544C]"> (Community Courier Dispatch)</span>
                        </div>
                        <span className="text-[10px] text-[#183D2B] font-mono font-semibold">Volunteer</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 bg-[#E8EDE2] border border-[#D3DECD] rounded text-[#183D2B] text-[11px] leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#183D2B] shrink-0 mt-0.5" />
                  <div>
                    <strong>Verification Notice:</strong> New accounts are registered in <em>Pending Verification</em> status. Physical audits and FSSAI documentation checks are required before production trust badges are granted.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      Full Contact Person *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Rostova"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-[#E2DFD2] rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98200 00000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-[#E2DFD2] rounded"
                    />
                  </div>
                </div>

                {selectedRole !== 'volunteer' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      {selectedRole === 'donor' ? 'Establishment / Kitchen Name *' : 'NGO / Charity Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={selectedRole === 'donor' ? 'e.g. Artisan Breadworks & Bistro' : 'e.g. St. Jude Food Shelter'}
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-[#E2DFD2] rounded"
                    />
                  </div>
                )}

                {selectedRole === 'donor' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      Donor Establishment Type
                    </label>
                    <select
                      value={organizationType}
                      onChange={(e) => setOrganizationType(e.target.value)}
                      className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-[#E2DFD2] rounded"
                    >
                      <option value="hotel">Hotel & Banqueting</option>
                      <option value="restaurant">Commercial Restaurant / Café</option>
                      <option value="canteen">University or Corporate Canteen</option>
                      <option value="caterer">Event & Wedding Caterer</option>
                      <option value="bakery">Artisan Bakery & Pastry</option>
                    </select>
                  </div>
                )}

                {selectedRole === 'ngo' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      NGO / Society Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NGO-MH-2024-00123"
                      value={ngoRegNo}
                      onChange={(e) => setNgoRegNo(e.target.value)}
                      className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-[#E2DFD2] rounded"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#252923] mb-1">
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@entity.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-[#E2DFD2] rounded"
                  />
                </div>

                {/* Location Selection & Actual Coordinates */}
                <div className="space-y-2 p-3 bg-white rounded border border-[#E2DFD2]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#252923] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C77A54]" />
                      Location & Physical Address *
                    </label>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={isLocating}
                      className="text-[11px] text-[#183D2B] hover:text-[#254F38] font-medium underline flex items-center gap-1 cursor-pointer"
                    >
                      {isLocating ? 'Detecting GPS...' : 'Use Browser GPS'}
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Street, District, Ward, City"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-base sm:text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded"
                    />
                  </div>

                  {/* Preset Quick Locations */}
                  <div>
                    <span className="text-[10px] text-[#647C50] font-semibold uppercase tracking-wider block mb-1">
                      Quick Location Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_LOCATIONS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handlePresetSelect(preset)}
                          className="min-h-[30px] px-2.5 py-1 text-[11px] bg-[#F7F6F0] hover:bg-[#E8EDE2] text-[#252923] border border-[#E2DFD2] rounded transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Coordinate Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-[#50544C] mb-0.5">
                        Latitude (°N) *
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        placeholder="e.g. 19.0760"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        className="w-full px-2.5 py-2 text-base sm:text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#50544C] mb-0.5">
                        Longitude (°E) *
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        placeholder="e.g. 72.8777"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        className="w-full px-2.5 py-2 text-base sm:text-xs bg-[#F7F6F0] border border-[#E2DFD2] rounded font-mono"
                      />
                    </div>
                  </div>
                  {(!lat || !lng) && (
                    <p className="text-[10px] text-[#C77A54] flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Coordinates required: select a preset above, use browser GPS, or type coordinates.
                    </p>
                  )}
                </div>

                {selectedRole === 'volunteer' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#252923] mb-1">
                      Preferred Dispatch Radius: {serviceRadius} km
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="25"
                      value={serviceRadius}
                      onChange={(e) => setServiceRadius(Number(e.target.value))}
                      className="w-full accent-[#183D2B]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[44px] py-2.5 text-xs font-semibold text-white bg-[#183D2B] hover:bg-[#254F38] rounded shadow-xs mt-2 cursor-pointer flex items-center justify-center"
                >
                  Complete Registration (Pending Verification)
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
