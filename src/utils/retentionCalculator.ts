import { saveItem, getItem } from './storageFunctionalities';

export const initializeFirstLogin = async () => {
	const today = new Date().toLocaleDateString('en-GB'); // dd/MM/yyyy format
	await saveItem('firstLogin', today);
	await saveItem('lastLogin', today);
};

export const updateRetention = async () => {
	const today = new Date().toLocaleDateString('en-GB');

	const lastSentMetricDate = await getItem('lastSentMetricDate');
	if ((await lastSentMetricDate) === today) {
		return null;
	}

	const lastLogin = (await getItem('lastLogin')) || today;
	const firstLogin = await getItem('firstLogin');

	if (!firstLogin) {
		await initializeFirstLogin();
		return null;
	}

	const firstLoginValue = await firstLogin;
	if (!firstLoginValue || typeof firstLoginValue !== 'string') {
		return null;
	}
	const firstLoginDate = new Date(
		firstLoginValue.split('/').reverse().join('-')
	);
	let daysBetween = 0;

	const lastLoginValue = await lastLogin;
	if (!lastLoginValue || typeof lastLoginValue !== 'string') {
		return null;
	}

	if ((await lastLogin) !== today) {
		const lastLoginDate = new Date(
			lastLoginValue.split('/').reverse().join('-')
		);
		daysBetween = Math.floor(
			(lastLoginDate.getTime() - firstLoginDate.getTime()) / (1000 * 3600 * 24)
		);
		await saveItem('backfillDay', daysBetween.toString());
		await saveItem('lastLogin', today);
	} else {
		await saveItem('backfillDay', '0');
	}

	const todayDate = new Date(today.split('/').reverse().join('-'));
	daysBetween = Math.floor(
		(todayDate.getTime() - firstLoginDate.getTime()) / (1000 * 3600 * 24)
	);
	await saveItem('retentionDay', daysBetween.toString());

	const data = {
		retentionDay: await getItem('retentionDay'),
		backfillDay: await getItem('backfillDay'),
	};

	await saveItem('lastSentMetricDate', today);
	return data;
};
