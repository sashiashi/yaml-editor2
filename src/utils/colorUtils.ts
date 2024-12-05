// 鮮やかな色を生成するためのHSLカラー設定
const generateRandomColor = (): string => {
  // 色相を0-360の範囲でランダムに
  const hue = Math.floor(Math.random() * 360);
  // 彩度を60-90%の範囲で（鮮やかな色を保証）
  const saturation = Math.floor(Math.random() * 31) + 60;
  // 明度を45-65%の範囲で（見やすい色を保証）
  const lightness = Math.floor(Math.random() * 21) + 45;
  
  // HSLからRGBに変換
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

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

  // RGBの値を0-255の範囲に変換
  const toRGB = (x: number) => Math.round(x * 255);
  
  return `rgba(${toRGB(r)}, ${toRGB(g)}, ${toRGB(b)}, 0.4)`;
};

export { generateRandomColor };