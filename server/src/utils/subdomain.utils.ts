const CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomSuffix(length = 3): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
	}
	return result;
}

export function normalizeNameToSubdomain(input: string): string {
	let subdomain = input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")   // remove invalid chars
		.replace(/\s+/g, "-")           // spaces → hyphen
		.replace(/-+/g, "-")            // collapse multiple hyphens
		.replace(/^-+|-+$/g, "");       // trim hyphens

	if (!subdomain) return "site";

	// DNS label max = 63 chars
	return subdomain.slice(0, 50); // keep room for suffix
}
