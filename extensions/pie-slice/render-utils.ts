import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

/**
 * Logo half is the hero (Claude Code style): it takes most of the width and
 * grows on wide terminals so the mark stays centered in a large left area.
 * Tips are a narrow right sidebar that truncates with an ellipsis.
 */
export const MIN_LEFT_WIDTH = 28;
export const MIN_TIPS_WIDTH = 16;
export const MAX_TIPS_WIDTH = 28;
const COLUMN_GAP = 3; // ` ${divider} `

export function formatCwd(cwd: string, home = process.env.HOME): string {
	return home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
}

/** Prefer `provider/id` when available. */
export function formatModelLabel(
	model: { provider?: string; id?: string } | null | undefined,
): string {
	if (!model?.id) return "Default model";
	return model.provider ? `${model.provider}/${model.id}` : model.id;
}

export function formatThinkingLabel(level: string): string {
	return level === "off" ? "off" : level;
}

/**
 * Built-in interactive slash command names. `pi.getCommands()` only returns
 * extension/prompt/skill commands, so we keep this list to surface real host
 * commands in the tips panel.
 */
export const PI_BUILTIN_SLASH_COMMAND_NAMES = [
	"settings",
	"model",
	"scoped-models",
	"export",
	"import",
	"share",
	"copy",
	"name",
	"session",
	"changelog",
	"hotkeys",
	"fork",
	"clone",
	"tree",
	"trust",
	"login",
	"logout",
	"new",
	"compact",
	"resume",
	"reload",
	"quit",
] as const;

/**
 * Build tip lines: `fixed` commands first (always shown), then `count` random
 * picks from the available command pool.
 * Returns slash-prefixed names.
 */
export function pickSlashCommandTips(
	availableNames: readonly string[],
	options: {
		fixed?: readonly string[];
		count?: number;
		exclude?: readonly string[];
		random?: () => number;
	} = {},
): string[] {
	const fixed = [...(options.fixed ?? [])];
	const count = options.count ?? 3;
	const exclude = new Set<string>([...(options.exclude ?? []), ...fixed]);
	const random = options.random ?? Math.random;

	const pool = [...new Set(availableNames.map((n) => n.trim()).filter(Boolean))].filter(
		(name) => !exclude.has(name),
	);

	// Partial Fisher–Yates for `count` samples without bias.
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		const tmp = pool[i]!;
		pool[i] = pool[j]!;
		pool[j] = tmp;
	}

	const picked = pool.slice(0, Math.max(0, count));
	return [...fixed, ...picked].map((name) => (name.startsWith("/") ? name : `/${name}`));
}

/** Collect host builtins + session commands from `pi.getCommands()`. */
export function collectPiCommandNames(sessionCommands: readonly { name: string }[]): string[] {
	const names = new Set<string>(PI_BUILTIN_SLASH_COMMAND_NAMES);
	for (const command of sessionCommands) {
		if (command.name) names.add(command.name);
	}
	return [...names];
}

export function center(text: string, width: number): string {
	if (width <= 0) return "";
	const w = visibleWidth(text);
	if (w >= width) return truncateToWidth(text, width, "…");
	return `${" ".repeat(Math.floor((width - w) / 2))}${text}`;
}

export function padRight(text: string, width: number, ellipsis = ""): string {
	const clipped = truncateToWidth(text, width, ellipsis);
	return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
}

/**
 * Layout widths for the startup header body (Claude Code proportions).
 *
 * - Tips sidebar ≈ 28% of width, clamped to [MIN_TIPS_WIDTH, MAX_TIPS_WIDTH].
 * - Left (logo) gets the rest and stays the wider half.
 * - Narrow: hide tips and give the left column the full inner width.
 */
export function headerColumnWidths(
	innerWidth: number,
	minTipsWidth = MIN_TIPS_WIDTH,
	maxTipsWidth = MAX_TIPS_WIDTH,
	minLeftWidth = MIN_LEFT_WIDTH,
): { leftWidth: number; rightWidth: number; useTips: boolean } {
	if (innerWidth <= 0) {
		return { leftWidth: 0, rightWidth: 0, useTips: false };
	}

	const gap = COLUMN_GAP;
	if (innerWidth < minLeftWidth + gap + minTipsWidth) {
		return { leftWidth: innerWidth, rightWidth: 0, useTips: false };
	}

	let rightWidth = Math.min(maxTipsWidth, Math.max(minTipsWidth, Math.round(innerWidth * 0.28)));
	let leftWidth = innerWidth - gap - rightWidth;

	if (leftWidth < minLeftWidth) {
		leftWidth = minLeftWidth;
		rightWidth = innerWidth - gap - leftWidth;
	}

	// Keep logo half strictly wider than tips.
	if (leftWidth <= rightWidth) {
		leftWidth = Math.ceil((innerWidth - gap) * 0.65);
		rightWidth = innerWidth - gap - leftWidth;
	}

	if (rightWidth < minTipsWidth || leftWidth < minLeftWidth) {
		return { leftWidth: innerWidth, rightWidth: 0, useTips: false };
	}

	return { leftWidth, rightWidth, useTips: true };
}
