import {
	VERSION,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import {
	center,
	collectPiCommandNames,
	formatCwd,
	formatModelLabel,
	formatThinkingLabel,
	headerColumnWidths,
	padRight,
	pickSlashCommandTips,
} from "./render-utils.ts";
import {
	PIE_ANIMATION_FRAMES,
	renderPieArt,
	selectPieType,
	selectPieView,
	type PieType,
	type PieView,
} from "./pie-art.ts";

const LOGO_ANIMATION_INTERVAL_MS = 130;

function borderLine(
	left: string,
	label: string,
	right: string,
	width: number,
	paint: (text: string) => string,
): string {
	if (width <= 1) return "";
	if (width < 8 || label.length === 0) {
		return paint(truncateToWidth(left + "─".repeat(Math.max(0, width - 2)) + right, width, ""));
	}

	const before = "─── ";
	const after = " ─────";
	const fixedWidth = visibleWidth(before) + visibleWidth(label) + visibleWidth(after);
	const fill = Math.max(0, width - 2 - fixedWidth);
	return `${paint(left)}${paint(before)}${label}${paint(after)}${paint("─".repeat(fill))}${paint(right)}`;
}

function boxedLine(content: string, width: number, paint: (text: string) => string): string {
	if (width <= 2) return truncateToWidth(content, width, "");
	return `${paint("│")}${padRight(content, width - 2)}${paint("│")}`;
}

function twoColumn(
	left: string,
	right: string,
	leftWidth: number,
	rightWidth: number,
	paint: (text: string) => string,
): string {
	// Tips sidebar truncates with an ellipsis; logo half does not.
	return `${padRight(left, leftWidth)} ${paint("│")} ${padRight(right, rightWidth, "…")}`;
}

class PieSliceStartupHeader implements Component {
	private frame = 0;
	private readonly timer: NodeJS.Timeout;
	private readonly pieType: PieType;
	private readonly pieView: PieView;
	/** Cached once so the animation frames don't reshuffle tip commands. */
	private readonly tipCommands: string[];

	constructor(
		private readonly pi: ExtensionAPI,
		private readonly ctx: ExtensionContext,
		private readonly tui: TUI,
	) {
		this.pieType = selectPieType();
		this.pieView = selectPieView();
		const pool = collectPiCommandNames(this.pi.getCommands());
		this.tipCommands = pickSlashCommandTips(pool, {
			fixed: [],
			count: 3,
		});

		this.timer = setInterval(() => {
			if (this.frame < PIE_ANIMATION_FRAMES - 1) {
				this.frame++;
				this.tui.requestRender();
			} else {
				clearInterval(this.timer);
			}
		}, LOGO_ANIMATION_INTERVAL_MS);
		this.timer.unref?.();
	}

	render(width: number): string[] {
		const theme = this.ctx.ui.theme;
		const paint = (s: string) => theme.fg("accent", s);
		const muted = (s: string) => theme.fg("muted", s);
		const dim = (s: string) => theme.fg("dim", s);
		const bold = (s: string) => theme.bold(s);

		if (width < 24) return [paint(`Pie v${VERSION}`)];

		const innerWidth = width - 2;
		const { leftWidth, rightWidth, useTips } = headerColumnWidths(innerWidth);
		const model = formatModelLabel(this.ctx.model);
		const effort = formatThinkingLabel(this.pi.getThinkingLevel());
		const cwd = formatCwd(this.ctx.cwd);

		const leftLines = [
			...renderPieArt(this.pieType, this.pieView, this.frame).map((line) => center(line, leftWidth)),
			"",
			center(bold(`Fresh ${this.pieType} pie`), leftWidth),
			center(muted(`${model} · ${effort} effort`), leftWidth),
			center(dim(cwd), leftWidth),
		];

		// 3 random real pi commands (picked once in constructor).
		const tipDivider = paint("─".repeat(Math.max(8, Math.min(rightWidth, 22))));
		const [cmd0 = "", cmd1 = "", cmd2 = "", cmd3 = ""] = this.tipCommands;
		const tipLines = [
			"",
			paint(bold("Getting started")),
			muted("Ask Pie to bake it"),
			tipDivider,
			paint(bold("Commands")),
			muted(cmd0),
			muted(cmd1),
			muted(cmd2),
			muted(cmd3),
			"",
		];

		const lines = [borderLine("╭", `${paint("Pie")} v${VERSION}`, "╮", width, paint)];
		for (let i = 0; i < leftLines.length; i++) {
			const content = useTips
				? twoColumn(leftLines[i] ?? "", tipLines[i] ?? "", leftWidth, rightWidth, paint)
				: padRight(leftLines[i] ?? "", leftWidth);
			lines.push(boxedLine(content, width, paint));
		}
		lines.push(borderLine("╰", "", "╯", width, paint));
		return lines.map((line) => truncateToWidth(line, width, ""));
	}

	invalidate(): void {}

	dispose(): void {
		clearInterval(this.timer);
	}
}

let activePieSliceHeader: PieSliceStartupHeader | undefined;

function disposeActiveHeader(): void {
	activePieSliceHeader?.dispose();
	activePieSliceHeader = undefined;
}

function applyPieSliceLook(pi: ExtensionAPI, ctx: ExtensionContext): void {
	if (ctx.mode !== "tui") return;

	// Do NOT call setFooter(undefined) here: it would clobber any custom footer
	// another extension set (e.g. status-footer.ts) because setFooter is a single
	// slot where the last caller wins. Leaving the footer untouched keeps whichever
	// footer is already active.
	ctx.ui.setHeader((tui) => {
		disposeActiveHeader();
		activePieSliceHeader = new PieSliceStartupHeader(pi, ctx, tui);
		return activePieSliceHeader;
	});
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		// Defer past other startup handlers so the pie header is the last one to
		// claim the header slot.
		const applyAfterOtherStartupHandlers = setTimeout(() => applyPieSliceLook(pi, ctx), 0);
		applyAfterOtherStartupHandlers.unref?.();
	});

	pi.on("session_shutdown", () => {
		disposeActiveHeader();
	});
}
