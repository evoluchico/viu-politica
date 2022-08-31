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
import {
	dispatchEventToTab,
	errorReportingEnabled,
	ExperimentArm,
	experimentArm,
	FeedbackType,
	feedbackUiVariant,
	FeedbackUiVariant,
	installationId,
	installReason,
	videosPlayedSet,
} from '../common/common';
import { v4 as uuid } from 'uuid';
import * as telemetryEvents from '../telemetry/generated/main';
import { onboardingCompleted } from '../telemetry/generated/main';
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

		// assign user cohort to opt-out by default
		const experimentArmValue = await experimentArm.acquire(ExperimentArm.OptOut);

		// assign feedback ui cohort randomly
		const feedbackUiVariantValue = await feedbackUiVariant.acquire();

		// initialize played video set
		await videosPlayedSet.acquire();

		// initialize Glean
		const enableUploads = experimentArmValue !== ExperimentArm.OptOut;
		Glean.initialize('regrets.reporter.ucs', enableUploads, {
			serverEndpoint: process.env.TELEMETRY_SERVER,
			appBuild: process.env.EXTENSION_VERSION,
			appDisplayVersion: process.env.EXTENSION_VERSION,
		});

		Glean.setLogPings(loggingOn);

		metadataEvents.installationId.set(installId);
		metadataEvents.experimentArm.set(experimentArmValue);
		metadataEvents.feedbackUiVariant.set(feedbackUiVariantValue);
	}

	private async initializeSentry(): Promise<void> {
		const installationIdValue = await installationId.acquire();
		const experimentArmValue = await experimentArm.acquire();
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
				experimentArm: experimentArmValue,
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

	private async dataCollectionDisabled() {
		const expArm = await experimentArm.acquire();
		return expArm === ExperimentArm.OptOut;
	}

	private async onRegretDetailsSubmitted(message: RegretDetailsSubmittedEvent, tabId: number) {
		if (await this.dataCollectionDisabled()) {
			return;
		}
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
		const cohort = await experimentArm.acquire();

		if (message.triggerOnboarding) {
			await browser.tabs.create({
				url: onboardingUrl,
			});
		}

		log(`video ${message.videoId}, cohort ${cohort}`);

		let feedbackToken;

		const feedbackType = experimentArmToFeedbackType(cohort);

		const actionRequiresToken =
			feedbackType === FeedbackType.NotInterested || feedbackType === FeedbackType.NoRecommend;

		const video = this.videoIndex[message.videoId] as ProcessedVideoData | undefined;
		if (!video && actionRequiresToken) {
			log(`${message.videoId} not found in index, but action ${feedbackType} requires token, skipping`);
			return;
		} else {
			log(`found video in index ${message.videoId}, tabId ${video?.tabId}`);
		}

		if (feedbackType === FeedbackType.NotInterested) {
			feedbackToken = video.tokens.notInterested;
		}

		if (feedbackType === FeedbackType.NoRecommend) {
			feedbackToken = video.tokens.dontRecommend;
		}

		if (!(await this.dataCollectionDisabled())) {
			const videoDataId = recordVideoData(video ? video : { id: message.videoId });
			telemetryEvents.regretAction.record({ feedback_type: feedbackType || 'none', video_data_id: videoDataId });
			mainEventsPing.submit();
			await this.pushEvent(EventType.VideoRegretted, feedbackType, tabId, video);
		}

		return await dispatchEventToTab(tabId, {
			type: EventType.SendVideoFeedback,
			feedbackType,
			feedbackToken,
			videoId: message.videoId,
		});
	}

	private async onVideoBatchRecorded(message: VideoBatchRecordedEvent, tabId: number) {
		log('got video batch data');
		if (await this.dataCollectionDisabled()) {
			return;
		}
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

	// method called from options page
	sendDataDeletionRequest(): void {
		experimentArm.set(ExperimentArm.OptOut);
		Glean.setUploadEnabled(false);
	}

	// method called from onboarding page
	async onOnboardingCompleted(experimentOptedIn: boolean): Promise<void> {
		if (!experimentOptedIn) {
			return;
		}
		Glean.setUploadEnabled(true);

		const experimentArmValue = await experimentArm.reset();
		const installId = await installationId.acquire();
		const feedbackUiVariantValue = await feedbackUiVariant.acquire();

		metadataEvents.installationId.set(installId);
		metadataEvents.experimentArm.set(experimentArmValue);
		metadataEvents.feedbackUiVariant.set(feedbackUiVariantValue);

		onboardingCompleted.record();
		mainEventsPing.submit();
	}

	async updateFeedbackUiVariant(variant: FeedbackUiVariant): Promise<void> {
		await feedbackUiVariant.set(variant);
		metadataEvents.feedbackUiVariant.set(variant);
		mainEventsPing.submit();
	}

	async updateExperimentArm(arm: ExperimentArm): Promise<void> {
		await experimentArm.set(arm);
		metadataEvents.experimentArm.set(arm);
		mainEventsPing.submit();
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

function experimentArmToFeedbackType(arm: ExperimentArm): FeedbackType | null {
	switch (arm) {
		case ExperimentArm.OptOut:
		case ExperimentArm.DislikeAction:
			return FeedbackType.Dislike;
		case ExperimentArm.NotInterestedAction:
			return FeedbackType.NotInterested;
		case ExperimentArm.NoRecommendAction:
			return FeedbackType.NoRecommend;
		case ExperimentArm.RemoveFromHistory:
			return FeedbackType.RemoveFromHistory;
	}
	return null;
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
