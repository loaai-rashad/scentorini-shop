// Draws the bottle labels on <canvas> so they can be used as 3D textures.
// Front: name, "by", the SCENTORINI logo, "For her/him" in script, notes, "50 ml".
// Side: the blue floral pattern from the real bottles.

const CREAM = "#f4efdf";
const INK = "#22262e";
const BLUE = "#21418a";

export const FRONT_SIZE = [1024, 640]; // label aspect matches the bottle front
export const SIDE_SIZE = [400, 640];

let fontsPromise = null;
// Label fonts load only when the 3D hero is used, so other pages pay nothing.
export function loadLabelFonts() {
  if (fontsPromise) return fontsPromise;
  fontsPromise = new Promise((resolve) => {
    if (typeof document === "undefined") return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Allura&display=swap";
    document.head.appendChild(link);
    const done = () => resolve();
    const timeout = setTimeout(done, 2500); // never block the scene on fonts
    link.onload = () =>
      Promise.all([document.fonts.load('600 120px "Cormorant Garamond"'), document.fonts.load('80px "Allura"')])
        .catch(() => {})
        .finally(() => {
          clearTimeout(timeout);
          done();
        });
    link.onerror = () => {
      clearTimeout(timeout);
      done();
    };
  });
  return fontsPromise;
}

let logoPromise = null;
export function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "/images/scentorinilogoo.jpeg";
    });
  }
  return logoPromise;
}

// Shrinks the font until `text` fits `maxWidth`.
function fitFont(ctx, text, maxWidth, size, family, weight = "") {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`.trim();
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= 2;
  } while (s > 10);
  return s;
}

function paperGrain(ctx, w, h) {
  // Subtle paper texture so the label doesn't look like flat plastic.
  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = i % 2 ? "#000" : "#fff";
    ctx.fillRect((i * 9973) % w, (i * 7919) % h, 1.5, 1.5);
  }
  ctx.restore();
}

export function drawFrontLabel(scent, logo) {
  const [w, h] = FRONT_SIZE;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  paperGrain(ctx, w, h);

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const serif = '"Cormorant Garamond", Georgia, "Times New Roman", serif';

  fitFont(ctx, scent.name, w * 0.84, 150, serif, "500");
  ctx.fillText(scent.name, w / 2, h * 0.32);

  ctx.font = `500 46px ${serif}`;
  ctx.fillText("by", w / 2, h * 0.44);

  // Logo (blue on white) — multiply makes its white background vanish into the cream.
  const logoW = w * 0.36;
  const logoH = logo ? (logo.height / logo.width) * logoW : 60;
  const logoX = w * 0.5 - logoW * 0.62;
  const logoY = h * 0.52;
  if (logo) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
    ctx.restore();
  } else {
    ctx.fillStyle = BLUE;
    ctx.font = "900 64px Archivo, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SCENTORINI", logoX, logoY + 56);
    ctx.textAlign = "center";
  }

  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = '76px "Allura", "Brush Script MT", cursive';
  ctx.fillText(scent.forText, logoX + logoW + 34, logoY + logoH * 0.78);

  ctx.textAlign = "center";
  fitFont(ctx, scent.notes, w * 0.88, 50, serif, "500");
  ctx.fillText(scent.notes, w / 2, h * 0.84);

  ctx.textAlign = "right";
  ctx.font = `500 28px ${serif}`;
  ctx.fillText("50 ml", w * 0.95, h * 0.95);
  return c;
}

// Deterministic pseudo-random so the pattern is the same on every load.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function drawSideLabel() {
  const [w, h] = SIDE_SIZE;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);
  const r = rng(7);
  ctx.fillStyle = BLUE;
  ctx.strokeStyle = BLUE;
  // Leaves
  for (let i = 0; i < 70; i++) {
    const x = r() * w;
    const y = r() * h;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * Math.PI * 2);
    ctx.globalAlpha = 0.75 + r() * 0.25;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 + r() * 10, 3.5 + r() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Flowers: five petals around a cream centre
  for (let i = 0; i < 26; i++) {
    const x = r() * w;
    const y = r() * h;
    const size = 8 + r() * 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * Math.PI);
    ctx.globalAlpha = 1;
    for (let p = 0; p < 5; p++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -size, size * 0.55, size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.restore();
  }
  // Fine stems
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    const x = r() * w;
    const y = r() * h;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60, x + (r() - 0.5) * 80, y + (r() - 0.5) * 80);
    ctx.stroke();
  }
  return c;
}

// Speckled grey stone texture for the pebble the bottle stands on.
export function drawStone() {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#5d6066";
  ctx.fillRect(0, 0, s, s);
  const r = rng(42);
  for (let i = 0; i < 9000; i++) {
    const v = Math.floor(70 + r() * 70);
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.25 + r() * 0.35})`;
    const d = r() * 2.6;
    ctx.fillRect(r() * s, r() * s, d, d);
  }
  return c;
}
