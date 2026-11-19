/** Текстовая подсказка для Decart Lucy V-TON: модель лучше понимает английские шаблоны «Substitute…/Add…». */

const SLOT: Record<string, { mode: "substitute" | "add"; target: string; item: string }> = {
  "t-shirts": { mode: "substitute", target: "top", item: "t-shirt" },
  tops: { mode: "substitute", target: "top", item: "top" },
  shirts: { mode: "substitute", target: "top", item: "shirt" },
  hoodies: { mode: "substitute", target: "top", item: "hoodie" },
  sweatshirts: { mode: "substitute", target: "top", item: "sweatshirt" },
  jackets: { mode: "substitute", target: "top", item: "jacket" },
  dresses: { mode: "substitute", target: "outfit", item: "dress" },
  pants: { mode: "substitute", target: "pants", item: "trousers" },
  jeans: { mode: "substitute", target: "pants", item: "jeans" },
  shorts: { mode: "substitute", target: "pants", item: "shorts" },
  skirts: { mode: "substitute", target: "bottoms", item: "skirt" },
  shoes: { mode: "substitute", target: "shoes", item: "shoes" },
  accessories: { mode: "add", target: "", item: "accessory" },
};

const COLOR_EN: Record<string, string> = {
  black: "black", white: "white", ivory: "ivory", sand: "sand-beige", camel: "camel",
  brown: "brown", grey: "grey", navy: "navy blue", olive: "olive green", burgundy: "burgundy",
};

export function tryOnPrompt(categorySlug: string, colorCode: string | null): string {
  const slot = SLOT[categorySlug] ?? { mode: "substitute" as const, target: "top", item: "garment" };
  const color = colorCode ? COLOR_EN[colorCode] ?? "" : "";
  const item = `${color ? `${color} ` : ""}${slot.item} from the reference image`;
  const keep = "keeping its exact color, fabric, pattern, logo and cut";
  return slot.mode === "add"
    ? `Add the ${item} to the person where it is naturally worn, ${keep}`
    : `Substitute the current ${slot.target} with the ${item}, ${keep}`;
}
