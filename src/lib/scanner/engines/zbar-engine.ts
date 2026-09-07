import {ScannerEngine} from "@/types/scanner";

export function createZbarEngine(): ScannerEngine {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let zbarModule: any = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let scratchCanvas: HTMLCanvasElement | null = null;

    return {
        id: 'zbar',
        label: 'ZBar (experimental)',
        mode: 'frame',

        isSupported: () =>
            typeof window !== 'undefined',

        async init() {
            zbarModule = await import('@undecaf/zbar-wasm');

            scratchCanvas = document.createElement('canvas');
            ctx = scratchCanvas.getContext('2d', {
                willReadFrequently: true,
            });
        },

        async detectFrame(source) {
            if (!zbarModule || !ctx || !scratchCanvas) {
                return null;
            }

            try {
                let imageData: ImageData;

                if (source instanceof HTMLCanvasElement) {
                    const sourceCtx = source.getContext('2d');

                    if (!sourceCtx) {
                        return null;
                    }

                    imageData = sourceCtx.getImageData(
                        0,
                        0,
                        source.width,
                        source.height,
                    );
                } else {
                    scratchCanvas.width = source.videoWidth;
                    scratchCanvas.height = source.videoHeight;

                    ctx.drawImage(
                        source,
                        0,
                        0,
                        scratchCanvas.width,
                        scratchCanvas.height,
                    );

                    imageData = ctx.getImageData(
                        0,
                        0,
                        scratchCanvas.width,
                        scratchCanvas.height,
                    );
                }

                const symbols = await zbarModule.scanImageData(imageData);

                if (!symbols?.length) {
                    return null;
                }

                return symbols[0]?.decode?.() ?? null;
            } catch {
                return null;
            }
        },
    };
}