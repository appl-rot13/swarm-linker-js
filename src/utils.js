
export function isPostalCode(str) {
	return /^\d{3}-\d{4}$/.test(str);
}
