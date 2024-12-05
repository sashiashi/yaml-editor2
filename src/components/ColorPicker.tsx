import { useState, useEffect, useCallback } from 'react';
import { Shuffle } from 'lucide-react';
import { generateRandomColor } from '../utils/colorUtils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

const presetColors = [
  { r: 255, g: 123, b: 2 },   // オレンジ
  { r: 99, g: 179, b: 237 },  // 青
  { r: 104, g: 211, b: 145 }, // 緑
  { r: 251, g: 191, b: 36 },  // 黄色
  { r: 239, g: 68, b: 68 },   // 赤
  { r: 167, g: 139, b: 250 }, // 紫
];

const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

export const ColorPicker = ({ color = 'rgba(255, 123, 2, 0.4)', onChange }: ColorPickerProps) => {
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState<RGB>({ r: 255, g: 123, b: 2 });
  const [currentHsl, setCurrentHsl] = useState<HSL>({ h: 0, s: 100, l: 50 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const rgb = {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
      setCurrentColor(rgb);
      setCurrentHsl(rgbToHsl(rgb.r, rgb.g, rgb.b));
    }
  }, [color]);

  const handleClick = () => {
    setDisplayColorPicker(!displayColorPicker);
  };

  const handleClose = () => {
    setDisplayColorPicker(false);
  };

  const handlePresetClick = (preset: RGB) => {
    setCurrentColor(preset);
    setCurrentHsl(rgbToHsl(preset.r, preset.g, preset.b));
    onChange(`rgba(${preset.r}, ${preset.g}, ${preset.b}, 0.4)`);
  };

  const handleRandomColor = () => {
    const newColor = generateRandomColor();
    const match = newColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const rgb = {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
      setCurrentColor(rgb);
      setCurrentHsl(rgbToHsl(rgb.r, rgb.g, rgb.b));
      onChange(newColor);
    }
  };

  const handleHueChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hue = (x / rect.width) * 360;
    
    const newHsl = { ...currentHsl, h: Math.max(0, Math.min(360, hue)) };
    setCurrentHsl(newHsl);
    
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setCurrentColor(rgb);
    onChange(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
  }, [currentHsl, onChange]);

  const handleSaturationLightnessChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const s = (x / rect.width) * 100;
    const l = 100 - (y / rect.height) * 100;
    
    const newHsl = {
      ...currentHsl,
      s: Math.max(0, Math.min(100, s)),
      l: Math.max(0, Math.min(100, l))
    };
    setCurrentHsl(newHsl);
    
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setCurrentColor(rgb);
    onChange(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
  }, [currentHsl, onChange]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    if (e.currentTarget.classList.contains('hue-slider')) {
      handleHueChange(e);
    } else {
      handleSaturationLightnessChange(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.classList.contains('hue-slider')) {
      handleHueChange(e);
    } else {
      handleSaturationLightnessChange(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="relative">
      <div
        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 shadow-sm hover:shadow-md transition-shadow"
        style={{ backgroundColor: `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0.4)` }}
        onClick={handleClick}
        title="色を選択"
      />
      {displayColorPicker && (
        <div className="absolute z-10 mt-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-64">
          <div className="fixed inset-0 -z-10" onClick={handleClose} />
          <div className="space-y-4">
            <div
              className="h-32 rounded-lg relative cursor-crosshair"
              style={{
                background: `linear-gradient(to right, #fff 0%, hsl(${currentHsl.h}, 100%, 50%) 100%)`
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, transparent 0%, #000 100%)'
                }}
              />
              <div
                className="absolute w-3 h-3 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${currentHsl.s}%`,
                  top: `${100 - currentHsl.l}%`,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.3)'
                }}
              />
            </div>

            <div
              className="h-4 rounded-lg cursor-pointer hue-slider relative"
              style={{
                background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              <div
                className="absolute w-2 h-4 -translate-x-1/2 pointer-events-none"
                style={{
                  left: `${(currentHsl.h / 360) * 100}%`,
                  background: 'white',
                  border: '1px solid rgba(0,0,0,0.3)'
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="grid grid-cols-6 gap-2 flex-1">
                {presetColors.map((preset, index) => (
                  <button
                    key={index}
                    className="w-8 h-8 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    style={{ backgroundColor: `rgba(${preset.r}, ${preset.g}, ${preset.b}, 0.4)` }}
                    onClick={() => handlePresetClick(preset)}
                  />
                ))}
              </div>
              <button
                onClick={handleRandomColor}
                className="ml-2 p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="ランダムな色"
              >
                <Shuffle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};