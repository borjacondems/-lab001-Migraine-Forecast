import React, { useState, ReactNode, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Search, X, CloudRain, Thermometer, Minus, Square, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { CameraBackground } from './components/CameraBackground';
import { BouncingKittens } from './components/BouncingKittens';

// --- Types & Constants ---

type Step = 'entry' | 'analysis' | 'result';

interface WeatherData {
  pressureChange: number;
  tempSwing: number;
  verdict: 'YES' | 'MAYBE' | 'NO';
  explanation: string;
  memeUrl?: string;
}

const CITIES = [
  "Madrid, ES", "Barcelona, ES", "Valencia, ES", "Sevilla, ES", "Zaragoza, ES",
  "Málaga, ES", "Murcia, ES", "Palma, ES", "Las Palmas de Gran Canaria, ES", "Bilbao, ES",
  "Alicante, ES", "Córdoba, ES", "Valladolid, ES", "Vigo, ES", "Gijón, ES",
  "L'Hospitalet de Llobregat, ES", "Vitoria-Gasteiz, ES", "A Coruña, ES", "Elche, ES", "Granada, ES",
  "Terrassa, ES", "Badalona, ES", "Oviedo, ES", "Sabadell, ES", "Cartagena, ES",
  "Jerez de la Frontera, ES", "Móstoles, ES", "Santa Cruz de Tenerife, ES", "Pamplona, ES", "Almería, ES",
  "Alcalá de Henares, ES", "Fuenlabrada, ES", "Leganés, ES", "San Sebastián, ES", "Getafe, ES",
  "Burgos, ES", "Albacete, ES", "Castellón de la Plana, ES", "Santander, ES", "Alcorcón, ES",
  "San Cristóbal de La Laguna, ES", "Logroño, ES", "Badajoz, ES", "Huelva, ES", "Salamanca, ES",
  "Marbella, ES", "Lleida, ES", "Dos Hermanas, ES", "Tarragona, ES", "Torrejón de Ardoz, ES",
  "Parla, ES", "Mataró, ES", "León, ES", "Algeciras, ES", "Santa Coloma de Gramenet, ES",
  "Alcobendas, ES", "Cádiz, ES", "Jaén, ES", "Ourense, ES", "Reus, ES",
  "Telde, ES", "Girona, ES", "Barakaldo, ES", "Lugo, ES", "Santiago de Compostela, ES",
  "Cáceres, ES", "Las Rozas de Madrid, ES", "San Fernando, ES", "Roquetas de Mar, ES", "Lorca, ES",
  "Sant Cugat del Vallès, ES", "San Sebastián de los Reyes, ES", "Cornellà de Llobregat, ES", "El Puerto de Santa María, ES", "Rivas-Vaciamadrid, ES",
  "Melilla, ES", "Pozuelo de Alarcón, ES", "Guadalajara, ES", "Toledo, ES", "Ceuta, ES",
  "Chiclana de la Frontera, ES", "Sant Boi de Llobregat, ES", "El Ejido, ES", "Talavera de la Reina, ES", "Pontevedra, ES",
  "Torrevieja, ES", "Coslada, ES", "Torrent, ES", "Arona, ES", "Vélez-Málaga, ES",
  "Mijas, ES", "Gandia, ES", "Fuengirola, ES", "Alcalá de Guadaíra, ES", "Manresa, ES"
];

const normalizeString = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const MEME_PROMPTS = {
  YES: "A sad crying cat meme, vaporwave aesthetic, high contrast, 90s computer UI, glitch art, hot pink and electric blue accents, white background.",
  MAYBE: "A suspicious squinting cat meme, vaporwave aesthetic, high contrast, 90s computer UI, glitch art, hot pink and electric blue accents, white background.",
  NO: "A happy vibing cat meme with sunglasses, vaporwave aesthetic, high contrast, 90s computer UI, glitch art, hot pink and electric blue accents, white background.",
};

const MEME_TEXTS = {
  YES: "PREPÁRATE, QUE LA PRESIÓN ESTÁ LOQUÍSIMA.",
  MAYBE: "HUELE A PELIGRO, PERO IGUAL TE SALVAS.",
  NO: "TODO TRANQUILO. VIVE TU VIDA, REY/REINA.",
  ERROR: "ERROR EN LA MATRIX. NO SÉ DÓNDE ESTÁS."
};

// --- Components ---

const RetroWindow = ({ title, children, className = "", initialWidth = "480px", topContent }: { title: string, children: ReactNode, className?: string, initialWidth?: string, topContent?: ReactNode }) => {
  const dragControls = useDragControls();
  const [size, setSize] = useState({ width: initialWidth, height: 'auto' });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = windowRef.current?.offsetWidth || 0;
    const startHeight = windowRef.current?.offsetHeight || 0;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newWidth = Math.max(300, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY));
      setSize({ width: `${newWidth}px`, height: `${newHeight}px` });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <motion.div 
      ref={windowRef}
      drag 
      dragControls={dragControls} 
      dragListener={false} 
      dragMomentum={false}
      style={{ 
        width: size.width, 
        height: size.height,
        minWidth: '300px',
        minHeight: '200px'
      }}
      className={`flex flex-col relative ${className}`}
    >
      {topContent}
      <div className="win95-window flex flex-col flex-1">
        <div 
          className="win95-title-bar cursor-move select-none shrink-0" 
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-win95-bg border border-white/50 flex items-center justify-center">
              <div className="w-2 h-2 bg-win95-blue"></div>
            </div>
            <span className="truncate">{title}</span>
          </div>
          <div className="flex gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
            <div className="w-4 h-4 win95-button flex items-center justify-center"><Minus size={10} /></div>
            <div className="w-4 h-4 win95-button flex items-center justify-center"><Square size={10} /></div>
            <div className="w-4 h-4 win95-button flex items-center justify-center"><X size={10} /></div>
          </div>
        </div>
        <div className="p-2 flex-1 overflow-auto min-h-0">
          {children}
        </div>
        {/* Resize Handle */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 flex items-end justify-end p-0.5"
          onPointerDown={handleResize}
        >
          <div className="w-full h-full border-r-2 border-b-2 border-[#808080] opacity-50"></div>
        </div>
      </div>
    </motion.div>
  );
};

const RetroButton = ({ children, onClick, disabled, className = "" }: { children: ReactNode, onClick?: () => void, disabled?: boolean, className?: string }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      px-4 py-1 text-sm transition-all win95-button
      ${disabled 
        ? 'text-gray-500 cursor-not-allowed' 
        : 'hover:bg-win95-bg active:bg-win95-bg'
      }
      ${className}
    `}
  >
    {children}
  </button>
);

export default function App() {
  const [step, setStep] = useState<Step>('entry');
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [result, setResult] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [isGeneratingMeme, setIsGeneratingMeme] = useState(false);

  const filteredCities = CITIES.filter(city => 
    normalizeString(city).includes(normalizeString(query))
  );

  const SAD_CAT_IMAGE = "https://pbs.twimg.com/profile_images/1155645244563742721/tuCu6BT-.jpg";
  const MAYBE_CAT_IMAGE = "https://stickerrs.com/wp-content/uploads/2024/03/Cat-Meme-Stickers-Featured.png"; // New cat stickers image for 'MAYBE'
  const HAPPY_CAT_IMAGE = "https://i.redd.it/ph6px2drilw71.png"; // New happy cat image for 'NO'

  const generateMeme = async (verdict: 'YES' | 'MAYBE' | 'NO') => {
    if (verdict === 'YES') {
      return SAD_CAT_IMAGE;
    }
    if (verdict === 'MAYBE') {
      return MAYBE_CAT_IMAGE;
    }
    if (verdict === 'NO') {
      return HAPPY_CAT_IMAGE;
    }
    try {
      setIsGeneratingMeme(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: MEME_PROMPTS[verdict] }],
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let imageUrl = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      return imageUrl;
    } catch (e) {
      console.error("Meme generation failed", e);
      return `https://picsum.photos/seed/${verdict.toLowerCase()}cat/400/400?grayscale`;
    } finally {
      setIsGeneratingMeme(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCity) return;
    setStep('analysis');
    
    // Simulate weather analysis
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (selectedCity === "Error, ES") {
      setError(true);
      setStep('result');
      return;
    }

    const pressureChange = Math.floor(Math.random() * 12);
    const tempSwing = Math.floor(Math.random() * 15);
    
    let verdict: 'YES' | 'MAYBE' | 'NO';
    let explanation: string;

    if (pressureChange > 5 || tempSwing > 7) {
      verdict = 'YES';
      explanation = "La presión atmosférica está cayendo en picado. Tus neuronas van a hacer pop.";
    } else if (pressureChange > 2 || tempSwing > 3) {
      verdict = 'MAYBE';
      explanation = "Hay movimiento en el cielo. Ten el ibuprofeno a mano por si las moscas.";
    } else {
      verdict = 'NO';
      explanation = "El anticiclón es tu mejor amigo hoy. Cero dramas, 100% vibes.";
    }

    // Generate the actual cat meme
    const memeUrl = await generateMeme(verdict);

    setResult({ pressureChange, tempSwing, verdict, explanation, memeUrl });
    setStep('result');
  };

  const reset = () => {
    setStep('entry');
    setQuery('');
    setSelectedCity(null);
    setResult(null);
    setError(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden selection:bg-win95-blue selection:text-white">
      <CameraBackground />
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'entry' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1
            }}
            style={{
              x: 'calc(var(--head-x, 0) * 120px)',
              y: 'calc(var(--head-y, 0) * 80px)'
            }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full flex flex-col items-center"
          >
            <RetroWindow 
              title="LOCATION_ENTRY.EXE" 
              initialWidth="480px" 
              className="max-w-[95vw]"
              topContent={
                <h1 className="text-4xl mb-8 text-center font-bold text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">MIGRAINE FORECAST v2.0</h1>
              }
            >
              <div className="space-y-6">
                <p className="font-sans text-xs uppercase text-gray-700 font-bold">Introduce tu ciudad para calcular el riesgo de colapso craneal.</p>
                
                <div className="relative">
                  <div className="flex items-center win95-border-inset p-1 gap-2 bg-white">
                    <Search size={18} className="ml-2 text-gray-500" />
                    <input
                      type="text"
                      className="w-full outline-none font-sans uppercase text-sm py-1"
                      placeholder="BUSCAR CIUDAD..."
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setShowDropdown(true);
                        setSelectedCity(null);
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                  </div>

                  {showDropdown && query.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white win95-border z-10 max-h-40 overflow-y-auto font-sans text-sm">
                      {filteredCities.map(city => (
                        <div
                          key={city}
                          className="p-2 hover:bg-win95-blue hover:text-white cursor-pointer uppercase font-bold"
                          onClick={() => {
                            setSelectedCity(city);
                            setQuery(city);
                            setShowDropdown(false);
                          }}
                        >
                          {city}
                        </div>
                      ))}
                      {filteredCities.length === 0 && (
                        <div className="p-2 text-gray-400 italic">CIUDAD NO ENCONTRADA</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <RetroButton 
                    onClick={handleAnalyze} 
                    disabled={!selectedCity}
                    className="w-full"
                  >
                    ANALIZAR SISTEMA
                  </RetroButton>
                </div>
              </div>
            </RetroWindow>
          </motion.div>
        )}

        {step === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1
            }}
            style={{
              x: 'calc(var(--head-x, 0) * 160px)',
              y: 'calc(var(--head-y, 0) * 110px)'
            }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center"
          >
            <RetroWindow 
              title="ANALYZING_ATMOSPHERE.EXE" 
              initialWidth="400px" 
              className="max-w-[95vw]"
              topContent={
                <h1 className="text-4xl mb-8 text-center font-bold text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">MIGRAINE FORECAST v2.0</h1>
              }
            >
              <div className="flex flex-col items-center gap-8 py-8">
                <div className="relative">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-32 h-32 win95-border p-1 flex items-center justify-center bg-white"
                  >
                    <img 
                      src="https://picsum.photos/seed/loadingcat/200/200?grayscale" 
                      alt="Loading cat" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-win95-blue text-white px-2 py-1 font-bold text-[10px] whitespace-nowrap border border-white">
                    {isGeneratingMeme ? 'GENERATING_MEME...' : 'FETCHING_DATA...'}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-win95-blue text-center">
                  {isGeneratingMeme ? 'Invocando al espíritu del gatito...' : 'Sincronizando con los satélites...'}
                </h2>
              </div>
            </RetroWindow>
          </motion.div>
        )}

        {step === 'result' && (
          <>
            {result?.memeUrl && <BouncingKittens imageUrl={result.memeUrl} />}
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1
              }}
              className="w-full flex flex-col items-center"
            >
            <RetroWindow 
              title="ANALYSIS_COMPLETE.LOG" 
              initialWidth="480px" 
              className="max-w-[95vw]"
              topContent={
                <h1 className="text-4xl mb-8 text-center font-bold text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">MIGRAINE FORECAST v2.0</h1>
              }
            >
              {error ? (
                <div className="space-y-4 text-center">
                  <div className="win95-border-inset p-1 bg-black">
                    <img src={`https://picsum.photos/seed/glitch/400/300?blur=2`} alt="Error" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <h2 className="text-2xl text-red-600 font-bold italic">{MEME_TEXTS.ERROR}</h2>
                  <RetroButton onClick={reset}>REINICIAR SISTEMA</RetroButton>
                </div>
              ) : result && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-gray-400 pb-2">
                    <div>
                      <p className="font-sans text-[10px] text-gray-600 font-bold">CIUDAD: {selectedCity}</p>
                      <h2 className={`text-3xl font-bold ${result.verdict === 'YES' ? 'text-red-600' : result.verdict === 'MAYBE' ? 'text-win95-blue' : 'text-green-700'}`}>
                        {result.verdict === 'YES' ? '¡SÍ, TE VA A DAR!' : result.verdict === 'MAYBE' ? 'PUEDE SER...' : 'ESTÁS A SALVO'}
                      </h2>
                    </div>
                    <div className="text-right font-sans text-[10px] font-bold">
                      <div className="flex items-center justify-end gap-1">
                        <CloudRain size={10} /> {result.pressureChange}hPa
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Thermometer size={10} /> {result.tempSwing}°C
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="win95-border p-1 bg-gray-400 mx-auto max-w-[300px]">
                      <div className="win95-border-inset bg-black overflow-hidden relative aspect-square max-h-[250px] mx-auto flex items-center justify-center">
                        <div className="bg-win95-bg border-b border-gray-400 px-2 py-0.5 text-[8px] font-bold flex justify-between absolute top-0 left-0 w-full z-10">
                          <span>MEME_VIEWER.EXE</span>
                          <span>ULTRA_HD_MODE</span>
                        </div>
                        {result.memeUrl ? (
                          <img 
                            src={result.memeUrl} 
                            alt="Cat Meme" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 font-sans text-[10px] text-white">
                            <Loader2 className="animate-spin" />
                            CARGANDO...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="win95-border-inset p-3 font-sans text-sm italic bg-white">
                        "{result.explanation}"
                      </div>
                      
                      <p className="text-xs uppercase font-bold text-center tracking-widest text-win95-blue">
                        {MEME_TEXTS[result.verdict]}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center pt-2">
                    <RetroButton onClick={reset} className="w-full">OTRA PREDICCIÓN</RetroButton>
                  </div>
                </div>
              )}
            </RetroWindow>
          </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* Footer / OS Info */}
      <div className="fixed bottom-0 left-0 w-full bg-win95-bg border-t-2 border-white p-1 flex justify-between font-sans text-[10px] font-bold uppercase tracking-tight shadow-[0_-1px_0_0_#808080]">
        <div className="flex items-center gap-2">
          <div className="bg-win95-bg win95-button px-2 py-0.5 flex items-center gap-1">
            <div className="w-3 h-3 bg-win95-blue"></div>
            <span>Start</span>
          </div>
          <div className="win95-border-inset px-2 py-0.5">
            <span>System: VaporOS v95.4</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="win95-border-inset px-2 py-0.5">
            <span>User: {selectedCity || 'Guest'}</span>
          </div>
          <div className="win95-border-inset px-2 py-0.5 flex items-center gap-2">
            <Loader2 size={10} className="animate-spin" />
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
