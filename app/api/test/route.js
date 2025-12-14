import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      apiKeyExists: !!apiKey,
      apiKeyFormat: apiKey ? apiKey.startsWith('sk-or-v1-') : false,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT_SET',
      siteUrl: process.env.SITE_URL || 'NOT_SET'
    },
    message: !apiKey 
      ? "⚠️ OPENROUTER_API_KEY environment variable is not set!" 
      : apiKey.startsWith('sk-or-v1-')
        ? "✅ Environment variables look good!"
        : "⚠️ API key format appears incorrect (should start with sk-or-v1-)"
  });
}
