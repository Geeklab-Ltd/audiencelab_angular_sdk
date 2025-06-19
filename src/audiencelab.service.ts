import axios from 'axios';

const API_BASE_URL = 'https://analytics.geeklab.app';

export class AudienceLabService {
	private apiKey: string | null = null;

	setApiKey(key: string): void {
		if (!key) {
			throw new Error('API key cannot be empty');
		}
		this.apiKey = key;
	}

	getApiKey(): string {
		if (!this.apiKey) {
			throw new Error('API key not set. Call initializeAudiencelab first.');
		}
		return this.apiKey;
	}

	async initialize(apiKey: string) {
		if (!apiKey) {
			throw new Error('API key is required to initialize the SDK.');
		}
		this.setApiKey(apiKey);
		console.log('SDK initialized with API key successfully.');

		try {
			const [token, metrics] = await Promise.all([
				this.fetchCreativeToken(),
				this.sendUserMetrics(),
			]);
			return { token, metrics };
		} catch (err) {
			console.error('Failed during initialization:', err);
			throw err;
		}
	}

	createAxiosInstance() {
		return axios.create({
			baseURL: API_BASE_URL,
			headers: {
				'Content-Type': 'application/json',
				'geeklab-api-key': this.getApiKey(),
			},
		});
	}

	handleError(error: any): never {
		if (error.response) {
			const { status, data } = error.response;
			switch (status) {
				case 400:
					throw new Error('Bad request, data not formatted properly.');
				case 401:
					throw new Error('API key is not valid.');
				case 404:
					throw new Error(`Request failed: ${data}`);
				case 500:
					throw new Error(`Server error: ${data}`);
				default:
					throw new Error(`Error: ${data}`);
			}
		}
		console.error('Unexpected error:', error);
		throw new Error('Failed to communicate with the server.');
	}

	async fetchCreativeToken() {
		const { getItem, saveItem } = await import(
			'./utils/storageFunctionalities'
		);
		const { prepareTokenPayload } = await import('./utils/preparePayload');
		const cachedToken = await getItem('creativeToken');
		if (cachedToken) {
			console.log('Using cached creative token:', cachedToken);
			return cachedToken;
		}
		const payload = await prepareTokenPayload();
		const axiosInstance = this.createAxiosInstance();
		try {
			const response = await axiosInstance.post('/fetch-token', payload);
			const token = response.data.token;
			saveItem('creativeToken', token);
			return token;
		} catch (error) {
			this.handleError(error);
		}
	}

	async verifyToken(token: string) {
		const axiosInstance = this.createAxiosInstance();
		try {
			const response = await axiosInstance.post('/verify-token', { token });
			return response.data;
		} catch (error) {
			this.handleError(error);
		}
	}

	async sendUserMetrics() {
		const { updateRetention } = await import('./utils/retentionCalculator');
		const { getItem } = await import('./utils/storageFunctionalities');

		const today = new Date().toLocaleDateString('en-GB');
		const lastSentDate = await getItem('lastSentMetricDate');
		if (lastSentDate === today) {
			return;
		}
		try {
			const retentionData = await updateRetention();
			if (!retentionData) {
				return;
			}
			const resolvedData = await Promise.resolve(retentionData);
			return await this.sendWebhookRequest('retention', resolvedData);
		} catch {
			return;
		}
	}

	async sendCustomPurchaseEvent(
		id: string,
		name: string,
		value: number,
		currency: string,
		status: string
	) {
		const data = {
			item_id: id,
			item_name: name,
			value,
			currency,
			status,
		};
		return this.sendWebhookRequest('custom.purchase', data);
	}

	async sendCustomAdEvent(
		adId: string,
		name: string,
		source: string,
		watchTime: number,
		reward: boolean,
		mediaSource: string,
		channel: string,
		value: number,
		currency: string
	) {
		const data = {
			ad_id: adId,
			name,
			source,
			watch_time: watchTime,
			reward,
			media_source: mediaSource,
			channel,
			value,
			currency,
		};
		return this.sendWebhookRequest('custom.ad', data);
	}

	async sendWebhookRequest(type: string, data: any) {
		const { getDeviceMetrics } = await import('./utils/deviceMetrics');
		const { getItem } = await import('./utils/storageFunctionalities');

		const axiosInstance = this.createAxiosInstance();
		const currentDate = new Date();
		const currentDateText = currentDate
			.toISOString()
			.slice(0, 19)
			.replace('T', ' ');
		const deviceMetrics = getDeviceMetrics();

		const offset = currentDate.getTimezoneOffset();
		const hours = Math.abs(Math.floor(offset / 60));
		const minutes = Math.abs(offset % 60);
		const utcOffset = `${offset <= 0 ? '+' : '-'}${hours
			.toString()
			.padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

		const retentionDay = (await getItem('retentionDay')) || '';
		const creativeToken = await getItem('creativeToken');

		const postData = {
			type,
			created_at: currentDateText,
			creativeToken: creativeToken,
			device_name: (await deviceMetrics).deviceName,
			device_model: (await deviceMetrics).deviceModel,
			os_system: (await deviceMetrics).osVersion,
			utc_offset: utcOffset,
			retention_day: retentionDay,
			payload: data,
		};

		try {
			const response = await axiosInstance.post('/webhook', postData);
			return response.data;
		} catch (error) {
			this.handleError(error);
		}
	}
}
