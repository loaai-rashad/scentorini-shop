// Scents the 3D hero bottle cycles through. The label text mirrors the real labels;
// `id` is the Firestore product the "Shop" button links to, `photo` is the still
// shown while the 3D scene loads (or on devices that can't run it).
export const HERO_SCENTS = [
  {
    id: "49oVuLQYjvt9k9IDZpW1",
    name: "Island Blush",
    forText: "For her",
    notes: "Fruity, Jasmine, Strawberry, Amber.",
    liquid: "#fff1f2", // faint tint of the juice
    glow: "#f4a7b0", // rim light colour behind the bottle
    photo: "https://res.cloudinary.com/dra3yu6s/image/upload/f_auto,q_auto/v1783374447/y35siv7b5aj1o817jwwu.webp",
  },
  {
    id: "title",
    name: "Blue Flame",
    forText: "For him",
    notes: "Pear, Lavender, Cinnamon, Mint, Bergamot, Lemon, Vanilla, Amber",
    liquid: "#eef3ff",
    glow: "#7fa3ea",
    photo: "https://res.cloudinary.com/dra3yu6s/image/upload/f_auto,q_auto/v1783374800/hfivxnhhfni5wnfop6ie.webp",
  },
  {
    id: "v2ofAgOIPkHvcEvH3jEc",
    name: "White Veil",
    forText: "For her",
    notes: "Vanilla, Caramel, Honey, White musk.",
    liquid: "#fff8ec",
    glow: "#e8cf9f",
    photo: "https://res.cloudinary.com/dra3yu6s/image/upload/f_auto,q_auto/v1783374810/hiwx3wb0xtwc83rsrfhw.webp",
  },
];
