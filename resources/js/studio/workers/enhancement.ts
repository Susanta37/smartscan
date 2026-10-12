import { enhancePixels } from '../services/enhancePixels';
import type { Edit } from '../types';
self.onmessage = (event: MessageEvent<{ pixels: ImageData; edit: Edit }>) => {
    const pixels = enhancePixels(event.data.pixels, event.data.edit);
    self.postMessage(pixels, { transfer: [pixels.data.buffer] });
};
