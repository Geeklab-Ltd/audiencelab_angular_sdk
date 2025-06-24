module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	testMatch: ['**/*.spec.ts'],
	testPathIgnorePatterns: ['\\.integration\\.spec\\.ts$'],
};
