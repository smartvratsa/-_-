import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ReportItem, Coordinates } from '../types';
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
  Map
} from 'lucide-react';

interface SubmitSectionProps {
  onReportCreated: (report: ReportItem) => void;
  userRole: 'citizen' | 'official';
  onSelectCase: (code: string) => void;
  prefilledCoords?: { lat: number; lng: number; districtName: string } | null;
  onSwitchToMap?: () => void;
}

export const SubmitSection: React.FC<SubmitSectionProps> = ({
  onReportCreated,
  userRole,
  onSelectCase,
  prefilledCoords,
  onSwitchToMap
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  // When prefilled coordinates are received from map pin drop
  useEffect(() => {
    if (prefilledCoords) {
      setSelectedCoordinates({ lat: prefilledCoords.lat, lng: prefilledCoords.lng });
      setCustomLocation(`ул./район във Враца (координати: ${prefilledCoords.lat.toFixed(4)}, ${prefilledCoords.lng.toFixed(4)}) - кв. ${prefilledCoords.districtName}`);
    }
  }, [prefilledCoords]);

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnalysisResult(null);
        setIsSubmittedToBoard(false);
      };
      reader.readAsDataURL(file);
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
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setErrorMessage('Не може да бъде осъществен достъп до камерата на устройството.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        stopCamera();
        setAnalysisResult(null);
        setIsSubmittedToBoard(false);
      }
    }
  };

  // Preset selector with active highlight and smooth auto-scroll to form
  const selectPreset = (preset: typeof SAMPLE_PHOTO_PRESETS[0]) => {
    setActivePresetName(preset.name);
    setImagePreview(preset.imageUrl);
    setDescription(preset.description);
    setLocation(preset.location);
    if (preset.coordinates) {
      setSelectedCoordinates(preset.coordinates);
    }
    setAnalysisResult(null);
    setIsSubmittedToBoard(false);
    setErrorMessage(null);

    // Smoothly scroll down to the form so phone users immediately see the loaded problem
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  // GPS geolocation
  const handleGetGPSLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setSelectedCoordinates({ lat, lng });
          const coords = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (Враца)`;
          setLocation(coords);
        },
        () => {
          setLocation('пл. „Христо Ботев“, Център, Враца');
          setSelectedCoordinates({ lat: 43.2032, lng: 23.5474 });
        }
      );
    }
  };

  // Trigger Gemini Analysis with client fallback for static hosting
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
          headers: {
            'Content-Type': 'application/json',
          },
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
        // Static hosting fallback (e.g. GitHub Pages without Node backend)
      }

      // If backend was unreachable or returned non-200, compute with intelligent client engine
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
  const handlePublishReport = () => {
    if (!analysisResult) return;

    const activeLocation = customLocation.trim() || location;
    const ticketNum = `СИГ-VRZ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    // extract neighborhood guess
    let neighborhood = 'Център';
    if (activeLocation.includes('Дъбника')) neighborhood = 'ж.к. Дъбника';
    else if (activeLocation.includes('Младост')) neighborhood = 'ж.к. Младост';
    else if (activeLocation.includes('Сениче')) neighborhood = 'ж.к. Сениче';
    else if (activeLocation.includes('Хижата')) neighborhood = 'Парк Хижата';
    else if (activeLocation.includes('Медковец')) neighborhood = 'ж.к. Медковец';

    const newReport: ReportItem = {
      id: `rep-${Date.now()}`,
      ticketNumber: ticketNum,
      title: analysisResult.problem,
      description: description || analysisResult.problem,
      location: activeLocation,
      neighborhood: neighborhood,
      coordinates: selectedCoordinates,
      imageUrl: imagePreview || 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=800&q=80',
      createdAt: 'Току-що',
      analysis: analysisResult,
      status: analysisResult.path === 'blue' ? 'одобрен' : 'нови',
      volunteersCount: 0,
      volunteers: [],
      blurPersonalData: analysisResult.contains_personal_data,
      historyLog: [
        {
          timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: 'Гражданин',
          action: `Подаден сигнал (${ticketNum}) на картата на Враца`
        },
        {
          timestamp: 'Днес, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: 'AI Градски помощник Враца',
          action: `Определен индекс на наложителност: ${analysisResult.urgencyScore || 60}/100. Път: "${analysisResult.path}".`,
          badge: 'AI Оценка'
        }
      ]
    };

    onReportCreated(newReport);
    setIsSubmittedToBoard(true);
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
    <div className="space-y-8 animate-fadeIn">
      {/* Introduction Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Оценка на наложителност и план за действие</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Подай сигнал за проблем във Враца
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Сигнализирайте за счупено осветление, дупки, повредени пейки или отпадъци. Изкуственият интелект определя степента на наложителност (1-100), позиционира сигнала на градската карта и насочва задачата към доброволци или компетентните аварийни служби.
          </p>
        </div>

        {/* Quick Scenario Tester Presets with Active Highlight */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <span className="text-xs font-semibold text-slate-300 block mb-2.5">
            Тествай бърз примерен сигнал за Враца (кликнете за автоматично зареждане и скролване):
          </span>
          <div className="flex gap-2 flex-wrap">
            {SAMPLE_PHOTO_PRESETS.map((preset, idx) => {
              const isSelected = activePresetName === preset.name;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 font-semibold cursor-pointer select-none ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-lg shadow-emerald-950 ring-2 ring-emerald-400/50 scale-105'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50'
                  }`}
                  title={`Зареди: ${preset.name}`}
                >
                  {isSelected && <span className="text-emerald-200 font-black">✓</span>}
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Submission Form Grid with auto-scroll reference */}
      <div ref={formSectionRef} className="space-y-4">
        {activePresetName && (
          <div className="bg-emerald-950/70 border border-emerald-500/50 px-4 py-2.5 rounded-2xl text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-in fade-in duration-200">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Зареден примерен сигнал: <strong className="text-white underline">{activePresetName}</strong></span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono hidden sm:inline">Снимката и адресът са попълнени</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input and Capture */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <span>1. Снимка и локация на проблема</span>
              </h3>
            {imagePreview && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
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
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Направи снимка</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-full transition"
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
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-800/40 transition group"
                >
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition" />
                  <span className="text-xs font-semibold text-slate-200">
                    Качи снимка от файл
                  </span>
                  <span className="text-[10px] text-slate-500">
                    JPG, PNG или WEBP
                  </span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-800/40 transition group"
                >
                  <Camera className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition" />
                  <span className="text-xs font-semibold text-slate-200">
                    Снимай с камера
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Директно от телефон/лаптоп
                  </span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
              placeholder="Напр. Счупена лампа на стълб срещу театъра с висящ кабел, или счупени дъски на пейка в парка..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Местоположение във Враца:
              </label>
              {onSwitchToMap && (
                <button
                  type="button"
                  onClick={onSwitchToMap}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                >
                  <Map className="w-3.5 h-3.5" />
                  Посочи на картата
                </button>
              )}
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
              <button
                type="button"
                onClick={handleGetGPSLocation}
                title="Вземи моята GPS локация"
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-2 rounded-xl transition"
              >
                <Crosshair className="w-4 h-4 text-emerald-400" />
              </button>
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

          {/* Analyze action button */}
          <button
            type="button"
            disabled={isAnalyzing || (!imagePreview && !description)}
            onClick={handleAnalyze}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-emerald-200" />
                <span>AI анализира наложителността и генерира план...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-emerald-200" />
                <span>AI Анализ на наложителността</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Analysis Result & Action Card */}
        <div className="lg:col-span-6 space-y-6">
          {analysisResult ? (
            <div className="space-y-6 animate-scaleIn">
              {/* Urgency Highlight banner */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className={`w-5 h-5 ${
                    analysisResult.urgencyScore >= 80 ? 'text-red-400' : analysisResult.urgencyScore >= 50 ? 'text-amber-400' : 'text-blue-400'
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
                  onClick={handlePublishReport}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition"
                >
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>Потвърди и регистрирай сигнала на картата на Враца</span>
                </button>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span>Сигналът е записан успешно и се вижда на картата!</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs text-slate-300 underline hover:text-white"
                  >
                    Подай друг сигнал
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Очаква се снимка и описание</h4>
                <p className="text-xs max-w-sm mx-auto text-slate-400 leading-relaxed">
                  След като заредите снимка и натиснете бутона за анализ, Gemini AI ще разпознае проблема, ще определи наложителността и ще състави предварителен план за действие.
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
