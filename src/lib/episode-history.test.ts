import assert from 'node:assert/strict';
import { test } from 'vitest';
import { downloadedEpisodes, needsEpisodeDownload } from './episode-history';
import type { HistoryEntry, Title } from './api/types';
const series = 'https://player.pl/seriale-online/ukryta-prawda-odcinki,521';
const titles: Title[] = [1, 2].map((number) => ({
	type: 'episode',
	id: `player-${number}`,
	name: `Episode ${number}`,
	season: 17,
	number,
	language: 'pl',
	description: null,
	date: null,
	cover_url: null,
	year: null
}));
const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
	job_id: 'x',
	service: 'PLAYER',
	title_id: series,
	title: 'Ukryta prawda',
	status: 'completed',
	created_time: '2026-11-17',
	completed_time: null,
	output_files: ['/media/Ukryta.prawda.S17E01.Odcinek.1.1080p.PLAYER.mkv'],
	parameters: {},
	error_message: null,
	...over
});
const status = (rows: HistoryEntry[], ts = titles) =>
	downloadedEpisodes(rows, 'PLAYER', series, ts);
test('maps imported modern Player URLs to the same legacy series', () => {
	const r = status([
		entry({
			title_id:
				'https://player.pl/seriale-online,1/ukryta-prawda-odcinki,36836/odcinek-1,S17E01,12345'
		})
	]);
	assert.deepEqual(r.get('S17E01'), [1080]);
});
test('does not mark selected episodes without a completed output', () => {
	const r = status([entry({ parameters: { wanted: ['S17E01', 'S17E02'] } })]);
	assert.equal(r.has('S17E02'), false);
});
test('ignores failed jobs, samples, no-mux and wrong service or series', () => {
	const r = status([
		entry({ status: 'failed' }),
		entry({ parameters: { sample: '0-30' } }),
		entry({ output_files: ['/x.S17E01.1080p.SAMPLE.mkv'] }),
		entry({ parameters: { no_mux: true } }),
		entry({ service: 'OTHER' }),
		entry({ title_id: 'https://player.pl/seriale-online/different,521' })
	]);
	assert.equal(r.size, 0);
});
test('merges actual output qualities without relying on requested resolution', () => {
	const r = status([
		entry(),
		entry({ output_files: ['/x.S17E01.720p.mkv'], parameters: { quality: [2160] } })
	]);
	assert.deepEqual(r.get('S17E01'), [1080, 720]);
});
test('keeps split parts distinct from a whole episode', () => {
	const ts = [...titles, { ...titles[0], part: 2 }];
	const r = status([entry({ output_files: ['/x.S17E01.Part.2.1080p.mkv'] })], ts);
	assert.equal(r.has('S17E01'), false);
	assert.deepEqual(r.get('S17E01.2'), [1080]);
});
test('isolates history from another remote server', () => {
	assert.equal(status([entry({ parameters: { remote: 'other' } })]).size, 0);
});

test('skips equal or higher downloaded quality and allows upgrades', () => {
	assert.equal(needsEpisodeDownload([1080], [1080]), false);
	assert.equal(needsEpisodeDownload([2160], [1080]), false);
	assert.equal(needsEpisodeDownload([720], [1080]), true);
	assert.equal(needsEpisodeDownload([1080], [720, 2160]), true);
});
test('best available uses each episode maximum, including 720p-only episodes', () => {
	assert.equal(needsEpisodeDownload([720], [], [360, 720]), false);
	assert.equal(needsEpisodeDownload([720], [], [720, 1080]), true);
	assert.equal(needsEpisodeDownload([1080], [], [720, 1080]), false);
	assert.equal(needsEpisodeDownload([], [], [1080]), true);
	assert.equal(needsEpisodeDownload([720], [], []), true);
});
