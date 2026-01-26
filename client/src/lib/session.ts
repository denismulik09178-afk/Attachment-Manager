const SESSION_KEY = 'deni_bot_session_id';

export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}
