import { useMemo, useState } from 'react';
import type { Title } from '../api/types';
import { wantedCode } from '../tracks';
import { useMask } from '../stores/incognito';

interface Props {
	titles: Title[];
	selected: string[];
	onChange: (values: string[]) => void;
	downloaded: Map<string, number[]>;
	unseen: Set<string>;
	historyLoading: boolean;
	historyError: boolean;
	onRefresh: () => void;
}

export default function EpisodePicker({
	titles,
	selected,
	onChange,
	downloaded,
	unseen,
	historyLoading,
	historyError,
	onRefresh
}: Props) {
	const mask = useMask();
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState('all');
	const seasons = useMemo(() => {
		const groups = new Map<number, Title[]>();
		for (const title of titles) {
			if (wantedCode(title) === null) continue;
			const season = title.season!;
			groups.set(season, [...(groups.get(season) ?? []), title]);
		}
		return [...groups]
			.sort(([a], [b]) => b - a)
			.map(([season, episodes]) => ({
				season,
				episodes: episodes.sort((a, b) => a.number! - b.number! || (a.part ?? 0) - (b.part ?? 0))
			}));
	}, [titles]);
	const [open, setOpen] = useState<Set<number>>(
		() => new Set(seasons.length ? [seasons[0].season] : [])
	);
	const picked = new Set(selected);
	const allCodes = titles.map(wantedCode).filter((c): c is string => c !== null);
	const missing = allCodes.filter((c) => !downloaded.has(c));
	const toggle = (code: string) =>
		onChange(picked.has(code) ? selected.filter((c) => c !== code) : [...selected, code]);
	const search = query.trim().toLocaleLowerCase();
	return (
		<section aria-label="Episodes by season" className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
						Episodes
					</h2>
					<p className="mt-1 text-xs text-neutral-500">
						{seasons.length} seasons · {allCodes.length} episodes ·{' '}
						<span className="text-emerald-700 dark:text-emerald-400">
							{downloaded.size} downloaded
						</span>
					</p>
				</div>
				<button
					type="button"
					onClick={onRefresh}
					className="text-xs font-medium text-accent-600 hover:underline"
				>
					Refresh history
				</button>
			</div>
			<div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
				<div className="flex gap-2">
					<input
						aria-label="Search episodes"
						placeholder="Find an episode or S17E1793…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
					/>
					<select
						aria-label="Episode status"
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						className="rounded-lg border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
					>
						<option value="all">All statuses</option>
						<option value="missing">Not downloaded</option>
						<option value="downloaded">Downloaded</option>
					</select>
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
					<button
						type="button"
						disabled={historyLoading || historyError || missing.length === 0}
						onClick={() => onChange(missing)}
						className="text-accent-600 disabled:opacity-40"
					>
						Select not downloaded ({missing.length})
					</button>
					<button
						type="button"
						onClick={() => onChange(allCodes)}
						className="text-neutral-600 dark:text-neutral-300"
					>
						Select all
					</button>
					<button type="button" onClick={() => onChange([])} className="text-neutral-500">
						Clear
					</button>
					<span className="ml-auto text-neutral-500">{selected.length} selected</span>
				</div>
			</div>
			<p className="text-xs text-neutral-500">
				{historyError
					? 'Download history is unavailable. Status cannot be confirmed.'
					: historyLoading
						? 'Checking download history…'
						: 'Downloaded status comes from history; files are not checked on disk.'}
			</p>
			<div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
				{seasons.map(({ season, episodes }) => {
					const visible = episodes.filter((t) => {
						const c = wantedCode(t)!;
						return (
							(!search || `${c} ${t.name}`.toLocaleLowerCase().includes(search)) &&
							(filter === 'all' ||
								(filter === 'downloaded' ? downloaded.has(c) : !downloaded.has(c)))
						);
					});
					if (!visible.length) return null;
					const expanded = open.has(season) || Boolean(search) || filter !== 'all';
					const done = episodes.filter((t) => downloaded.has(wantedCode(t)!)).length;
					const codes = visible.map((t) => wantedCode(t)!);
					const allSelected = codes.every((c) => picked.has(c));
					return (
						<div
							key={season}
							className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
						>
							<div className="flex items-center gap-3 bg-neutral-50 px-3 py-3 dark:bg-neutral-800/50">
								<input
									type="checkbox"
									aria-label={`Select season ${season}`}
									checked={allSelected}
									onChange={() =>
										onChange(
											allSelected
												? selected.filter((c) => !codes.includes(c))
												: [...new Set([...selected, ...codes])]
										)
									}
									className="h-4 w-4 accent-accent-600"
								/>
								<button
									type="button"
									aria-expanded={expanded}
									aria-controls={`season-${season}`}
									onClick={() =>
										setOpen((prev) => {
											const next = new Set(prev);
											next.has(season) ? next.delete(season) : next.add(season);
											return next;
										})
									}
									className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
								>
									<span>
										<span className="text-sm font-semibold">
											{season === 0 ? 'Specials' : `Season ${season}`}
										</span>
										<span className="ml-2 text-xs text-neutral-500">
											{episodes.length} episodes
										</span>
									</span>
									<span className="flex items-center gap-3">
										<span className="text-xs text-emerald-700 dark:text-emerald-400">
											{done}/{episodes.length} downloaded
										</span>
										<span aria-hidden="true" className="text-neutral-400">
											{expanded ? '−' : '+'}
										</span>
									</span>
								</button>
							</div>
							{expanded && (
								<div
									id={`season-${season}`}
									className="divide-y divide-neutral-100 dark:divide-neutral-800"
								>
									{visible.map((t) => {
										const code = wantedCode(t)!;
										const quality = downloaded.get(code);
										return (
											<label
												key={code}
												className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40 ${picked.has(code) ? 'bg-accent-50/60 dark:bg-accent-900/10' : ''}`}
											>
												<input
													type="checkbox"
													aria-label={code}
													checked={picked.has(code)}
													onChange={() => toggle(code)}
													className="h-4 w-4 shrink-0 accent-accent-600"
												/>
												<span className="min-w-0 flex-1">
													<span className="block font-mono text-xs font-medium text-neutral-500">
														{code}
														{unseen.has(code) && !downloaded.has(code) && (
															<span className="ml-2 font-sans text-amber-600">New</span>
														)}
													</span>
													<span className="mt-0.5 block truncate text-sm text-neutral-800 dark:text-neutral-200">
														{mask.title(t.name || `Episode ${t.number}`)}
													</span>
												</span>
												{quality !== undefined ? (
													<span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
														✓ Downloaded
														{quality.length > 0
															? ` · ${quality.map((q) => `${q}p`).join(', ')}`
															: ''}
													</span>
												) : (
													<span className="shrink-0 text-[11px] text-neutral-400">
														{historyLoading || historyError ? 'Unknown' : 'Not downloaded'}
													</span>
												)}
											</label>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
