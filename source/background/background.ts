import { browser, Runtime, WebRequest } from 'webextension-polyfill-ts';
import Glean from '@mozilla/glean/webext';
import * as Sentry from '@sentry/browser';
import {
	AuthRecordedEvent,
	EventType,
	Message,
	RegretDetailsSubmittedEvent,
	RegretVideoEvent,
	VideoBatchRecordedEvent,
	VideoViewedEvent,
} from '../common/messages';
import { ProcessedEvent, ProcessedVideoData, VideoData } from '../common/dataTypes';
import { errorReportingEnabled, installationId, installReason, videosPlayedSet } from '../common/common';
import { v4 as uuid } from 'uuid';
import * as telemetryEvents from '../telemetry/generated/main';
import * as metadataEvents from '../telemetry/generated/metadata';
import * as videoData from '../telemetry/generated/videoData';
import * as regretDetails from '../telemetry/generated/regretDetails';
import {
	mainEvents as mainEventsPing,
	regretDetails as regretDetailsPing,
	videoData as videoDataPing,
} from '../telemetry/generated/pings';

// inject browser polyfill into global scope
(window as any).browser = browser;

import OnBeforeSendHeadersDetailsType = WebRequest.OnBeforeSendHeadersDetailsType;
import MessageSender = Runtime.MessageSender;
import { onboardingUrl } from '../common/links';

const loggingOn = process.env.ENABLE_BACKGROUND_LOGS === 'true';

function log(...args) {
	if (loggingOn) {
		console.log('[background]', ...args);
	}
}

async function sendMessage(message: Message) {
	const tabs = await browser.tabs.query({
		currentWindow: true,
		active: true,
	});

	for (const tab of tabs) {
		try {
			await browser.tabs.sendMessage(tab.id, message);
		} catch (e) {
			log(e);
		}
	}
}

export class BackgroundScript {
	constructor() {
		this.asyncConstructor();
	}

	authRecorded = false;
	events: Array<ProcessedEvent> = [];
	videoTokens: Record<string, { notInterested: string }> = {};
	videoIndex: Record<string, ProcessedVideoData> = {};

	private async asyncConstructor() {
		this.attachInstallHook();
		await this.initializeExtension();
		await this.initializeSentry();
		this.attachRequestHook();
		this.attachMessageListener();
	}

	private async initializeExtension() {
		// create a unique id identifying this extension installation
		const installId = await installationId.acquire();

		// initialize played video set
		await videosPlayedSet.acquire();

		// initialize Glean
		Glean.initialize(process.env.GLEAN_APPLICATION_ID, true, {
			serverEndpoint: process.env.TELEMETRY_SERVER,
			appBuild: process.env.EXTENSION_VERSION,
			appDisplayVersion: process.env.EXTENSION_VERSION,
		});

		Glean.setLogPings(loggingOn);

		metadataEvents.installationId.set(installId);
	}

	private async initializeSentry(): Promise<void> {
		const installationIdValue = await installationId.acquire();
		Sentry.init({
			enabled: await errorReportingEnabled.acquire(),
			dsn: process.env.SENTRY_DSN,
			release: process.env.EXTENSION_VERSION,
			integrations: function (integrations) {
				return integrations.filter(function (integration) {
					return integration.name !== 'Breadcrumbs';
				});
			},
		});
		Sentry.configureScope((scope) => {
			scope.setUser({
				id: installationIdValue,
			});
			scope.setTags({
				label: 'v2',
			});
		});
	}

	// called from options and onboarding page
	async toggleErrorReporting(enabled: boolean): Promise<void> {
		Sentry.getCurrentHub().getClient().getOptions().enabled = enabled;
		await errorReportingEnabled.set(enabled);
	}

	private attachInstallHook() {
		browser.runtime.onInstalled.addListener(async (details) => {
			await installReason.set(details.reason);
			if (details.reason === 'update') {
				const [major] = details.previousVersion.split('.');
				const majorVersion = parseInt(major, 10);
				console.log(majorVersion);
				if (majorVersion > 1) {
					// dont show onboarding for v2 updates
					return;
				}
			}
			browser.tabs.create({ url: 'get-started/index.html', active: true });
		});
	}

	private attachRequestHook() {
		browser.webRequest.onSendHeaders.addListener(
			(details) => {
				log(`request ${details.url} from tab ${details.tabId}`);
				log(`headers`, details.requestHeaders);
				const userAuth = getUserAuth(details);
				if (userAuth) {
					log('recorded user auth request', userAuth);
					this.authRecorded = true;
					sendMessage({
						type: EventType.AuthRecorded,
						keyId: userAuth.key,
						headers: userAuth.headers,
					} as AuthRecordedEvent);
				}
			},
			{ urls: ['*://*.youtube.com/youtubei/v1/*'], types: ['xmlhttprequest'] },
			['requestHeaders'],
		);
	}

	private async onVideoViewedEvent(message: VideoViewedEvent, tabId: number) {
		log('got single video data');
		// update played videos set
		const playedVideos = await videosPlayedSet.acquire();
		playedVideos[message.data.id] = true;
		await videosPlayedSet.set(playedVideos);

		const playedVideoCount = Object.keys(playedVideos).length;
		this.videoIndex[message.data.id] = {
			tabId,
			...message.data,
		};
		await this.pushEvent(EventType.VideoViewed, 'VideoViewed' as any, tabId, message.data);
		telemetryEvents.videoPlayed.record({ videos_played: playedVideoCount });
	}

	private attachMessageListener() {
		browser.runtime.onMessage.addListener(async (message: Message, sender: MessageSender) => {
			log('message received', message);

			const tabId = sender.tab.id!;

			if (message.type === EventType.VideoViewed) {
				return this.onVideoViewedEvent(message, tabId);
			}

			if (message.type === EventType.VideoBatchRecorded) {
				return this.onVideoBatchRecorded(message, tabId);
			}

			if (message.type === EventType.RegretDetailsSubmitted) {
				return this.onRegretDetailsSubmitted(message, tabId);
			}

			if (message.type === EventType.RegretVideo) {
				return this.onRegretVideoEvent(message, tabId);
			}
		});
	}

	private async onRegretDetailsSubmitted(message: RegretDetailsSubmittedEvent, tabId: number) {
		const video = this.videoIndex[message.videoId];
		const videoDataId = recordVideoData(video ? video : { id: message.videoId });
		regretDetails.videoDataId.set(videoDataId);
		regretDetails.feedbackText.set(message.feedbackText);
		regretDetailsPing.submit();
		return this.pushEvent(EventType.RegretDetailsSubmitted, 'RegretDetailsSubmitted', tabId, {
			videoId: message.videoId,
			feedbackText: message.feedbackText,
		});
	}

	private async onRegretVideoEvent(message: RegretVideoEvent, tabId: number) {
		if (message.triggerOnboarding) {
			await browser.tabs.create({
				url: onboardingUrl,
			});
		}

		log(`video ${message.videoId}`);

		const video = this.videoIndex[message.videoId] as ProcessedVideoData | undefined;

		const videoDataId = recordVideoData(video ? video : { id: message.videoId });
		telemetryEvents.regretAction.record({ video_data_id: videoDataId });
		mainEventsPing.submit();
		await this.pushEvent(EventType.VideoRegretted, null, tabId, video);
	}

	private async onVideoBatchRecorded(message: VideoBatchRecordedEvent, tabId: number) {
		log('got video batch data');
		for (const videoData of message.data) {
			this.videoIndex[videoData.id] = {
				tabId,
				...videoData,
			};
			this.videoTokens[videoData.id] = {
				...this.videoTokens[videoData.id],
				...videoData.tokens,
			};
			await this.pushEvent(EventType.VideoBatchRecorded, message.batchType, tabId, videoData);
			const videoDataId = recordVideoData(videoData);
			telemetryEvents.videoRecommended.record({
				video_data_id: videoDataId,
				recommendation_type: message.batchType,
			});
		}
		mainEventsPing.submit();
		return;
	}

	private async getUniquePlayedVideosCount() {
		const playedVideos = await videosPlayedSet.acquire();
		const playedVideoCount = Object.keys(playedVideos).length;
		return playedVideoCount;
	}

	async pushEvent(type: EventType, subtype: any, tabId: number, payload: any) {
		this.events.unshift({
			id: uuid(),
			timestamp: new Date(),
			counter: await this.getUniquePlayedVideosCount(),
			type,
			tabId,
			subtype,
			payload,
		});
	}
}

(window as any).bg = new BackgroundScript();

function getUserAuth(details: OnBeforeSendHeadersDetailsType): { key: string; headers: Record<string, string> } | void {
	const url = new URL(details.url);
	const key = url.searchParams.get('key');
	if (key) {
		const headers = Object.fromEntries(details.requestHeaders.map((h) => [h.name, h.value]));
		const hasAuth = 'Authorization' in headers;
		if (hasAuth) {
			return { key, headers };
		}
	}
}

function recordVideoData(data: Partial<VideoData>): string {
	const videoDataId = uuid();
	const payload = {
		uuid: videoDataId,
		id: data.id,
		title: data.title,
		viewCount: data.views,
		channelId: data.channel?.url,
		description: data.description,
	};

	Object.keys(payload).forEach(function (key: keyof typeof payload) {
		const value = payload[key];
		if (typeof value !== 'undefined') {
			videoData[key].set(value);
		}
	});
	videoDataPing.submit();
	return videoDataId;
}
