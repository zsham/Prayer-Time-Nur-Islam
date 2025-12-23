
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { 
  Moon, 
  Sun, 
  Sunrise, 
  Sunset, 
  Clock, 
  MapPin, 
  Search, 
  Compass, 
  BookOpen, 
  Info,
  ChevronRight,
  Loader2,
  Navigation,
  User as UserIcon,
  LogOut,
  Mail,
  Globe,
  Lock,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Square,
  Play,
  Pause,
  Settings,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';

// --- Constants & Types ---
const ADHAN_API_BASE = "https://api.aladhan.com/v1";
const GEMINI_MODEL = "gemini-3-pro-preview";
const REVERSE_GEOCODE_API = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const ADHAN_VERSIONS = [
  { name: "Makkah - Masjid al-Haram", url: "https://www.islamcan.com/audio/adhan/azan1.mp3" },
  { name: "Madinah - Masjid an-Nabawi", url: "https://www.islamcan.com/audio/adhan/azan2.mp3" },
  { name: "Egypt - Sheikh Abdul Basit", url: "https://www.islamcan.com/audio/adhan/azan15.mp3" },
  { name: "Mishary Rashid Alafasy", url: "https://www.islamcan.com/audio/adhan/azan16.mp3" },
  { name: "Jerusalem - Masjid al-Aqsa", url: "https://www.islamcan.com/audio/adhan/azan3.mp3" },
];

interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface HijriDate {
  day: string;
  month: { en: string; ar: string };
  year: string;
}

interface LocationData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

// --- Auth Modal Component ---
const AuthModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (u: UserProfile) => void }> = ({ isOpen, onClose, onLogin }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin({
        name: "Abdullah Rahman",
        email: "abdullah.rahman@gmail.com",
      });
      setIsAuthenticating(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#011a14]/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#022c22] border border-emerald-700/50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center border border-emerald-500/20">
            <UserIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-white">Join Nur-Islam Community</h2>
            <p className="text-emerald-300/60 text-sm">Save your location, set custom alerts, and track your daily prayers.</p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isAuthenticating}
              className="w-full bg-white text-gray-900 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google Mail
                </>
              )}
            </button>
          </div>

          <button onClick={onClose} className="text-emerald-500 text-xs hover:text-emerald-300 transition-colors">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

// --- App Component ---
const NurPrayerApp: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [hijri, setHijri] = useState<HijriDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [insight, setInsight] = useState<string | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [nearbyMosques, setNearbyMosques] = useState<any[]>([]);
  
  // Audio State
  const [isAdhanEnabled, setIsAdhanEnabled] = useState(false);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [selectedAdhanIndex, setSelectedAdhanIndex] = useState(0);
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastTriggeredTimeRef = useRef<string | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  // Update clock and check for prayer time match
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (times && isAdhanEnabled && !isAdhanPlaying && user && previewingIndex === null) {
        const timeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        
        if (lastTriggeredTimeRef.current !== timeString) {
          const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
          for (const name of prayerNames) {
            if (times[name as keyof PrayerTimes] === timeString) {
              playAdhan();
              lastTriggeredTimeRef.current = timeString;
              break;
            }
          }
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [times, isAdhanEnabled, isAdhanPlaying, user, previewingIndex]);

  const playAdhan = () => {
    if (audioRef.current) {
      audioRef.current.src = ADHAN_VERSIONS[selectedAdhanIndex].url;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Audio playback blocked", e));
      setIsAdhanPlaying(true);
    }
  };

  const stopAdhan = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAdhanPlaying(false);
    }
  };

  const toggleAdhanEnabled = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    
    const nextState = !isAdhanEnabled;
    setIsAdhanEnabled(nextState);
    
    if (nextState && audioRef.current) {
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        audioRef.current!.volume = 1;
      }).catch(() => {});
    }
  };

  const handlePreviewAdhan = (index: number) => {
    if (previewingIndex === index) {
      previewAudioRef.current?.pause();
      setPreviewingIndex(null);
    } else {
      setPreviewingIndex(index);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = ADHAN_VERSIONS[index].url;
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current.play();
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsLogoutConfirmOpen(false);
    setIsAdhanEnabled(false);
    stopAdhan();
  };

  // Initial Location Detection
  useEffect(() => {
    detectLocation();
  }, []);

  const getCityNameFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`${REVERSE_GEOCODE_API}?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const data = await response.json();
      return data.city || data.locality || data.principalSubdivision || null;
    } catch (e) {
      console.error("Geocoding error:", e);
      return null;
    }
  };

  const detectLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const cityName = await getCityNameFromCoords(latitude, longitude);
          fetchPrayerTimes(latitude, longitude, cityName);
        },
        (err) => {
          setError("Location access denied. Please sign in to search for a city manually.");
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  };

  const fetchPrayerTimes = async (lat: number, lng: number, manualCity?: string | null) => {
    try {
      setLoading(true);
      const url = manualCity && lat === 0 && lng === 0
        ? `${ADHAN_API_BASE}/timingsByAddress?address=${encodeURIComponent(manualCity)}`
        : `${ADHAN_API_BASE}/timings?latitude=${lat}&longitude=${lng}&method=2`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 200) {
        setTimes(data.data.timings);
        setHijri(data.data.date.hijri);
        
        const timezoneCity = data.data.meta.timezone.split('/').pop().replace(/_/g, ' ');
        const finalCity = manualCity || timezoneCity;

        setLocation({
          city: finalCity,
          country: data.data.meta.timezone.split('/')[0] || "",
          latitude: lat,
          longitude: lng,
          timezone: data.data.meta.timezone
        });
        setError(null);
      } else {
        throw new Error("Failed to fetch timings");
      }
    } catch (err) {
      setError("Could not retrieve prayer times. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!searchQuery.trim()) return;
    fetchPrayerTimes(0, 0, searchQuery);
  };

  const getSpiritualInsight = async () => {
    if (!times) return;
    setIsInsightLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Provide a beautiful and short spiritual reflection, Quranic verse, or Hadith related to the current time of day or the importance of prayer. The user is in ${location?.city}. Keep it inspiring and under 150 words.`,
      });
      setInsight(response.text || "May your prayers be accepted.");
    } catch (err) {
      console.error(err);
      setInsight("Reflection could not be loaded at this time.");
    } finally {
      setIsInsightLoading(false);
    }
  };

  const findNearbyMosques = async () => {
    if (!location) return;
    setIsInsightLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `What are the closest mosques or Islamic centers to my current location in ${location.city}? List their names and provide Google Maps links if possible.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: location.latitude,
                longitude: location.longitude
              }
            }
          }
        },
      });
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks = chunks
        .filter((c: any) => c.maps)
        .map((c: any) => ({ title: c.maps.title, uri: c.maps.uri }));
      
      setNearbyMosques(mapsLinks);
      setInsight(response.text || "Found some nearby locations.");
    } catch (err) {
      console.error(err);
      setInsight("Could not search for nearby mosques.");
    } finally {
      setIsInsightLoading(false);
    }
  };

  const getNextPrayer = () => {
    if (!times) return null;
    const now = currentTime;
    const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
    
    for (const name of prayerNames) {
      const [hours, minutes] = times[name].split(':').map(Number);
      const prayerDate = new Date(now);
      prayerDate.setHours(hours, minutes, 0, 0);
      
      if (prayerDate > now) {
        return { name, time: prayerDate };
      }
    }
    
    const [h, m] = times.Fajr.split(':').map(Number);
    const fajrNext = new Date(now);
    fajrNext.setDate(fajrNext.getDate() + 1);
    fajrNext.setHours(h, m, 0, 0);
    return { name: "Fajr", time: fajrNext };
  };

  const nextPrayer = getNextPrayer();
  const timeToNext = nextPrayer 
    ? Math.floor((nextPrayer.time.getTime() - currentTime.getTime()) / 1000)
    : 0;

  const formatTimeRemaining = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  if (loading && !times) {
    return (
      <div className="min-h-screen bg-[#022c22] flex items-center justify-center text-emerald-100 p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-emerald-400" />
          <h1 className="text-2xl font-serif text-white">Nur-Islam</h1>
          <p className="animate-pulse text-emerald-300/80">Determining precise location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#022c22] text-emerald-50 font-sans selection:bg-emerald-500 selection:text-white pb-20">
      <audio ref={audioRef} onEnded={() => setIsAdhanPlaying(false)} />
      <audio ref={previewAudioRef} onEnded={() => setPreviewingIndex(null)} />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLogin={(u) => setUser(u)} 
      />

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-[#011a14]/95 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-[#022c22] border border-emerald-800/50 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-serif font-bold text-white">Sign Out</h3>
              <p className="text-emerald-300/60 text-sm">Are you sure you want to sign out? You will need to sign in again to access personalized features and alerts.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleLogout}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all"
              >
                Sign Out
              </button>
              <button 
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="w-full bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 font-bold py-3 rounded-xl transition-all border border-emerald-700/30"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adhan Selection Modal */}
      {isSettingsOpen && user && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#022c22] border border-emerald-700/50 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-emerald-800/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-serif font-bold text-white">Audio Preferences</h3>
                <p className="text-emerald-400/60 text-xs">Choose your preferred Adhan recitation</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-emerald-500 hover:text-white bg-emerald-900/40 p-2 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {ADHAN_VERSIONS.map((adhan, idx) => (
                <div 
                  key={idx}
                  className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedAdhanIndex === idx 
                      ? 'bg-emerald-800/40 border-emerald-500/50' 
                      : 'bg-emerald-950/30 border-emerald-800/40 hover:bg-emerald-900/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handlePreviewAdhan(idx)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        previewingIndex === idx 
                          ? 'bg-emerald-400 text-emerald-950 animate-pulse' 
                          : 'bg-emerald-900 group-hover:bg-emerald-800 text-emerald-400'
                      }`}
                    >
                      {previewingIndex === idx ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div>
                      <h4 className={`text-sm font-bold ${selectedAdhanIndex === idx ? 'text-white' : 'text-emerald-100'}`}>
                        {adhan.name}
                      </h4>
                      <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-mono">
                        {previewingIndex === idx ? 'Testing...' : 'Recitation'}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setSelectedAdhanIndex(idx);
                      if (previewingIndex === idx) setPreviewingIndex(null);
                      previewAudioRef.current?.pause();
                    }}
                    className={`p-2 rounded-xl transition-all ${
                      selectedAdhanIndex === idx 
                        ? 'bg-emerald-500 text-emerald-950' 
                        : 'bg-emerald-900/50 text-emerald-700 hover:text-emerald-400'
                    }`}
                  >
                    {selectedAdhanIndex === idx ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 bg-emerald-950/50 border-t border-emerald-800/50">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-3 rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adhan Active Notification */}
      {isAdhanPlaying && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-emerald-950 px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-500">
          <div className="w-2 h-2 rounded-full bg-emerald-950 animate-ping" />
          <p className="text-xs font-bold uppercase tracking-widest">Adhan Active</p>
          <Volume2 className="w-4 h-4 animate-pulse" />
        </div>
      )}

      <div className="relative max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        
        {/* Top Bar with integrated controls */}
        <nav className="flex items-center justify-between pb-6 gap-4 sticky top-0 z-[110] bg-[#022c22]/80 backdrop-blur-lg -mx-4 px-4 py-2 border-b border-emerald-800/20">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-10 h-10 bg-emerald-800/40 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-700/50 transition-all">
              <span className="text-white font-serif font-bold text-xl tracking-tighter">NI</span>
            </div>
            <span className="hidden sm:block font-serif font-bold text-2xl text-white tracking-wide">Nur-Islam</span>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Audio Controls (Bell + Settings) */}
            <div className="flex items-center gap-1.5 bg-emerald-950/40 p-1 rounded-2xl border border-emerald-800/50">
              {isAdhanPlaying ? (
                <button 
                  onClick={stopAdhan}
                  className="px-3 h-10 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600 transition-all animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span className="text-[10px] font-bold uppercase">Stop</span>
                </button>
              ) : (
                <button 
                  onClick={toggleAdhanEnabled}
                  className={`relative group px-3 h-10 rounded-xl flex items-center gap-2 transition-all ${
                    isAdhanEnabled && user
                    ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20' 
                    : 'bg-emerald-900/60 text-emerald-400 hover:bg-emerald-800'
                  }`}
                >
                  {!user ? (
                    <Lock className="w-4 h-4 text-emerald-700" />
                  ) : isAdhanEnabled ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                  <span className="text-[10px] font-bold uppercase hidden xs:block">
                    {!user ? 'Adhan' : isAdhanEnabled ? 'Adhan On' : 'Adhan Off'}
                  </span>
                  
                  {!user && (
                    <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-emerald-950 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-800 shadow-xl z-[120]">
                      Sign in to enable Adhan
                    </div>
                  )}
                </button>
              )}

              {user && (
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isSettingsOpen ? 'bg-amber-500 text-amber-950' : 'text-emerald-500 hover:bg-emerald-800/50'
                  }`}
                  title="Audio Preferences"
                >
                  <Settings className={`w-4 h-4 ${isSettingsOpen ? 'animate-spin-slow' : ''}`} />
                </button>
              )}
            </div>

            {/* User Auth Section */}
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center gap-2 pl-2">
                  <button 
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    className="w-10 h-10 bg-emerald-800/40 rounded-xl flex items-center justify-center text-emerald-400 font-bold group hover:bg-red-500/20 hover:text-red-400 transition-all border border-emerald-800/50 relative overflow-hidden"
                    title={`Logout ${user.name}`}
                  >
                    <span className="group-hover:opacity-0 transition-opacity">{user.name.charAt(0)}</span>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <LogOut className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-emerald-800/40 hover:bg-emerald-700/60 border border-emerald-600/30 text-emerald-200 text-xs font-medium h-10 px-4 rounded-xl transition-all flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:block">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-emerald-800/50 pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-serif tracking-widest uppercase text-sm">
              <div className={`w-2 h-2 rounded-full ${isAdhanPlaying ? 'bg-red-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              {isAdhanPlaying ? 'Audio Active' : 'Live Presence'}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
              {location?.city}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-emerald-300/80">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {location?.city}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {location?.timezone && (
                <span className="flex items-center gap-1.5 text-[11px] font-mono bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-700/30 text-emerald-400">
                  <Globe className="w-3 h-3" />
                  {location.timezone}
                </span>
              )}
            </div>
            {hijri && (
              <p className="text-amber-300/90 font-serif italic text-lg">
                {hijri.day} {hijri.month.en} {hijri.year} AH
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-3 min-w-[280px]">
            {user ? (
              <>
                <form onSubmit={handleSearch} className="relative w-full md:w-64 group">
                  <input 
                    type="text" 
                    placeholder="Search city..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-emerald-900/40 border border-emerald-700/50 rounded-full py-2 px-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-emerald-600 group-hover:bg-emerald-900/60"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                </form>
                <button 
                  onClick={detectLocation}
                  className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-200 transition-colors"
                >
                  <Navigation className="w-3 h-3" /> Update Precise Location
                </button>
              </>
            ) : (
              <div className="w-full md:w-64 space-y-2">
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full flex items-center justify-between gap-3 bg-emerald-900/20 border border-emerald-700/30 rounded-full py-2 px-4 text-sm text-emerald-400/60 hover:bg-emerald-900/40 hover:text-emerald-400 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-3 h-3 text-emerald-600 group-hover:text-emerald-500 transition-colors" />
                    Sign in for location features
                  </span>
                  <Search className="w-4 h-4 text-emerald-700 group-hover:text-emerald-500 transition-colors" />
                </button>
              </div>
            )}
          </div>
        </header>

        {nextPrayer && (
          <div className="bg-gradient-to-r from-emerald-900/60 to-teal-900/60 rounded-3xl p-6 md:p-8 border border-emerald-700/30 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group shadow-lg">
            <div className="relative z-10 space-y-1">
              <span className="text-emerald-400 font-medium uppercase tracking-widest text-xs">Next Prayer</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {nextPrayer.name} <span className="text-emerald-300 font-normal">at</span> {times?.[nextPrayer.name as keyof PrayerTimes]}
              </h2>
            </div>
            <div className="relative z-10 text-center md:text-right">
              <div className="text-4xl font-mono font-bold text-emerald-400 tabular-nums">
                {formatTimeRemaining(timeToNext)}
              </div>
              <p className="text-emerald-300/60 text-sm">Remaining until Adhan</p>
            </div>
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {times && (Object.entries(times) as [keyof PrayerTimes, string][]).map(([name, time]) => {
            const isNext = nextPrayer?.name === name;
            const Icon = {
              Fajr: Moon,
              Sunrise: Sunrise,
              Dhuhr: Sun,
              Asr: Sun,
              Maghrib: Sunset,
              Isha: Moon
            }[name] || Clock;

            return (
              <div 
                key={name}
                className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                  isNext 
                    ? 'bg-emerald-800/40 border-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.1)]' 
                    : 'bg-emerald-900/20 border-emerald-800/30 hover:bg-emerald-800/30'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${isNext ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-900/50 text-emerald-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {isNext && (
                    <span className="bg-emerald-500 text-[10px] font-bold px-2 py-1 rounded-full text-white uppercase tracking-tighter">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-emerald-100 font-medium">{name}</h3>
                <div className="text-2xl font-bold text-white mt-1 tabular-nums">{time}</div>
              </div>
            );
          })}
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-3xl p-6 flex flex-col gap-4 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-semibold">Spiritual Reflection</h3>
              </div>
              <button 
                onClick={getSpiritualInsight}
                disabled={isInsightLoading}
                className="text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
              >
                {isInsightLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'New Insight'}
              </button>
            </div>
            
            <div className="flex-1 text-emerald-100/90 italic leading-relaxed font-serif text-lg">
              {insight ? insight : "Click the button to receive a moment of reflection tailored to this hour."}
            </div>

            {nearbyMosques.length > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-800/30 animate-in slide-in-from-top-2">
                <p className="text-xs text-emerald-400 mb-2 font-medium uppercase tracking-widest">Nearby Mosques</p>
                <ul className="space-y-2">
                  {nearbyMosques.map((m, idx) => (
                    <li key={idx}>
                      <a 
                        href={m.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between group/link text-sm hover:text-emerald-300 transition-colors"
                      >
                        <span className="truncate">{m.title}</span>
                        <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Compass className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-semibold">Community Finder</h3>
              </div>
              <p className="text-emerald-100/70 text-sm leading-relaxed">
                Discover nearby places for congregational prayer or community services using live grounding search.
              </p>
            </div>
            <button 
              onClick={findNearbyMosques}
              disabled={isInsightLoading}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-[#022c22] font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              {isInsightLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Locate Nearby Centers
                  <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </div>
        </section>

        <footer className="pt-12 pb-6 text-center text-emerald-700 text-xs">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-8 bg-emerald-800/40" />
            <span className="font-serif italic tracking-widest uppercase">Nur-Islam — Light in Presence</span>
            <div className="h-px w-8 bg-emerald-800/40" />
          </div>
          <p>© {new Date().getFullYear()} Global Prayer Intelligence. Powered by Developer z@Sham Software Project Developer</p>
        </footer>
      </div>

      {error && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 bg-red-900/90 border border-red-500/50 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-center justify-between text-white z-50 animate-in slide-in-from-bottom">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-red-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-white/50 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<NurPrayerApp />);
}