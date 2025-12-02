export const MAIN_APP_URL =
	process.env.NEXT_PUBLIC_MAIN_APP_URL || "";

export const signupUrl = `${MAIN_APP_URL}/signup`;
export const loginUrl = `${MAIN_APP_URL}/login`;

/** Fallback helpers (useful in dev if MAIN_APP_URL is not set) */
export function getSignupHref(): string {
	return MAIN_APP_URL ? signupUrl : "/signup";
}

export function getLoginHref(): string {
	return MAIN_APP_URL ? loginUrl : "/login";
}



