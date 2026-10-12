import { useEffect, useRef, useState } from 'react';
import {
    ScanFace,
    RotateCcw,
    RotateCw,
    FlipHorizontal2,
    FlipVertical2,
    Undo2,
    Redo2,
    ZoomIn,
    Image,
} from 'lucide-react';
import type { Edit, Photo } from '../types';
import { drawPhoto, resolutionWarning, suggestFace } from '../services/image';
import { Button } from './Controls';
export function PhotoCanvas({
    photo,
    width = 420,
    original = false,
    className = '',
}: {
    photo: Photo;
    width?: number;
    original?: boolean;
    className?: string;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (ref.current)
            drawPhoto(
                photo,
                ref.current,
                Math.min(width, (width * photo.edit.width) / photo.edit.height),
                Math.min(width, (width * photo.edit.height) / photo.edit.width),
                original,
            );
        return () => {
            if (ref.current) {
                ref.current.width = 0;
                ref.current.height = 0;
            }
        };
    }, [photo, width, original]);
    return (
        <canvas
            ref={ref}
            className={className}
            aria-label={
                original
                    ? 'Original image in current crop'
                    : 'Edited photo preview'
            }
        />
    );
}
export default function CropEditor({
    photo,
    update,
    history,
    dpi,
    notify,
}: {
    photo: Photo;
    update: (patch: Partial<Edit>) => void;
    history: (redo?: boolean) => void;
    dpi: number;
    notify: (message: string) => void;
}) {
    const [compare, setCompare] = useState(false),
        [detecting, setDetecting] = useState(false);
    const drag = useRef<{
        x: number;
        y: number;
        px: number;
        py: number;
    } | null>(null);
    const warning = resolutionWarning(photo, dpi);
    async function autoCrop() {
        setDetecting(true);
        try {
            const result = await suggestFace(photo);
            if (result) {
                update({ ...result, rotation: 0 });
                notify(
                    'Face crop suggested. Review the framing before printing.',
                );
            } else
                notify(
                    'Face detection is unavailable or no face was found. Use the manual crop controls.',
                );
        } catch {
            notify(
                'Face detection could not run. Manual cropping is available.',
            );
        } finally {
            setDetecting(false);
        }
    }
    return (
        <div className="editor-preview">
            <div className="panel-toolbar">
                <div>
                    <Image size={16} />
                    <b>Photo preview</b>
                </div>
                <div>
                    <Button
                        variant="ghost"
                        disabled={!photo.past.length}
                        title="Undo (Ctrl+Z)"
                        onClick={() => history()}
                    >
                        <Undo2 size={17} />
                    </Button>
                    <Button
                        variant="ghost"
                        disabled={!photo.future.length}
                        title="Redo (Ctrl+Shift+Z)"
                        onClick={() => history(true)}
                    >
                        <Redo2 size={17} />
                    </Button>
                    <Button onClick={() => setCompare(!compare)}>
                        {compare ? 'Show edited' : 'Compare original'}
                    </Button>
                </div>
            </div>
            <div className="crop-stage">
                <div
                    className="crop-frame"
                    style={{
                        aspectRatio: `${photo.edit.width}/${photo.edit.height}`,
                    }}
                    onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        drag.current = {
                            x: e.clientX,
                            y: e.clientY,
                            px: photo.edit.x,
                            py: photo.edit.y,
                        };
                    }}
                    onPointerMove={(e) => {
                        if (!drag.current) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        update({
                            x: Math.max(
                                -1,
                                Math.min(
                                    1,
                                    drag.current.px +
                                        (e.clientX - drag.current.x) /
                                            rect.width,
                                ),
                            ),
                            y: Math.max(
                                -1,
                                Math.min(
                                    1,
                                    drag.current.py +
                                        (e.clientY - drag.current.y) /
                                            rect.height,
                                ),
                            ),
                        });
                    }}
                    onPointerUp={() => {
                        drag.current = null;
                    }}
                    onPointerCancel={() => {
                        drag.current = null;
                    }}
                >
                    <PhotoCanvas photo={photo} original={compare} />
                    <div className="crop-guide">
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                    <span className="crop-label">
                        {compare
                            ? 'ORIGINAL · CURRENT CROP'
                            : `${photo.edit.width} × ${photo.edit.height} mm`}
                    </span>
                </div>
            </div>
            <div className="transform-bar">
                <div>
                    <Button
                        title="Rotate left (R)"
                        onClick={() =>
                            update({
                                rotation:
                                    ((photo.edit.rotation - 90 + 540) % 360) -
                                    180,
                            })
                        }
                    >
                        <RotateCcw size={17} />
                    </Button>
                    <Button
                        title="Rotate right"
                        onClick={() =>
                            update({
                                rotation:
                                    ((photo.edit.rotation + 90 + 540) % 360) -
                                    180,
                            })
                        }
                    >
                        <RotateCw size={17} />
                    </Button>
                    <Button
                        title="Flip horizontally"
                        onClick={() => update({ flipX: !photo.edit.flipX })}
                    >
                        <FlipHorizontal2 size={17} />
                    </Button>
                    <Button
                        title="Flip vertically"
                        onClick={() => update({ flipY: !photo.edit.flipY })}
                    >
                        <FlipVertical2 size={17} />
                    </Button>
                </div>
                <Button disabled={detecting} onClick={() => void autoCrop()}>
                    <ScanFace size={16} />
                    {detecting ? 'Detecting…' : 'Suggest face crop'}
                </Button>
            </div>
            <div className="preview-foot">
                <span>
                    <ZoomIn size={14} /> Drag to reposition · Use zoom to crop
                </span>
                <span>
                    {photo.width} × {photo.height} px
                </span>
            </div>
            {warning && <p className="studio-warning">{warning}</p>}
        </div>
    );
}
