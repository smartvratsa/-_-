import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ReportItem, Coordinates, VolunteerProfile } from '../types';
import { SAMPLE_PHOTO_PRESETS, VRATSA_LOCATIONS, VRATSA_DISTRICTS } from '../data/mockReports';
import { VRATSA_SOLVED_CASES } from '../data/solvedCases';
import { AnalysisCard } from './AnalysisCard';
import { generateClientAnalysis } from '../lib/clientAnalysis';
import {
  Upload,
  Camera,
  MapPin,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  EyeOff,
  Crosshair,
  ShieldAlert,
  ArrowRight,
  Flame,
  Map,
  Send,
  Award,
  ArrowUp,
  Navigation,
  Image as ImageIcon,
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SubmitSectionProps {
  onReportCreated: (report: ReportItem) => void;
  userRole: 'citizen' | 'official';
  onSelectCase: (code: string) => void;
  prefilledCoords?: { lat: number; lng: number; districtName: string } | null;
  onSwitchToMap?: () => void;
  currentVolunteer?: VolunteerProfile | null;
  onOpenLogin?: () => void;
}

// Client-side image compression to guarantee smooth uploads and avoid Firestore 1MB limits
const compressImage = (fileOrDataUrl: File | string, maxWidth = 1200, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      }
    };
    img.onerror = () => resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
};

export const SubmitSection: React.FC<SubmitSectionProps> = ({
  onReportCreated,
  userRole,
  onSelectCase,
  prefilledCoords,
  onSwitchToMap,
  currentVolunteer,
  onOpenLogin
}) => {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>(VRATSA_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState<string>('');
  const [selectedCoordinates, setSelectedCoordinates] = useState<Coordinates>({ lat: 43.2047, lng: 23.5477 });
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedToBoard, setIsSubmittedToBoard] = useState<boolean>(false);
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  const [isGpsDetected, setIsGpsDetected] = useState<boolean>(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('Търсене на локация...');
  const [showScrollTopBtn, setShowScrollTopBtn] = useState<boolean>(false);
  const [autoClaimTask, setAutoClaimTask] = useState<boolean>(false);
  const [showDemoPresets, setShowDemoPresets] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const topSectionRef = useRef<HTMLDivElement>(null);

  // Scroll spy to show "Go to top" button on phone
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTopBtn(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // AUTO-GPS: Automatically detect user's exact location on form load
  useEffect(() => {
    if (prefilledCoords) {
      setSelectedCoordinates({ lat: prefilledCoords.lat, lng: prefilledCoords.lng });
      setCustomLocation(`ул./район във Враца (GPS: ${prefilledCoords.lat.toFixed(4)}, ${prefilledCoords.lng.toFixed(4)}) - кв. ${prefilledCoords.districtName}`);
      setIsGpsDetected(true);
      setGpsStatusText(`Посочена локация от картата: кв. ${prefilledCoords.districtName}`);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setSelectedCoordinates({ lat, lng });

          // Find closest district in Vratsa
          let nearestDistrict = 'Център';
          let minDistance = Infinity;
          VRATSA_DISTRICTS.forEach((d) => {
            if (d.id === 'all') return;
            const dist = Math.hypot(d.lat - lat, d.lng - lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestDistrict = d.name;
            }
          });

          setIsGpsDetected(true);
          const detectedStr = `кв. ${nearestDistrict}, гр. Враца (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          setCustomLocation(detectedStr);
          setGpsStatusText(`Автоматично открита GPS локация: кв. ${nearestDistrict} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        },
        (err) => {
          console.warn('Auto GPS not granted or error:', err);
          setIsGpsDetected(false);
          setGpsStatusText('Локацията по подразбиране е Център, Враца (можете да включите GPS)');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    }
  }, [prefilledCoords]);

  // File upload handler with compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setImagePreview(compressed);
        setAnalysisResult(null);
        setIsSubmittedToBoard(false);
      } catch (_e) {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result as string);
          setAnalysisResult(null);
          setIsSubmittedToBoard(false);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Camera toggle handler
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access error, fallback to native camera input:', err);
      setIsCameraActive(false);
      // Fallback directly to native camera input which works 100% on phones
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const compressed = await compressImage(dataUrl);
        setImagePreview(compressed);
        stopCamera();
        setAnalysisResult(null);
        setIsSubmittedToBoard(false);
      }
    }
  };

  // Preset selector
  const selectPreset = (preset: typeof SAMPLE_PHOTO_PRESETS[0]) => {
    setActivePresetName(preset.name);
    setImagePreview(preset.imageUrl);
    setDescription(preset.description);
    setLocation(preset.location);
    if (preset.coordinates) {
      setSelectedCoordinates(preset.coordinates);
      setIsGpsDetected(true);
      setGpsStatusText(`Зададена локация за пример: ${preset.neighborhood} (${preset.coordinates.lat}, ${preset.coordinates.lng})`);
    }
    setAnalysisResult(null);
    setIsSubmittedToBoard(false);
    setErrorMessage(null);

    // Gently scroll to form on mobile
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Manual GPS refresh button
  const handleGetGPSLocation = () => {
    if (navigator.geolocation) {
      setGpsStatusText('Засичане на точни GPS координати...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setSelectedCoordinates({ lat, lng });

          let nearestDistrict = 'Център';
          let minDistance = Infinity;
          VRATSA_DISTRICTS.forEach((d) => {
            if (d.id === 'all') return;
            const dist = Math.hypot(d.lat - lat, d.lng - lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestDistrict = d.name;
            }
          });

          setIsGpsDetected(true);
          const coords = `кв. ${nearestDistrict}, Враца (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          setCustomLocation(coords);
          setGpsStatusText(`✓ Локация: кв. ${nearestDistrict} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        },
        () => {
          setLocation('пл. „Христо Ботев“, Център, Враца');
          setSelectedCoordinates({ lat: 43.2032, lng: 23.5474 });
          setGpsStatusText('Неуспешно засичане на GPS. Използва се център Враца.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    topSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Trigger Gemini Analysis
  const handleAnalyze = async () => {
    if (!imagePreview && !description) {
      setErrorMessage('Моля, качете снимка или опишете проблема (напр. счупено осветление, дупка или боклук).');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisResult(null);
    setIsSubmittedToBoard(false);

    const activeLocation = customLocation.trim() || location;

    try {
      let data: AnalysisResult | null = null;
      try {
        const response = await fetch('/api/analyze-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imagePreview,
            description: description,
            location: activeLocation,
            similarCases: VRATSA_SOLVED_CASES,
          }),
        });

        if (response.ok) {
          data = await response.json();
        }
      } catch (_fetchErr) {
        // Fallback
      }

      if (!data) {
        data = generateClientAnalysis(description, activeLocation);
      }

      setAnalysisResult(data);
    } catch (err: any) {
      console.warn('Analysis using fallback engine:', err);
      const fallbackData = generateClientAnalysis(description, activeLocation);
      setAnalysisResult(fallbackData);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Publish to board
  const handlePublishReport = (overrideAnalysis?: AnalysisResult) => {
    const activeAnalysis = overrideAnalysis || analysisResult;
    if (!activeAnalysis) return;

    const activeLocation = customLocation.trim() || location;
    const ticketNum = `СИГ-VRZ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    let neighborhood = 'Център';
    if (activeLocation.includes('Дъбника')) neighborhood = 'ж.к. Дъбника';
    else if (activeLocation.includes('Младост')) neighborhood = 'ж.к. Младост';
    else if (activeLocation.includes('Сениче')) neighborhood = 'ж.к. Сениче';
    else if (activeLocation.includes('Хижата')) neighborhood = 'Парк Хижата';
    else if (activeLocation.includes('Медковец')) neighborhood = 'ж.к. Медковец';

    const authorDisplayName = currentVolunteer ? currentVolunteer.name : 'Гражданин на Враца';
    const isAutoClaimed = Boolean(
      autoClaimTask && currentVolunteer && !currentVolunteer.activeClaimedTaskId
    );

    const minMinutes = activeAnalysis.path === 'blue' ? 3 : activeAnalysis.path === 'yellow' ? 6 : 10;
    const teamSize = activeAnalysis.plan?.people || 3;

    const newReport: ReportItem = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ticketNumber: ticketNum,
      title: activeAnalysis.problem || description || 'Градски сигнал',
      description: description || activeAnalysis.problem || 'Сигнал за проблем във Враца',
      location: activeLocation,
      neighborhood: neighborhood,
      coordinates: selectedCoordinates,
      imageUrl: imagePreview || 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=800&q=80',
      createdAt: 'Току-що',
      analysis: activeAnalysis,
      status: isAutoClaimed ? 'в_изпълнение' : (activeAnalysis.path === 'blue' ? 'одобрен' : 'нови'),
      volunteersCount: isAutoClaimed ? 1 : 0,
      volunteers: isAutoClaimed ? [authorDisplayName] : [],
      claimedBy: isAutoClaimed ? {
        uid: currentVolunteer!.id,
        name: currentVolunteer!.name,
        claimedAt: Date.now(),
        isPrivate: false
      } : undefined,
      taskStartedAt: isAutoClaimed ? Date.now() : undefined,
      minimumRequiredMinutes: minMinutes,
      maxTeamSize: teamSize,
      teamMembers: isAutoClaimed ? [
        { uid: currentVolunteer!.id, name: currentVolunteer!.name, joinedAt: Date.now() }
      ] : [],
      blurPersonalData: activeAnalysis.contains_personal_data,
      authorName: authorDisplayName,
      authorId: currentVolunteer?.id,
      historyLog: [
        {
          timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: authorDisplayName,
          action: isAutoClaimed
            ? `Подаден сигнал (${ticketNum}) и поет веднага от ${authorDisplayName} за изпълнение (+50 т.)`
            : `Подаден сигнал (${ticketNum}) на картата на Враца (+50 т.)`,
          badge: isAutoClaimed ? 'Поета задача' : '+50 т.'
        },
        {
          timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: 'AI Градски помощник Враца',
          action: `Определен индекс на наложителност: ${activeAnalysis.urgencyScore || 50}/100. Път: "${activeAnalysis.path}".`,
          badge: 'AI Оценка'
        }
      ]
    };

    onReportCreated(newReport);
    setIsSubmittedToBoard(true);
  };

  // Direct 1-click submit
  const handleDirectSubmit = () => {
    if (!imagePreview && !description.trim()) {
      setErrorMessage('Моля, качете снимка или напишете кратко описание на проблема.');
      return;
    }
    const activeLocation = customLocation.trim() || location;
    const directAnalysis = analysisResult || generateClientAnalysis(description, activeLocation);
    setAnalysisResult(directAnalysis);
    handlePublishReport(directAnalysis);
  };

  const handleResetForm = () => {
    setActivePresetName(null);
    setImagePreview('');
    setDescription('');
    setCustomLocation('');
    setAnalysisResult(null);
    setIsSubmittedToBoard(false);
    setErrorMessage(null);
    stopCamera();
  };

  return (
    <div ref={topSectionRef} className="space-y-6 sm:space-y-8 animate-fadeIn pb-28">
      {/* Floating Scroll-to-Top Button for Phone */}
      {showScrollTopBtn && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-40 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-full shadow-2xl border-2 border-emerald-300 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
          title="Отиди най-отгоре"
        >
          <ArrowUp className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Introduction Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Оценка на наложителност и автоматична GPS карта</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            Подай сигнал за проблем във Враца
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Сигнализирайте за счупено осветление, дупки, пейки или отпадъци. Вашето GPS местоположение се засича автоматично и сигналът се нанася директно на интерактивната карта на Враца!
          </p>
        </div>

        {/* Quick Scenario Tester Presets (Collapsible Demo Helper) */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDemoPresets(!showDemoPresets)}
              className="text-xs font-semibold text-slate-400 hover:text-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>{showDemoPresets ? 'Скрий тестови примерни сигнали' : '⚙️ Тестови примерни сигнали за Враца (Демо)'}</span>
              {showDemoPresets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showDemoPresets && (
              <button
                type="button"
                onClick={() => formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="text-[11px] text-emerald-400 font-semibold hover:underline flex items-center gap-1 sm:hidden cursor-pointer"
              >
                <span>Към формата</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {showDemoPresets && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 animate-fadeIn">
              {SAMPLE_PHOTO_PRESETS.map((preset, idx) => {
                const isSelected = activePresetName === preset.name;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectPreset(preset)}
                    className={`text-xs p-2.5 rounded-xl transition-all flex items-center gap-2 font-semibold cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-lg shadow-emerald-950 ring-2 ring-emerald-400/50 scale-[1.02]'
                        : 'bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-emerald-500/50'
                    }`}
                    title={`Зареди: ${preset.name}`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      isSelected ? 'bg-white text-emerald-800' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {isSelected ? '✓' : idx + 1}
                    </span>
                    <span className="truncate flex-1">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Submission Form Grid with auto-scroll reference */}
      <div ref={formSectionRef} className="space-y-4">
        {/* Banner if Preset is loaded */}
        {activePresetName && (
          <div className="bg-emerald-950/70 border border-emerald-500/50 p-3 sm:px-4 sm:py-2.5 rounded-2xl text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg animate-in fade-in duration-200">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Зареден примерен сигнал: <strong className="text-white underline">{activePresetName}</strong></span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-emerald-400 font-mono">Снимката и адресът са заредени</span>
              <button
                type="button"
                onClick={scrollToTop}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Най-горе</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Input and Capture */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <span>1. Снимка и GPS локация на проблема</span>
              </h3>
              {imagePreview && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Изчисти</span>
                </button>
              )}
            </div>

            {/* Photo Uploader / Camera */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Снимка на проблема:
              </label>

              {isCameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-black border border-slate-700 aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Направи снимка</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-full transition cursor-pointer"
                    >
                      Затвори
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video bg-slate-950 group">
                  <img
                    src={imagePreview}
                    alt="Преглед на проблема"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800/90 hover:bg-slate-700 text-white text-xs px-3.5 py-2 rounded-xl border border-slate-600 font-semibold shadow-lg transition cursor-pointer"
                    >
                      Смени снимка
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagePreview('')}
                      className="bg-red-900/90 hover:bg-red-800 text-white text-xs px-3.5 py-2 rounded-xl border border-red-700 font-semibold shadow-lg transition cursor-pointer"
                    >
                      Премахни
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-800/40 transition group cursor-pointer active:scale-95"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition" />
                    <span className="text-xs font-semibold text-slate-200">
                      Качи снимка от галерия
                    </span>
                    <span className="text-[10px] text-slate-500">
                      JPG, PNG, WEBP
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-800/40 transition group cursor-pointer active:scale-95"
                  >
                    <Camera className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition" />
                    <span className="text-xs font-semibold text-slate-200">
                      Снимай с камера
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      Директно от телефона
                    </span>
                  </button>
                </div>
              )}

              {/* Hidden file inputs: standard file and native camera capture */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Кратко описание на проблема:
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Напр. Счупена лампа на уличен стълб с оголени кабели, или дълбока дупка на платното..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Location & Automatic GPS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Локация на интерактивната карта:</span>
                </label>
                {onSwitchToMap && (
                  <button
                    type="button"
                    onClick={onSwitchToMap}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Отвори картата</span>
                  </button>
                )}
              </div>

              {/* Automatic GPS status alert card */}
              <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                isGpsDetected
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Navigation className={`w-4 h-4 shrink-0 ${isGpsDetected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate font-medium text-[11px]">{gpsStatusText}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGetGPSLocation}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <Crosshair className="w-3 h-3 text-emerald-400" />
                  <span>Обнови GPS</span>
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {VRATSA_LOCATIONS.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Или въведете точен адрес / номер на блок / квартал"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 50 Points Citizen Bonus Notice */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-amber-950/30 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-lg shrink-0 border border-amber-500/30">
                  ⭐
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Награда: +50 точки за всеки подаден сигнал!
                  </span>
                  <span className="text-[11px] text-emerald-300 font-medium">
                    {currentVolunteer ? (
                      <>Ще се добавят директно към профила на: <strong className="text-white">{currentVolunteer.name}</strong></>
                    ) : (
                      'Запазете ги веднага в доброволческата класация на Враца'
                    )}
                  </span>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-mono font-black shrink-0">
                +50 т.
              </span>
            </div>

            {/* Auto-Claim Task Option (User Request) */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoClaimTask}
                  disabled={Boolean(currentVolunteer?.activeClaimedTaskId)}
                  onChange={(e) => setAutoClaimTask(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Поеми задачата веднага след качване (Аз ще я изпълня лично или с екип)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {currentVolunteer?.activeClaimedTaskId
                      ? '⚠️ Вече имате активна поета задача като ръководител. Завършете я, преди да поемете нова.'
                      : 'Автоматично ще станете ръководител на задачата, статусът ще стане „В изпълнение“ и ще можете да поканите доброволци.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Actions: AI Analysis or Direct 1-Click Submission */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={isAnalyzing || (!imagePreview && !description.trim())}
                onClick={handleAnalyze}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 hover:border-emerald-500/50 flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>AI Анализира...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>1. AI Анализ</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isAnalyzing || (!imagePreview && !description.trim())}
                onClick={handleDirectSubmit}
                className="py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition cursor-pointer hover:scale-[1.01] active:scale-98"
              >
                <Send className="w-4 h-4 text-white" />
                <span>Подай сигнал (+50 т.)</span>
              </button>
            </div>
          </div>

          {/* Right Column: AI Analysis Result & Action Card */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            {analysisResult ? (
              <div className="space-y-5 sm:space-y-6 animate-scaleIn">
                {/* Urgency Highlight banner */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <Flame className={`w-5 h-5 ${
                      analysisResult.urgencyScore >= 80 ? 'text-red-400 animate-pulse' : analysisResult.urgencyScore >= 50 ? 'text-amber-400' : 'text-blue-400'
                    }`} />
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Оценена AI Наложителност:</span>
                      <span className="text-sm font-bold text-white">
                        {analysisResult.urgencyRationale || `Приоритет: ${analysisResult.priority}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-mono font-extrabold tabular-nums ${
                      analysisResult.urgencyScore >= 80 ? 'text-red-400' : analysisResult.urgencyScore >= 50 ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {analysisResult.urgencyScore || 60}/100
                    </span>
                  </div>
                </div>

                {/* Full Analysis Card */}
                <AnalysisCard
                  analysis={analysisResult}
                  imageUrl={imagePreview}
                  userRole={userRole}
                  onSelectCase={onSelectCase}
                />

                {/* Confirmation / Publish Button */}
                {!isSubmittedToBoard ? (
                  <button
                    type="button"
                    onClick={() => handlePublishReport()}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-emerald-950 active:scale-98"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-200" />
                    <span>Потвърди и регистрирай сигнала (+50 т.)</span>
                  </button>
                ) : (
                  <div className="p-5 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl text-center space-y-3 shadow-xl">
                    <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <span>Сигналът е записан успешно и получихте +50 точки!</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Сигналът вече се вижда върху интерактивната карта на Враца с точните му координати.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                      >
                        Подай друг сигнал
                      </button>
                      {onSwitchToMap && (
                        <button
                          type="button"
                          onClick={onSwitchToMap}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg transition cursor-pointer"
                        >
                          Виж на картата
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center text-slate-400 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-base">Очаква се снимка и описание</h4>
                  <p className="text-xs max-w-sm mx-auto text-slate-400 leading-relaxed">
                    След като качите снимка или изберете примерен сигнал, AI ще разпознае проблема, ще изчисли наложителността и ще позиционира сигнала на картата.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
