const API_BASE_URL = process.env.BEWERBUNGSHELFER_API_URL ?? 'http://localhost:3000';
const USERNAME = process.env.BEWERBUNGSHELFER_USERNAME;
const PASSWORD = process.env.BEWERBUNGSHELFER_PASSWORD;

export interface MatchJobPostingInput {
  postingText: string;
  resumeText: string;
}

export interface DraftCoverLetterInput {
  postingText: string;
  resumeText: string;
  applicantName: string;
  previousDraft?: string;
  feedback?: string;
}

// Im Speicher gehalten statt in einer Datei/Umgebungsvariable: der
// MCP-Server läuft als kurzlebiger Kindprozess pro Client-Sitzung (stdio),
// ein Neustart loggt einfach neu ein - kein Bedarf für Persistenz über
// Prozessgrenzen hinweg.
let cachedToken: string | null = null;

async function login(): Promise<string> {
  if (!USERNAME || !PASSWORD) {
    throw new Error(
      'BEWERBUNGSHELFER_USERNAME/BEWERBUNGSHELFER_PASSWORD sind nicht gesetzt (siehe README).',
    );
  }
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!response.ok) {
    throw new Error(
      `Login gegen ${API_BASE_URL}/auth/login fehlgeschlagen: HTTP ${response.status}`,
    );
  }
  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  cachedToken ??= await login();

  const request = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${cachedToken}`,
        'Content-Type': 'application/json',
      },
    });

  let response = await request();
  if (response.status === 401) {
    // Token evtl. abgelaufen oder ungültig geworden - einmal neu einloggen
    // und erneut versuchen, statt sofort aufzugeben.
    cachedToken = await login();
    response = await request();
  }
  return response;
}

export async function matchJobPosting(input: MatchJobPostingInput): Promise<unknown> {
  const response = await authenticatedFetch('/job-postings/match', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `POST /job-postings/match fehlgeschlagen: HTTP ${response.status} - ${body}`,
    );
  }
  return response.json();
}

export async function draftCoverLetter(input: DraftCoverLetterInput): Promise<unknown> {
  const response = await authenticatedFetch('/cover-letters', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `POST /cover-letters fehlgeschlagen: HTTP ${response.status} - ${body}`,
    );
  }
  return response.json();
}

export async function listApplications(): Promise<unknown> {
  const response = await authenticatedFetch('/applications');
  if (!response.ok) {
    throw new Error(`GET /applications fehlgeschlagen: HTTP ${response.status}`);
  }
  return response.json();
}
