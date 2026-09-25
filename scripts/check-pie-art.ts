import {
    PIE_ANIMATION_FRAMES,
    PIE_TYPES,
    PIE_VIEWS,
    renderPieArt,
    renderPiePixels,
    selectPieType,
    selectPieView,
} from "../extensions/pie-slice/pie-art.ts";

const fail = (message: string): never => { throw new Error(message); };
const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

for (const type of PIE_TYPES) {
    for (const view of PIE_VIEWS) {
        const pixels = renderPiePixels(type, view, 0);
        if (pixels.length !== 22 || pixels.some((row) => row.length !== 22)) {
            fail(`${type}/${view}: pixel grid is not 22x22`);
        }
        if (pixels.flat().filter(Boolean).length < 60) {
            fail(`${type}/${view}: art has too few visible pixels`);
        }
        const lines = renderPieArt(type, view, 0);
        if (lines.length !== 11 || lines.some((line) => [...stripAnsi(line)].length !== 22)) {
            fail(`${type}/${view}: terminal art is not 22x11`);
        }
        const finalFrame = renderPiePixels(type, view, PIE_ANIMATION_FRAMES - 1);
        const settledFrame = renderPiePixels(type, view, PIE_ANIMATION_FRAMES + 5);
        if (JSON.stringify(finalFrame) !== JSON.stringify(settledFrame)) {
            fail(`${type}/${view}: settled steam does not persist`);
        }
    }
}

if ((PIE_VIEWS as readonly string[]).includes("overhead")) fail("overhead view should be removed");
if (!PIE_VIEWS.includes("missing-slice")) fail("missing-slice view is absent");
if (!PIE_VIEWS.includes("tin")) fail("fluted-tin view is absent");

for (const view of PIE_VIEWS) {
    const signatures = PIE_TYPES.map((type) =>
        renderPiePixels(type, view, 0).flat().map((pixel) => pixel?.join(",") ?? "_").join(";"),
    );
    if (new Set(signatures).size !== PIE_TYPES.length) fail(`${view}: some fillings render identically`);
}

for (let i = 0; i < PIE_TYPES.length; i++) {
    if (selectPieType(() => i / PIE_TYPES.length) !== PIE_TYPES[i]) fail(`type selector missed ${PIE_TYPES[i]}`);
}

const viewCounts = new Map<string, number>(PIE_VIEWS.map((view) => [view, 0] as [string, number]));
for (let i = 0; i < 700; i++) {
    const view = selectPieView(() => (i + 0.5) / 700);
    viewCounts.set(view, viewCounts.get(view)! + 1);
}
for (const view of PIE_VIEWS) {
    const expected = view === "side" ? 100 : 200;
    if (viewCounts.get(view) !== expected) {
        fail(`${view}: expected ${expected}/700 selections, got ${viewCounts.get(view)}`);
    }
}

if (PIE_ANIMATION_FRAMES !== 17) fail(`expected 17 steam frames, got ${PIE_ANIMATION_FRAMES}`);
const missing = renderPiePixels("apple", "missing-slice", 0);
if (missing[12]![14]?.join(",") !== "181,190,202") fail("missing wedge does not reveal the plate");
if (missing[12]![19]?.join(",") !== "181,190,202" || missing[14]![19]?.join(",") !== "181,190,202") {
    fail("missing wedge left crust pixels on the curved rim");
}
const pumpkin = renderPiePixels("pumpkin", "three-quarter", 0).flat();
if (pumpkin.some((pixel) => pixel?.join(",") === "249,224,189" || pixel?.join(",") === "255,247,220")) {
    fail("pumpkin pie has white rosette topping");
}

const steamColors = new Set(["225,231,239", "177,188,201", "117,132,151"]);
for (const view of PIE_VIEWS) {
    const countSteam = (frame: number) =>
        renderPiePixels("apple", view, frame).flat().filter((pixel) => pixel && steamColors.has(pixel.join(","))).length;
    if (countSteam(8) === 0) fail(`${view}: steam did not animate`);
    if (countSteam(16) === 0) fail(`${view}: settled steam is not visible`);
}

console.log(`pie-art checks passed (${PIE_TYPES.length} fillings x ${PIE_VIEWS.length} views)`);
