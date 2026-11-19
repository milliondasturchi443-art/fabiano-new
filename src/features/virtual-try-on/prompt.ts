/**
 * Текст для Decart Lucy V-TON. Модель понимает английские шаблоны «Substitute…/Add…» и лучше всего
 * работает, когда текст точно описывает то, что на фото (так в примерах Decart).
 * Админ может написать своё описание у товара — тогда используется оно.
 */

const SLOT: Record<string, { mode: "substitute" | "add"; target: string; item: string; fit: string }> = {
  "t-shirts": { mode: "substitute", target: "top", item: "t-shirt", fit: "same neckline, sleeve length and print" },
  tops: { mode: "substitute", target: "top", item: "top", fit: "same neckline and sleeve length" },
  shirts: { mode: "substitute", target: "top", item: "shirt", fit: "same collar, buttons and sleeve length" },
  hoodies: { mode: "substitute", target: "top", item: "hoodie", fit: "same hood, pocket and sleeve length" },
  sweatshirts: { mode: "substitute", target: "top", item: "sweatshirt", fit: "same neckline and cuffs" },
  jackets: { mode: "substitute", target: "upper-body outerwear", item: "jacket", fit: "same collar, zipper or buttons, quilting, pockets and length, worn closed" },
  dresses: { mode: "substitute", target: "outfit", item: "dress", fit: "same neckline, sleeves, waist and hem length" },
  pants: { mode: "substitute", target: "trousers", item: "trousers", fit: "same waist, leg width and length" },
  jeans: { mode: "substitute", target: "trousers", item: "jeans", fit: "same wash, leg width and length" },
  shorts: { mode: "substitute", target: "bottoms", item: "shorts", fit: "same length" },
  skirts: { mode: "substitute", target: "bottoms", item: "skirt", fit: "same length and pleats" },
  shoes: { mode: "substitute", target: "shoes", item: "shoes", fit: "same shape and sole" },
  accessories: { mode: "add", target: "", item: "accessory", fit: "same size and shape" },
};

const COLOR_EN: Record<string, string> = {
  black: "black", white: "white", ivory: "ivory", sand: "sand-beige", camel: "camel",
  brown: "brown", grey: "grey", navy: "navy blue", olive: "olive green", burgundy: "burgundy",
};

export function tryOnPrompt(categorySlug: string, colorCode: string | null, custom?: string | null): string {
  const slot = SLOT[categorySlug] ?? { mode: "substitute" as const, target: "top", item: "garment", fit: "same cut and length" };
  const c = custom?.trim();
  if (c) {
    if (/^(substitute|replace|add|put|change)\b/i.test(c)) return c;
    return slot.mode === "add" ? `Add ${c} to the person` : `Substitute the person's current ${slot.target} with ${c}`;
  }
  const color = colorCode ? COLOR_EN[colorCode] ?? "" : "";
  const item = `the ${color ? `${color} ` : ""}${slot.item} from the reference image`;
  const keep = `matching it exactly: same color, fabric texture, pattern, logo and details, ${slot.fit}; natural fit and realistic folds on the person's body, keep the face, hair and the rest of the outfit unchanged`;
  return slot.mode === "add"
    ? `Add ${item} to the person where it is naturally worn, ${keep}`
    : `Substitute the person's current ${slot.target} with ${item}, ${keep}`;
}
