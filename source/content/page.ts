/** This file get bundled for injection. So only type imports are allowed here */
import type { Data, ProcessedVideoData } from '../common/dataTypes';
import type { VideoBatchRecordedEvent, VideoViewedEvent, PagePingEvent } from '../common/messages';

export enum VideoThumbnailType {
	SidebarRecommendation = 'SidebarRecommendation',
	HomePageRecommendation = 'HomePageRecommendation',
	Other = 'OtherRecommendation',
}

export enum EventType {
	VideoBatchRecorded = 'VideoBatchRecorded',
	VideoViewed = 'VideoViewed',
}

const loggingOn = process.env.ENABLE_PAGE_LOGS === 'true';

// Track last recorded window href
let lastLocation = window.location.href;

// Keeps track of all videos seen on page to avoid reporting duplicates
const seenVideosOnPage = new Set();

let lastViewedVideo: string | null = null;

function postMessage(message: any) {
	window.postMessage(message, window.location.origin);
}

function log(...args) {
	if (loggingOn) {
		console.log('[page]', ...args);
	}
}

/** Extracts video data from YT metadata found in DOM */
function processVideo(r: Data): ProcessedVideoData | null {
	const id = r.videoId;
	if (seenVideosOnPage.has(id)) {
		return null;
	} else {
		seenVideosOnPage.add(id);
	}

	const title = r.title.simpleText || (r.title as any).runs[0].text;
	const length = r.lengthText?.simpleText;
	const views = r.shortViewCountText.simpleText;
	const channelDetails = r.longBylineText.runs[0];
	const seenAt = new Date();
	const channel = {
		title: channelDetails.text,
		url: channelDetails.navigationEndpoint.browseEndpoint.canonicalBaseUrl,
	};

	const notInterestedAction = r.menu.menuRenderer.items.find(
		(m) => m?.menuServiceItemRenderer.icon.iconType === 'NOT_INTERESTED',
	);

	const dontRecommendAction = r.menu.menuRenderer.items.find(
		(m) => m?.menuServiceItemRenderer.icon.iconType === 'REMOVE',
	);

	const tokens = {
		notInterested: notInterestedAction?.menuServiceItemRenderer.serviceEndpoint.feedbackEndpoint.feedbackToken,
		dontRecommend: dontRecommendAction?.menuServiceItemRenderer.serviceEndpoint.feedbackEndpoint.feedbackToken,
	};
	return { id, title, length, views, channel, tokens, seenAt };
}

function parseVideosOnPage() {
	if (lastLocation !== window.location.href) {
		seenVideosOnPage.clear();
		lastLocation = window.location.href;
	}

	const mainVideo = parseMainVideoData();
	if (mainVideo) {
		postMessage({ type: EventType.VideoViewed, data: mainVideo } as VideoViewedEvent);
	}

	{
		const domNodes = Array.from(document.getElementsByTagName('ytd-rich-item-renderer'));
		const data = domNodes
			.map((d) => (d as any).__data.data.content.videoRenderer as Data)
			.filter((d) => !!d)
			.map(processVideo)
			.filter((v) => v !== null);
		log('scrapping new "explore" videoIndex', data);
		if (data.length > 0) {
			postMessage({
				type: EventType.VideoBatchRecorded,
				batchType: VideoThumbnailType.HomePageRecommendation,
				data,
			} as VideoBatchRecordedEvent);
		}
	}

	{
		const domNodes = Array.from(document.getElementsByTagName('ytd-compact-video-renderer'));
		const data = domNodes
			.map((d) => (d as any).__data.data as Data)
			.filter((d) => !!d)
			.map(processVideo)
			.filter((v) => v !== null);
		log('scrapping new related videoIndex', data);
		if (data.length > 0) {
			postMessage({
				type: EventType.VideoBatchRecorded,
				batchType: VideoThumbnailType.SidebarRecommendation,
				data,
			} as VideoBatchRecordedEvent);
		}
	}

	{
		const domNodes = Array.from(document.getElementsByTagName('ytd-video-renderer'));
		const data = domNodes
			.map((d) => (d as any).__data.data as Data)
			.filter((d) => !!d)
			.map(processVideo)
			.filter((v) => v !== null);
		log('scrapping misc videoIndex', data);
		if (data.length > 0) {
			postMessage({
				type: EventType.VideoBatchRecorded,
				batchType: VideoThumbnailType.Other,
				data,
			} as VideoBatchRecordedEvent);
		}
	}
}

/** Listen for messages from content script */
function listenForMessages() {
	window.addEventListener('message', (e: MessageEvent<PagePingEvent>) => {
		const isSameOrigin = e.origin === window.location.origin;
		const isPollEvent = e.data.type === 'ping';
		if (!isSameOrigin || !isPollEvent) {
			return;
		}
		onPollEvent(e.data);
	});
}

function parseMainVideoData(): ProcessedVideoData | void {
	const node = document.getElementsByTagName('ytd-watch-flexy')[0] as any;
	if (!node) {
		return;
	}
	const r = node.__data;

	const id = r.videoId;
	log('scrapping currently viewed video', id);
	if (r.hidden === true || !r.videoId) {
		log('no active video being viewed');
		return;
	}
	if (lastViewedVideo === r.videoId) {
		log("video didn't change");
		return null;
	} else {
		lastViewedVideo = r.videoId;
	}

	const videoDetails = r.playerData.videoDetails;
	const { shortDescription: description, lengthSeconds: length, viewCount: views, title, author } = videoDetails as any;
	const seenAt = new Date();
	const channel = {
		title: author,
		url: '?',
	};

	const tokens = {
		notInterested: undefined,
		dontRecommend: undefined,
	};
	return { id, title, length, views, channel, tokens, seenAt, description };
}

function onPollEvent({ onboardingCompleted, dataCollectionEnabled }: PagePingEvent) {
	if (onboardingCompleted && dataCollectionEnabled) {
		parseVideosOnPage();
	}
}

export default function () {
	log('inject scrapping script');
	listenForMessages();
}
