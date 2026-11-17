import type { HistoryEntry, Title } from './api/types';
import { wantedCode } from './tracks';

function playerSeries(id: string): string | null {
	try {
		const url = new URL(id);
		if (url.hostname !== 'player.pl') return null;
		return /^\/seriale-online(?:,1)?\/([^/,]+),\d+(?:\/|$)/.exec(url.pathname)?.[1] ?? null;
	} catch {
		return null;
	}
}

/** Only completed output files prove an episode was downloaded; selections do not. */
export function downloadedEpisodes(
	history: HistoryEntry[],
	service: string,
	titleId: string,
	titles: Title[],
	remote = ''
): Map<string, number[]> {
	const codes = new Set(titles.map(wantedCode).filter((c): c is string => c !== null));
	const ids = new Set([titleId, ...titles.map((t) => t.id)]);
	const series = service.toUpperCase() === 'PLAYER' ? playerSeries(titleId) : null;
	const result = new Map<string, number[]>();
	for (const entry of history) {
		const params = entry.parameters ?? {};
		if (
			entry.service.toUpperCase() !== service.toUpperCase() ||
			entry.status !== 'completed' ||
			params.sample ||
			params.skip_dl ||
			params.no_mux ||
			String(params.remote ?? '') !== remote
		)
			continue;
		if (!ids.has(entry.title_id) && !(series && playerSeries(entry.title_id) === series)) continue;
		for (const path of entry.output_files) {
			const name = path.split(/[\\/]/).pop() ?? '';
			if (!/\.(mkv|mp4|m4v|webm)$/i.test(name) || /(?:^|[. _-])SAMPLE(?:[. _-]|$)/i.test(name))
				continue;
			const match = /(?:^|[. _-])S(\d+)E(\d+)(?:[. _-]Part[. _-](\d+))?(?=[. _-]|$)/i.exec(name);
			if (!match) continue;
			const code = `S${match[1].padStart(2, '0')}E${match[2].padStart(2, '0')}${match[3] ? '.' + Number(match[3]) : ''}`;
			if (!codes.has(code)) continue;
			const quality = /(?:^|[. _-])(\d{3,4})p(?=[. _-]|$)/i.exec(name);
			const heights = result.get(code) ?? [];
			if (quality && !heights.includes(Number(quality[1]))) heights.push(Number(quality[1]));
			result.set(
				code,
				heights.sort((a, b) => b - a)
			);
		}
	}
	return result;
}

/** Unknown output quality is never sufficient evidence to skip a download. */
export function needsEpisodeDownload(
	owned: number[] | undefined,
	requested: number[],
	available: number[] = []
): boolean {
	if (!owned?.length) return true;
	const targets = requested.length ? requested : available.length ? [Math.max(...available)] : [];
	return !targets.length || targets.some((height) => !owned.some((existing) => existing >= height));
}
