import { useRef, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Grid2X2,
    Move,
    Maximize,
} from 'lucide-react';
import type { Layout, SheetSettings } from '../types';
import { PhotoCanvas } from './CropEditor';
import { Button } from './Controls';
export default function SheetCanvas({
    layout,
    settings,
    update,
    manual = true,
}: {
    layout: Layout;
    settings: SheetSettings;
    update: (patch: Partial<SheetSettings>) => void;
    manual?: boolean;
}) {
    const [pageIndex, setPageIndex] = useState(0),
        [zoom, setZoom] = useState(false);
    const page = Math.min(pageIndex, Math.max(0, layout.pages.length - 1));
    const uniform = layout.pages
        .flat()
        .every(
            (p) =>
                p.width === layout.pages[0]?.[0]?.width &&
                p.height === layout.pages[0]?.[0]?.height,
        );
    function align(mode: 'left' | 'center' | 'right') {
        const offsets = { ...settings.offsets };
        for (const placements of layout.pages) {
            const left = Math.min(...placements.map((p) => p.x)),
                right = Math.max(...placements.map((p) => p.x + p.width));
            const target =
                mode === 'left'
                    ? settings.left
                    : mode === 'right'
                      ? layout.width - settings.right - (right - left)
                      : settings.left +
                        (layout.width -
                            settings.left -
                            settings.right -
                            (right - left)) /
                            2;
            for (const p of placements)
                offsets[p.key] = {
                    x: (offsets[p.key]?.x || 0) + target - left,
                    y: offsets[p.key]?.y || 0,
                };
        }
        update({ offsets });
    }
    function distribute() {
        const p = layout.pages[0]?.[0];
        if (!p) return;
        update({
            columns: layout.columns,
            rows: layout.rows,
            offsets: {},
            gapX:
                layout.columns > 1
                    ? Math.max(
                          0,
                          (layout.width -
                              settings.left -
                              settings.right -
                              layout.columns * p.width) /
                              (layout.columns - 1),
                      )
                    : 0,
            gapY:
                layout.rows > 1
                    ? Math.max(
                          0,
                          (layout.height -
                              settings.top -
                              settings.bottom -
                              layout.rows * p.height) /
                              (layout.rows - 1),
                      )
                    : 0,
        });
    }
    const drag = useRef<{
        key: string;
        startX: number;
        startY: number;
        x: number;
        y: number;
    } | null>(null);
    return (
        <div className="sheet-preview">
            <div className="panel-toolbar">
                <div>
                    <Grid2X2 size={16} />
                    <b>Print sheet preview</b>
                </div>
                <div>
                    <Button
                        title="Toggle larger preview"
                        onClick={() => setZoom(!zoom)}
                    >
                        <Maximize size={15} />{' '}
                        {zoom ? 'Fit to view' : 'Larger view'}
                    </Button>
                    {manual && (
                        <Button onClick={() => update({ offsets: {} })}>
                            Auto arrange
                        </Button>
                    )}
                </div>
            </div>
            {manual && layout.pages.length > 0 && (
                <div className="alignment-bar">
                    <span>Align grid</span>
                    <Button onClick={() => align('left')}>Left</Button>
                    <Button onClick={() => align('center')}>Center</Button>
                    <Button onClick={() => align('right')}>Right</Button>
                    <Button
                        disabled={!uniform}
                        title={
                            uniform
                                ? 'Space equal-size photos evenly across the printable area'
                                : 'Use matching photo dimensions to distribute evenly'
                        }
                        onClick={distribute}
                    >
                        Distribute evenly
                    </Button>
                </div>
            )}
            <div className={`paper-stage ${zoom ? 'large' : ''}`}>
                <div className="paper-measure">{layout.width} mm</div>
                <div
                    className="physical-paper"
                    style={{
                        aspectRatio: `${layout.width}/${layout.height}`,
                        background: settings.background,
                    }}
                >
                    <div
                        className="paper-margin"
                        style={{
                            left: `${(settings.left / layout.width) * 100}%`,
                            right: `${(settings.right / layout.width) * 100}%`,
                            top: `${(settings.top / layout.height) * 100}%`,
                            bottom: `${(settings.bottom / layout.height) * 100}%`,
                        }}
                    />
                    {layout.pages[page]?.map((p) => (
                        <div
                            key={p.key}
                            className={`sheet-photo ${settings.marks ? 'marks' : ''} ${settings.border ? 'bordered' : ''}`}
                            tabIndex={manual ? 0 : -1}
                            role={manual ? 'button' : undefined}
                            aria-label={
                                manual
                                    ? `Position photo ${p.photo.name}. Use arrow keys to move; Shift for larger steps.`
                                    : undefined
                            }
                            onKeyDown={(event) => {
                                if (
                                    !manual ||
                                    ![
                                        'ArrowLeft',
                                        'ArrowRight',
                                        'ArrowUp',
                                        'ArrowDown',
                                    ].includes(event.key)
                                )
                                    return;
                                event.preventDefault();
                                event.stopPropagation();
                                const offset = settings.offsets[p.key] || {
                                        x: 0,
                                        y: 0,
                                    },
                                    step = event.shiftKey ? 2 : 0.5;
                                update({
                                    offsets: {
                                        ...settings.offsets,
                                        [p.key]: {
                                            x:
                                                offset.x +
                                                (event.key === 'ArrowLeft'
                                                    ? -step
                                                    : event.key === 'ArrowRight'
                                                      ? step
                                                      : 0),
                                            y:
                                                offset.y +
                                                (event.key === 'ArrowUp'
                                                    ? -step
                                                    : event.key === 'ArrowDown'
                                                      ? step
                                                      : 0),
                                        },
                                    },
                                });
                            }}
                            style={{
                                left: `${(p.x / layout.width) * 100}%`,
                                top: `${(p.y / layout.height) * 100}%`,
                                width: `${(p.width / layout.width) * 100}%`,
                                height: `${(p.height / layout.height) * 100}%`,
                                cursor: manual ? 'move' : 'default',
                            }}
                            onPointerDown={(event) => {
                                if (!manual) return;
                                event.currentTarget.focus();
                                event.currentTarget.setPointerCapture(
                                    event.pointerId,
                                );
                                const offset = settings.offsets[p.key] || {
                                    x: 0,
                                    y: 0,
                                };
                                drag.current = {
                                    key: p.key,
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    ...offset,
                                };
                            }}
                            onPointerMove={(event) => {
                                if (!drag.current) return;
                                const paper =
                                    event.currentTarget.parentElement?.getBoundingClientRect();
                                if (!paper) return;
                                update({
                                    offsets: {
                                        ...settings.offsets,
                                        [p.key]: {
                                            x:
                                                drag.current.x +
                                                ((event.clientX -
                                                    drag.current.startX) /
                                                    paper.width) *
                                                    layout.width,
                                            y:
                                                drag.current.y +
                                                ((event.clientY -
                                                    drag.current.startY) /
                                                    paper.height) *
                                                    layout.height,
                                        },
                                    },
                                });
                            }}
                            onPointerUp={() => {
                                drag.current = null;
                            }}
                            onPointerCancel={() => {
                                drag.current = null;
                            }}
                        >
                            <PhotoCanvas photo={p.photo} width={160} />
                        </div>
                    ))}
                    {!layout.pages.length && (
                        <div className="paper-empty">
                            <Grid2X2 size={35} strokeWidth={1} />
                            <p>Your print sheet appears here</p>
                        </div>
                    )}
                </div>
                <span className="paper-height">{layout.height} mm</span>
            </div>
            <div className="preview-foot">
                <span>
                    <Move size={14} />
                    {manual
                        ? 'Drag photos to adjust placement'
                        : 'Physical dimensions preserved'}
                </span>
                <div>
                    <Button
                        title="Previous page"
                        disabled={page === 0}
                        onClick={() => setPageIndex(page - 1)}
                    >
                        <ChevronLeft size={15} />
                    </Button>
                    <span>
                        Page {layout.pages.length ? page + 1 : 0} of{' '}
                        {layout.pages.length}
                    </span>
                    <Button
                        title="Next page"
                        disabled={page >= layout.pages.length - 1}
                        onClick={() => setPageIndex(page + 1)}
                    >
                        <ChevronRight size={15} />
                    </Button>
                </div>
            </div>
            {layout.error && <p className="studio-warning">{layout.error}</p>}
        </div>
    );
}
