/** Share via the Web Share API, falling back to copying the URL. Returns what happened. */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, url });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
