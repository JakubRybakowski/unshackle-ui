import type { ReactNode } from 'react';
import type { TrackSummary } from '../tracks';
import { useMask } from '../stores/incognito';
import Badge from './Badge';

export default function TrackOverview({
	summary,
	episodes
}: {
	summary: TrackSummary;
	episodes: { code: string | null; name: string; summary: TrackSummary }[];
}) {
	const mask = useMask();
	const groups: { label: string; content: ReactNode }[] = [
		{
			label: 'Video',
			content: (
				<>
					{summary.heights.map((height) => (
						<Badge key={height}>{height}p</Badge>
					))}
					{summary.ranges.map((range) => (
						<Badge key={range} tone="violet">
							{range}
						</Badge>
					))}
					{summary.vcodecs.map((codec) => (
						<Badge key={codec}>{codec}</Badge>
					))}
				</>
			)
		},
		{
			label: 'Audio',
			content: (
				<>
					{summary.audioLangs.map((lang) => (
						<Badge key={lang} tone="accent">
							{lang}
						</Badge>
					))}
					{summary.audioCodecs.map((codec) => (
						<Badge key={codec}>{codec}</Badge>
					))}
					{summary.atmos && <Badge tone="amber">Atmos</Badge>}
					{summary.counts.audio === 0 && (
						<span className="text-xs text-neutral-500">No audio tracks</span>
					)}
				</>
			)
		},
		{
			label: 'Subtitles',
			content: (
				<>
					{summary.subLangs.map((lang) => (
						<Badge key={lang} tone="accent">
							{lang}
						</Badge>
					))}
					{summary.counts.subtitles === 0 && (
						<span className="text-xs text-neutral-500">No subtitles</span>
					)}
				</>
			)
		}
	];
	return (
		<>
			<p className="mt-1 text-xs text-neutral-500">
				{episodes.length === 1
					? `Preview: ${episodes[0].code ?? mask.title(episodes[0].name)}`
					: `Preview of ${episodes.length} loaded episodes`}{' '}
				· Other episodes may differ.
			</p>
			<dl className="mt-3 grid gap-2 sm:grid-cols-3">
				{groups.map(({ label, content }) => (
					<div key={label} className="rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900/50">
						<dt className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
							{label}
						</dt>
						<dd className="flex flex-wrap items-center gap-1.5">{content}</dd>
					</div>
				))}
			</dl>
			{episodes.length > 1 && (
				<details className="mt-3 text-xs">
					<summary className="cursor-pointer text-neutral-500">
						Details by episode ({episodes.length})
					</summary>
					<div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
						{episodes.map((episode, index) => (
							<div
								key={`${episode.code}-${index}`}
								className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-700"
							>
								<span className="font-mono">{episode.code}</span>
								<span className="min-w-0 truncate">{mask.title(episode.name)}</span>
								<span className="ml-auto text-neutral-500">
									{episode.summary.heights.map((height) => `${height}p`).join(', ')} ·{' '}
									{episode.summary.audioLangs.join(', ')}
								</span>
							</div>
						))}
					</div>
				</details>
			)}
		</>
	);
}
