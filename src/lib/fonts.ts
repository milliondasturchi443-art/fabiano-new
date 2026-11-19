import { Cinzel, Cormorant_Garamond, Great_Vibes, Italiana, Manrope } from "next/font/google";

// Дизайн-система из прототипа FABIANO
export const serif = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-italiana", display: "swap" });
export const caps = Cinzel({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-cinzel", display: "swap" });
export const script = Great_Vibes({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-script", display: "swap" });
export const sans = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["300", "400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });
// Italiana и Cinzel без кириллицы — для русской версии заголовков подстраховка Cormorant
export const serifCyr = Cormorant_Garamond({ subsets: ["cyrillic"], weight: ["400", "500"], variable: "--font-cormorant", display: "swap" });

export const fontVars = [serif.variable, caps.variable, script.variable, sans.variable, serifCyr.variable].join(" ");
