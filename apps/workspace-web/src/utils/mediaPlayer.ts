/**
 * YouTube postMessage controls for the FloatingPlayer.
 * Finds the YouTube iframe in the DOM and sends commands.
 */

function getYoutubeIframe(): HTMLIFrameElement | null {
  // Find the YouTube iframe inside the floating player
  return document.querySelector('.fixed.bottom-4.right-4 iframe[title="YouTube Player"]');
}

function sendCommand(func: string) {
  const iframe = getYoutubeIframe();
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args: '' }),
      '*'
    );
  }
}

export function pauseYoutube() { sendCommand('pauseVideo'); }
export function resumeYoutube() { sendCommand('playVideo'); }
export function nextYoutube() { sendCommand('nextVideo'); }
export function prevYoutube() { sendCommand('previousVideo'); }
