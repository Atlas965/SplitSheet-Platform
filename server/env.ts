import "./loadEnv";


class EnvConfig {
    readonly DATABASE_URL: string;
    readonly SESSION_SECRET: string;
    readonly APP_URL: string;
    readonly PORT: number;
    readonly NODE_ENV: string;
    readonly IS_PRODUCTION: boolean;

    constructor() {
        this.NODE_ENV = process.env.NODE_ENV || "development";
        this.IS_PRODUCTION = this.NODE_ENV === "production";
        this.PORT = Number(process.env.PORT) || 5000;

        this.DATABASE_URL = this.require("DATABASE_URL");

        this.SESSION_SECRET =
            process.env.SESSION_SECRET ||
            (this.IS_PRODUCTION ? this.require("SESSION_SECRET") : "dev-session-secret-change-me");

        this.APP_URL = process.env.APP_URL || `http://localhost:${this.PORT}`;

        if (this.IS_PRODUCTION) {
            if (process.env.LOCAL_DEV === "true") {
                throw new Error("LOCAL_DEV must not be enabled in production");
            }
            if (!process.env.SESSION_SECRET) {
                throw new Error("SESSION_SECRET is required in production");
            }
            if (!process.env.APP_URL) {
                console.warn("[ENV] APP_URL not set — confirmation links may use incorrect domain");
            }
        }
    }

    private require(variable: string): string {
        const value = process.env[variable];
        if (!value) {
            throw new Error(`Missing required environment variable: ${variable}`);
        }
        return value;
    }
}

export const env = new EnvConfig();
