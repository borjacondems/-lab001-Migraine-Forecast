import { useEffect, useRef, useState } from 'react';

export const CameraBackground = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const headPosRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const startCamera = async () => {
      console.log("Attempting to access camera...");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported in this environment.");
        setError("CAMERA_API_NOT_SUPPORTED");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Camera access granted.");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("CAMERA_ACCESS_DENIED");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        // --- 1. Head Tracking (on a small scale for performance) ---
        const trackScale = 0.1;
        const tw = Math.ceil(canvas.width * trackScale);
        const th = Math.ceil(canvas.height * trackScale);
        
        // Use a temporary offscreen canvas for tracking if needed, 
        // but for simplicity we can just use a small draw call here 
        // and then overwrite it with the full-res video.
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(video, 0, 0, tw, th);
        const imageData = ctx.getImageData(0, 0, tw, th);
        const data = imageData.data;
        ctx.restore();

        let totalX = 0;
        let totalY = 0;
        let totalWeight = 0;
        let avgBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          avgBrightness += (data[i] + data[i+1] + data[i+2]) / 3;
        }
        avgBrightness /= (data.length / 4);

        const threshold = Math.max(60, avgBrightness * 1.2);

        for (let y = 0; y < th; y++) {
          for (let x = 0; x < tw; x++) {
            const idx = (y * tw + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (brightness > threshold) {
              const weight = Math.pow(brightness / 255, 2);
              totalX += x * weight;
              totalY += y * weight;
              totalWeight += weight;
            }
          }
        }

        if (totalWeight > 0) {
          const targetX = totalX / totalWeight / tw;
          const targetY = totalY / totalWeight / th;
          headPosRef.current.x += (targetX - headPosRef.current.x) * 0.1;
          headPosRef.current.y += (targetY - headPosRef.current.y) * 0.1;
          const invX = 1 - headPosRef.current.x;
          const y = headPosRef.current.y;
          document.documentElement.style.setProperty('--head-x', `${(invX - 0.5) * 2.5}`);
          document.documentElement.style.setProperty('--head-y', `${(y - 0.5) * 2.5}`);
        }

        // --- 2. Full Resolution Video Background with Glitches ---
        ctx.imageSmoothingEnabled = true;
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;
        let drawW, drawH, offsetX, offsetY;

        if (videoAspect > canvasAspect) {
          drawW = canvas.height * videoAspect;
          drawH = canvas.height;
          offsetX = (canvas.width - drawW) / 2;
          offsetY = 0;
        } else {
          drawW = canvas.width;
          drawH = canvas.width / videoAspect;
          offsetX = 0;
          offsetY = (canvas.height - drawH) / 2;
        }

        ctx.save();
        // Increase brightness and contrast for a clearer view
        ctx.filter = 'brightness(1.5) contrast(1.1)';
        ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
        ctx.restore();

        // --- 3. CRT Effect ---
        // Green tint (reduced opacity for more brightness)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Wider scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        for (let i = 0; i < canvas.height; i += 4) {
          ctx.fillRect(0, i, canvas.width, 2);
        }

        // Random noise/static
        if (Math.random() > 0.98) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          for (let i = 0; i < 100; i++) {
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
          }
        }

        // Vignette (reduced opacity for more brightness)
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle RGB mask
        ctx.globalAlpha = 0.08;
        for (let x = 0; x < canvas.width; x += 6) {
          ctx.fillStyle = 'red'; ctx.fillRect(x, 0, 2, canvas.height);
          ctx.fillStyle = 'green'; ctx.fillRect(x + 2, 0, 2, canvas.height);
          ctx.fillStyle = 'blue'; ctx.fillRect(x + 4, 0, 2, canvas.height);
        }
        ctx.globalAlpha = 1.0;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center -z-10">
        <div className="text-win95-blue font-mono text-xs opacity-50 text-center space-y-2">
          <div>[SYSTEM_ERROR]: {error}</div>
          <div className="text-[10px]">PLEASE_CHECK_BROWSER_PERMISSIONS_OR_IFRAME_SETTINGS</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <video ref={videoRef} autoPlay playsInline className="hidden" />
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full object-cover -z-10 bg-black"
        style={{ 
          filter: 'contrast(1.5) brightness(0.8) sepia(1) hue-rotate(80deg) saturate(2) opacity(0.4)' 
        }}
      />
    </>
  );
};
