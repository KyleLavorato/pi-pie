export const PIE_TYPES = ["apple", "dutch apple", "blueberry", "cherry", "lemon", "pecan", "pumpkin"] as const;
export const PIE_VIEWS = ["three-quarter", "side", "missing-slice", "tin"] as const;
export type PieType = (typeof PIE_TYPES)[number];
export type PieView = (typeof PIE_VIEWS)[number];
export type Rgb = readonly [number, number, number];
export type PiePixels = (Rgb | undefined)[][];

const WIDTH = 22;
const HEIGHT = 22;
const CRUST: Rgb = [190, 116, 48];
const CRUST_LIGHT: Rgb = [248, 195, 91];
const CRUST_DARK: Rgb = [112, 62, 34];
const PLATE: Rgb = [181, 190, 202];
const PLATE_LIGHT: Rgb = [226, 231, 236];
const PLATE_DARK: Rgb = [104, 118, 137];
const TIN: Rgb = [80, 86, 99];
const TIN_RIM: Rgb = [145, 151, 162];
const TIN_DARK: Rgb = [49, 54, 66];
const STEAM_BRIGHT: Rgb = [225, 231, 239];
const STEAM: Rgb = [177, 188, 201];
const STEAM_FADE: Rgb = [117, 132, 151];

interface PiePalette {
	filling: Rgb;
	fillingLight: Rgb;
	fillingDark: Rgb;
	topping: Rgb;
	toppingLight: Rgb;
	fruit?: Rgb;
	fruitLight?: Rgb;
}

const PALETTES: Record<PieType, PiePalette> = {
	apple: {
		filling: [166, 74, 32],
		fillingLight: [207, 112, 45],
		fillingDark: [111, 45, 29],
		topping: [232, 174, 76],
		toppingLight: [255, 218, 126],
	},
	"dutch apple": {
		filling: [166, 74, 32],
		fillingLight: [207, 112, 45],
		fillingDark: [111, 45, 29],
		topping: [210, 153, 77],
		toppingLight: [250, 213, 136],
	},
	blueberry: {
		filling: [82, 54, 108],
		fillingLight: [119, 78, 146],
		fillingDark: [49, 36, 76],
		topping: [54, 34, 94],
		toppingLight: [172, 132, 204],
		fruit: [48, 31, 91],
		fruitLight: [131, 91, 176],
	},
	cherry: {
		filling: [161, 39, 48],
		fillingLight: [207, 59, 58],
		fillingDark: [105, 27, 40],
		topping: [233, 174, 88],
		toppingLight: [255, 216, 129],
		fruit: [112, 24, 38],
		fruitLight: [230, 73, 68],
	},
	lemon: {
		filling: [218, 177, 70],
		fillingLight: [249, 218, 112],
		fillingDark: [165, 115, 48],
		topping: [255, 237, 184],
		toppingLight: [255, 250, 220],
	},
	pecan: {
		filling: [124, 66, 37],
		fillingLight: [176, 111, 50],
		fillingDark: [70, 39, 25],
		topping: [77, 42, 27],
		toppingLight: [222, 164, 88],
	},
	pumpkin: {
		filling: [191, 77, 27],
		fillingLight: [239, 132, 43],
		fillingDark: [123, 45, 25],
		topping: [220, 105, 31],
		toppingLight: [250, 164, 53],
	},
};

const STEAM_SOURCES: Record<PieView, ReadonlyArray<readonly [number, number]>> = {
	"three-quarter": [[6, 6], [11, 5], [16, 6]],
	side: [[7, 8], [11, 5], [15, 8]],
	"missing-slice": [[6, 6], [11, 5], [16, 6]],
	tin: [[6, 6], [11, 5], [16, 6]],
};
const STEAM_SWAY = [0, 1, 1, 0, -1, -1, 0];
const STEAM_DELAY_FRAMES = 2;
const STEAM_STAGGER_FRAMES = 2;
const STEAM_LIFETIME_FRAMES = 10;
export const PIE_ANIMATION_FRAMES =
	STEAM_DELAY_FRAMES + (STEAM_SOURCES["three-quarter"].length - 1) * STEAM_STAGGER_FRAMES + STEAM_LIFETIME_FRAMES + 1;

function mod(value: number, divisor: number): number {
	return ((value % divisor) + divisor) % divisor;
}

function latticeColor(x: number, y: number, spacing: number, palette: PiePalette): Rgb | undefined {
	const rising = mod(x + y, spacing) === 0;
	const falling = mod(x - y, spacing) === 0;
	if (!rising && !falling) return undefined;

	// Vary the crossing pixels like over-under pastry strips instead of making
	// every intersection the same bright X.
	if (rising && falling) {
		const crossing = Math.floor((x + y) / spacing) + Math.floor((x - y) / spacing);
		return mod(crossing, 2) === 0 ? palette.toppingLight : palette.topping;
	}
	const band = rising ? Math.floor((x + y) / spacing) : Math.floor((x - y) / spacing);
	return mod(band, 2) === 0 ? palette.topping : palette.toppingLight;
}

function drawTopping(
	pixels: PiePixels,
	type: PieType,
	x: number,
	y: number,
	palette: PiePalette,
): void {
	if (type === "apple") {
		const color = latticeColor(x, y, 6, palette);
		if (color) pixels[y]![x] = color;
		return;
	}

	if (type === "dutch apple") {
		// Uneven little crumb clusters read differently from the woven lattice.
		for (const [cx, cy] of [[5, 10], [9, 8], [14, 10], [18, 11], [7, 14], [12, 13], [16, 15]] as const) {
			const dx = Math.abs(x - cx);
			const dy = Math.abs(y - cy);
			if (dx + dy <= 1) pixels[y]![x] = dx === 0 && dy === 0 ? palette.toppingLight : palette.topping;
		}
		return;
	}

	if (type === "cherry") {
		// Small leaf-shaped openings in the golden top show the red cherry filling.
		for (const [cx, cy, vertical] of [[7, 8, false], [12, 8, true], [16, 10, false], [9, 13, true], [14, 14, false]] as const) {
			const dx = x - cx;
			const dy = y - cy;
			const along = Math.abs(vertical ? dy : dx);
			const across = Math.abs(vertical ? dx : dy);
			if (along <= 2 && across <= 1 && (along < 2 || across === 0)) {
				pixels[y]![x] = along === 0 && across === 0 ? palette.fruitLight! : palette.fruit!;
			}
		}
		return;
	}

	const berryCenters = [[6, 10], [9, 12], [11, 8], [13, 12], [16, 10], [17, 13], [8, 14], [13, 14], [17, 15]] as const;
	if (type === "blueberry") {
		for (const [cx, cy] of berryCenters) {
			const dx = Math.abs(x - cx);
			const dy = Math.abs(y - cy);
			if (dx + dy <= 2) {
				pixels[y]![x] = dx === 1 && dy === 1 ? palette.fruitLight! : palette.fruit!;
			}
		}
		return;
	}

	if (type === "pecan") {
		for (const [cx, cy] of [[7, 11], [11, 10], [15, 11], [9, 14], [14, 14], [18, 12]] as const) {
			const dx = Math.abs(x - cx);
			const dy = Math.abs(y - cy);
			if (dx + dy <= 2) pixels[y]![x] = dx === 0 ? palette.toppingLight : palette.topping;
		}
		return;
	}

	if (type === "pumpkin") return;

	// Lemon's meringue rosettes distinguish it from the smooth pumpkin custard.
	const centers = [[7, 9], [10, 12], [13, 8], [16, 12], [17, 11], [9, 14], [15, 15]] as const;
	for (const [cx, cy] of centers) {
		const dx = Math.abs(x - cx);
		const dy = Math.abs(y - cy);
		if (dx + dy === 1) pixels[y]![x] = palette.toppingLight;
		else if (dx === 0 && dy === 0) pixels[y]![x] = palette.topping;
	}
}

function drawSteam(pixels: PiePixels, view: PieView, frame: number): void {
	const sources = STEAM_SOURCES[view];
	for (let wisp = 0; wisp < sources.length; wisp++) {
		const age = frame - STEAM_DELAY_FRAMES - wisp * STEAM_STAGGER_FRAMES;
		if (age < 0 || age >= STEAM_LIFETIME_FRAMES) continue;
		const [sourceX, sourceY] = sources[wisp]!;

		// New puffs appear at the crust, then rise, curl, and fade into smaller
		// low-contrast pixels. Staggering the three trails keeps the motion soft.
		for (let trail = 0; trail < 4; trail++) {
			const travel = age - trail * 2;
			if (travel < 0 || travel > STEAM_SWAY.length - 1) continue;
			const x = sourceX + STEAM_SWAY[travel]!;
			const y = sourceY - travel;
			const color = travel < 2 ? STEAM_BRIGHT : travel < 4 ? STEAM : STEAM_FADE;
			if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) pixels[y]![x] = color;
		}
	}
}

function drawSettledSteam(pixels: PiePixels, view: PieView): void {
	for (const [sourceX, sourceY] of STEAM_SOURCES[view]) {
		for (const [dx, dy, color] of [
			[0, -2, STEAM_FADE],
			[1, -3, STEAM],
			[0, -4, STEAM_FADE],
		] as const) {
			const x = sourceX + dx;
			const y = sourceY + dy;
			if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) pixels[y]![x] = color;
		}
	}
}

type PlateView = Exclude<PieView, "tin">;

function plateColorAt(x: number, y: number, view: PlateView): Rgb | undefined {
	const [cx, cy, rx, ry] = view === "side"
		? [10.5, 18, 9.5, 2.8]
		: [10.5, 14.2, 10.5, 7.4];
	const dx = (x - cx) / rx;
	const dy = (y - cy) / ry;
	const edge = dx * dx + dy * dy;
	if (edge > 1) return undefined;
	const rim = edge > (view === "side" ? 0.56 : 0.78);
	const lower = y > cy + ry * 0.28;
	return lower ? PLATE_DARK : rim ? PLATE_LIGHT : PLATE;
}

function drawPlate(pixels: PiePixels, view: PlateView): void {
	for (let y = 0; y < HEIGHT; y++) {
		for (let x = 0; x < WIDTH; x++) {
			const color = plateColorAt(x, y, view);
			if (color) pixels[y]![x] = color;
		}
	}
}

function drawTin(pixels: PiePixels): void {
	const cx = 10.5;
	const cy = 14.2;
	const rx = 10.5;
	const ry = 7.4;
	for (let y = 0; y < HEIGHT; y++) {
		for (let x = 0; x < WIDTH; x++) {
			const dx = (x - cx) / rx;
			const dy = (y - cy) / ry;
			const edge = dx * dx + dy * dy;
			if (edge > 1) continue;
			const lip = edge > 0.76;
			const crimp = lip && mod(x + Math.floor(y / 2), 3) === 0;
			pixels[y]![x] = y >= 16 ? TIN_DARK : crimp ? TIN_RIM : lip ? TIN_RIM : TIN;
		}
	}
	// Small rolled ears make the dark pan read differently from a serving plate.
	for (const x of [0, 1, 20, 21]) {
		pixels[14]![x] = x === 0 || x === 21 ? TIN_RIM : TIN_DARK;
	}
}

function drawRoundPie(pixels: PiePixels, type: PieType, palette: PiePalette): void {
	const cx = 10.5;
	const cy = 12.2;
	const rx = 9.4;
	const ry = 6.4;
	for (let y = 0; y < HEIGHT; y++) {
		for (let x = 0; x < WIDTH; x++) {
			const dx = (x - cx) / rx;
			const dy = (y - cy) / ry;
			const radius = dx * dx + dy * dy;
			if (radius > 1) continue;

			const crustBand = type === "blueberry" ? 0.66 : 0.78;
			if (radius >= crustBand) {
				if (type === "blueberry") {
					const braidPhase = Math.floor(y / 2);
					const over = mod(x + braidPhase, 4) === 0;
					const under = mod(x - braidPhase, 4) === 0;
					pixels[y]![x] = over && under ? CRUST_LIGHT : over ? CRUST_DARK : under ? CRUST_LIGHT : CRUST;
				} else {
					const fluting = Math.abs(radius - 0.86) < 0.075 && mod(x + Math.floor(y / 2), 3) === 0;
					const highlight = dy < 0 && mod(x + y, 5) < 2;
					pixels[y]![x] = fluting ? CRUST_DARK : highlight ? CRUST_LIGHT : CRUST;
				}
				continue;
			}

			const base = type === "cherry"
				? dy > 0.42
					? CRUST_DARK
					: dy < -0.25 && dx < 0
						? CRUST_LIGHT
						: CRUST
				: dy > 0.42 || (dx > 0.45 && dy > 0)
					? palette.fillingDark
					: dy < -0.25 && dx < 0
						? palette.fillingLight
						: palette.filling;
			pixels[y]![x] = base;
			drawTopping(pixels, type, x, y, palette);
		}
	}
}

function drawSidePie(pixels: PiePixels, type: PieType, palette: PiePalette): void {
	for (let x = 2; x <= 19; x++) {
		const side = Math.abs(x - 10.5) / 8.5;
		const top = 5 + Math.round(side * 4);
		for (let y = top; y <= 16; y++) {
			if (y === top) {
				pixels[y]![x] = mod(x, 4) === 0 ? CRUST_LIGHT : CRUST;
			} else if (y === top + 1) {
				pixels[y]![x] = mod(x + Math.floor(y / 2), 5) === 0 ? CRUST_DARK : CRUST_LIGHT;
			} else if (y >= 15 || x === 2 || x === 19) {
				pixels[y]![x] = CRUST_DARK;
			} else {
				pixels[y]![x] = y <= top + 3 ? palette.fillingLight : y >= 13 ? palette.fillingDark : palette.filling;
				if (type !== "cherry") drawTopping(pixels, type, x, y, palette);
			}
		}
	}
}

type ArtPoint = readonly [number, number];

function pointInPolygon(x: number, y: number, points: readonly ArtPoint[]): boolean {
	let inside = false;
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i]!;
		const [xj, yj] = points[j]!;
		if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function fillPolygon(
	pixels: PiePixels,
	points: readonly ArtPoint[],
	colorAt: (x: number, y: number) => Rgb,
): void {
	const minX = Math.max(0, Math.floor(Math.min(...points.map(([x]) => x))));
	const maxX = Math.min(WIDTH - 1, Math.ceil(Math.max(...points.map(([x]) => x))));
	const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
	const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.max(...points.map(([, y]) => y))));
	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			if (pointInPolygon(x + 0.5, y + 0.5, points)) pixels[y]![x] = colorAt(x, y);
		}
	}
}

function drawLine(pixels: PiePixels, from: ArtPoint, to: ArtPoint, color: Rgb): void {
	let x = Math.round(from[0]);
	let y = Math.round(from[1]);
	const endX = Math.round(to[0]);
	const endY = Math.round(to[1]);
	const dx = Math.abs(endX - x);
	const sx = x < endX ? 1 : -1;
	const dy = -Math.abs(endY - y);
	const sy = y < endY ? 1 : -1;
	let error = dx + dy;
	while (true) {
		if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT) pixels[y]![x] = color;
		if (x === endX && y === endY) break;
		const twiceError = error * 2;
		if (twiceError >= dy) { error += dy; x += sx; }
		if (twiceError <= dx) { error += dx; y += sy; }
	}
}

function drawMissingSlice(pixels: PiePixels, palette: PiePalette): void {
	const center: ArtPoint = [10.5, 12.2];
	// Follow the pie's curved rim so the whole crust arc is removed with the
	// slice, instead of leaving a little intact border across the opening.
	const rimArc: readonly ArtPoint[] = [
		[19.2, 9.8], [19.8, 12.2], [19.2, 14.6],
		[18.3, 15.8], [16.8, 17], [14.5, 17.9],
	];
	const gap = [center, ...rimArc];

	// Reveal the plate through the full curved wedge, including the crust pixels
	// whose top-left coordinates fall inside the cut. The renderer rasterizes by
	// cell origin, so clearing only cell centers can leave a crust pixel behind.
	for (let y = 0; y < HEIGHT; y++) {
		for (let x = 0; x < WIDTH; x++) {
			if (!pointInPolygon(x, y, gap) && !pointInPolygon(x + 0.5, y + 0.5, gap)) continue;
			pixels[y]![x] = plateColorAt(x, y, "missing-slice") ?? PLATE_DARK;
		}
	}
	const upperEdge = rimArc[0]!;
	const lowerEdge = rimArc[rimArc.length - 1]!;
	drawLine(pixels, center, upperEdge, palette.fillingDark);
	drawLine(pixels, center, lowerEdge, palette.fillingDark);
	drawLine(pixels, [11, 12], [18.5, 10.2], palette.fillingLight);
	drawLine(pixels, [11, 13], [15.5, 17.3], palette.filling);
}

/** Render a flavored pie from the selected viewpoint and animation frame. */
export function renderPiePixels(type: PieType, view: PieView, frame = 0): PiePixels {
	const palette = PALETTES[type];
	const pixels: PiePixels = Array.from({ length: HEIGHT }, () => Array<Rgb | undefined>(WIDTH));
	// Steam is laid down first, so it naturally disappears behind the silhouette.
	drawSteam(pixels, view, frame);
	if (view === "side") {
		drawPlate(pixels, view);
		drawSidePie(pixels, type, palette);
	} else if (view === "tin") {
		drawTin(pixels);
		drawRoundPie(pixels, type, palette);
	} else {
		drawPlate(pixels, view);
		drawRoundPie(pixels, type, palette);
		if (view === "missing-slice") drawMissingSlice(pixels, palette);
	}
	if (frame >= PIE_ANIMATION_FRAMES - 1) drawSettledSteam(pixels, view);
	return pixels;
}

const fg = (color: Rgb): string => `\x1b[38;2;${color[0]};${color[1]};${color[2]}m`;
const bg = (color: Rgb): string => `\x1b[48;2;${color[0]};${color[1]};${color[2]}m`;
const sameColor = (a: Rgb, b: Rgb): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

function pixelPair(top: Rgb | undefined, bottom: Rgb | undefined): string {
	if (!top && !bottom) return " ";
	if (top && bottom && sameColor(top, bottom)) return `${fg(top)}█\x1b[39m`;
	if (top && bottom) return `${fg(top)}${bg(bottom)}▀\x1b[39;49m`;
	if (top) return `${fg(top)}▀\x1b[39m`;
	return `${fg(bottom!)}▄\x1b[39m`;
}

/** Render square bitmap pixels using both half-block samples in each terminal cell. */
export function renderPieArt(type: PieType, view: PieView, frame = 0): string[] {
	const pixels = renderPiePixels(type, view, frame);
	const lines: string[] = [];
	for (let y = 0; y < HEIGHT; y += 2) {
		let line = "";
		for (let x = 0; x < WIDTH; x++) line += pixelPair(pixels[y]![x], pixels[y + 1]![x]);
		lines.push(line);
	}
	return lines;
}

function pick<T extends string>(items: readonly T[], random: () => number): T {
	const value = random();
	const index = Math.max(0, Math.min(items.length - 1, Math.floor(value * items.length)));
	return items[index]!;
}

export function selectPieType(random: () => number = Math.random): PieType {
	return pick(PIE_TYPES, random);
}

const PIE_VIEW_WEIGHTS: Record<PieView, number> = {
	"three-quarter": 2,
	side: 1,
	"missing-slice": 2,
	tin: 2,
};

export function selectPieView(random: () => number = Math.random): PieView {
	const totalWeight = PIE_VIEWS.reduce((sum, view) => sum + PIE_VIEW_WEIGHTS[view], 0);
	let roll = Math.max(0, Math.min(1 - Number.EPSILON, random())) * totalWeight;
	for (const view of PIE_VIEWS) {
		roll -= PIE_VIEW_WEIGHTS[view];
		if (roll < 0) return view;
	}
	return PIE_VIEWS[PIE_VIEWS.length - 1]!;
}
