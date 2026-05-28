// Replace with your Google OAuth Client ID from Google Cloud Console
// https://console.cloud.google.com/ → APIs & Services → Credentials → Create OAuth Client ID
export const DRIVE_CLIENT_ID = 'VITE_GOOGLE_OAUTH_CLIENT_ID_REMOVED_FROM_HISTORY';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'jobflowtracker-data.json';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function initDriveSync() {
  await Promise.all([
    loadScript('https://apis.google.com/js/api.js'),
    loadScript('https://accounts.google.com/gsi/client'),
  ]);

  await new Promise((resolve) => window.gapi.load('client', resolve));
  await window.gapi.client.init({});
  await window.gapi.client.load(DISCOVERY_DOC);

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: DRIVE_CLIENT_ID,
    scope: SCOPES,
    callback: '',
  });
}

export function signIn() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) reject(new Error(resp.error));
      else resolve(resp);
    };
    const hasToken = window.gapi.client.getToken() !== null;
    tokenClient.requestAccessToken({ prompt: hasToken ? '' : 'consent' });
  });
}

export function signOut() {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
}

async function getFileId() {
  const response = await window.gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    fields: 'files(id)',
    q: `name = '${FILE_NAME}'`,
  });
  const files = response.result.files;
  return files && files.length > 0 ? files[0].id : null;
}

export async function readFromDrive() {
  const fileId = await getFileId();
  if (!fileId) return null;

  const content = await window.gapi.client.drive.files.get({
    fileId,
    alt: 'media',
  });

  try {
    return JSON.parse(content.body);
  } catch {
    return null;
  }
}

export async function writeToDrive(data) {
  const content = JSON.stringify(data);
  const fileId = await getFileId();

  if (fileId) {
    await window.gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media' },
      headers: { 'Content-Type': 'application/json' },
      body: content,
    });
  } else {
    const boundary = '-------jobflowtrackerboundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };

    const multipartBody =
      delimiter + 'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter + 'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelimiter;

    await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
      body: multipartBody,
    });
  }
}
