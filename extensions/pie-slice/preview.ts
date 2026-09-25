import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PIE_ANIMATION_FRAMES, PIE_TYPES, PIE_VIEWS, renderPiePixels } from "./pie-art.ts";

const outputPath = resolve(process.argv[2] ?? "/tmp/pie-slice-gallery.html");
const names: Record<string, string> = {
	"three-quarter": "Three-quarter",
	side: "Side profile",
	"missing-slice": "Slice removed",
	tin: "Fluted tin",
};
const crustStyles: Record<(typeof PIE_TYPES)[number], string> = {
	apple: "Woven lattice",
	"dutch apple": "Streusel",
	blueberry: "Braided rim",
	cherry: "Leaf cutouts",
	lemon: "Meringue rosettes",
	pecan: "Pecan halves",
	pumpkin: "Smooth orange",
};

function svgFor(
	type: (typeof PIE_TYPES)[number],
	view: (typeof PIE_VIEWS)[number],
	viewBox = "0 0 22 22",
	placement = "",
): string {
	const pixels = renderPiePixels(type, view, PIE_ANIMATION_FRAMES - 1);
	let rects = "";
	for (let y = 0; y < pixels.length; y++) {
		for (let x = 0; x < pixels[y]!.length; x++) {
			const pixel = pixels[y]![x];
			if (!pixel) continue;
			const color = `#${pixel.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
			rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
		}
	}
	return `<svg ${placement}viewBox="${viewBox}" role="img" aria-label="${type} pie, ${names[view]}"><rect width="22" height="22" fill="#18181e"/>${rects}</svg>`;
}

const columns = PIE_VIEWS.map((view) => `<div class="column-heading">${names[view]}</div>`).join("");
const rows = PIE_TYPES.map((type) => {
	const label = type.replace(/\b\w/g, (letter) => letter.toUpperCase());
	const cards = PIE_VIEWS.map((view) => `<figure class="card">${svgFor(type, view)}</figure>`).join("");
	return `<div class="row-heading"><strong>${label}</strong><small>${crustStyles[type]}</small></div>${cards}`;
}).join("");
const crustSwatches = PIE_TYPES.map((type) => {
	const label = type.replace(/\b\w/g, (letter) => letter.toUpperCase());
	const crop = type === "blueberry" ? "0 5 22 14" : "3 5 16 12";
	return `<figure class="crust-swatch"><figcaption><strong>${crustStyles[type]}</strong><small>${label}</small></figcaption>${svgFor(type, "three-quarter", crop)}</figure>`;
}).join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pie Slice Art Gallery</title>
<style>
	:root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #111218; color: #e7e9ef; }
	body { margin: 0; padding: 28px; }
	h1 { margin: 0 0 6px; font-size: 22px; }
	p { margin: 0 0 24px; color: #a6adbb; font-size: 14px; }
	.gallery { display: grid; grid-template-columns: 140px repeat(${PIE_VIEWS.length}, minmax(130px, 1fr)); gap: 10px; max-width: 1120px; }
	.column-heading { padding: 8px 12px; color: #c6ccd8; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
	.row-heading { display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 12px; color: #c6ccd8; font-size: 14px; }
	.row-heading small { color: #e0bd78; font-size: 12px; font-weight: 600; letter-spacing: .02em; }
	.card { display: grid; place-items: center; min-height: 164px; margin: 0; border: 1px solid #30333e; border-radius: 10px; background: #18191f; }
	svg { display: block; width: 150px; height: 150px; image-rendering: pixelated; }
	.crust-section { max-width: 1120px; margin-top: 34px; }
	.crust-section h2 { margin: 0 0 6px; font-size: 18px; }
	.crust-section > p { margin-bottom: 14px; }
	.crust-swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
	.crust-swatch { margin: 0; padding: 10px; border: 1px solid #30333e; border-radius: 10px; background: #18191f; }
	.crust-swatch figcaption { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-size: 12px; }
	.crust-swatch figcaption strong { color: #e0bd78; }
	.crust-swatch figcaption small { color: #a6adbb; }
	.crust-swatch svg { width: 100%; height: 110px; }
	@media (max-width: 680px) {
		body { padding: 14px; }
		.gallery { grid-template-columns: 92px repeat(${PIE_VIEWS.length}, minmax(78px, 1fr)); gap: 6px; }
		.card { min-height: 104px; }
		svg { width: min(100%, 100px); height: auto; }
		.row-heading { padding: 6px; font-size: 12px; }
		.crust-swatch svg { height: 90px; }
	}
</style>
</head>
<body>
<h1>Pie Slice Art Gallery</h1>
<p>Every filling and viewpoint, rendered by the extension with settled steam. Crust style is labeled in each row. ${PIE_TYPES.length} fillings × ${PIE_VIEWS.length} views.</p>
<div class="gallery"><div></div>${columns}${rows}</div>
<section class="crust-section">
	<h2>Crust styles</h2>
	<p>Zoomed top-surface samples make each treatment easier to compare.</p>
	<div class="crust-swatches">${crustSwatches}</div>
</section>
</body>
</html>
`;

await writeFile(outputPath, html, "utf8");
console.log(outputPath);
