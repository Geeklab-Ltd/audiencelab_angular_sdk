export const getTimezone = async (): Promise<string> => {
	return new Promise((resolve, reject) => {
		try {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			resolve(timezone);
		} catch (error) {
			reject(error);
		}
	});
};
