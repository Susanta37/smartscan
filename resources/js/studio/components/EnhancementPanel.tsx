import { useState } from 'react';
import { SlidersHorizontal, RotateCcw, CopyCheck } from 'lucide-react';
import type { Edit, Photo } from '../types';
import { defaultEdit, presets } from '../config';
import { Button, NumberField, Slider } from './Controls';
export default function EnhancementPanel({
    photo,
    update,
    dpi,
}: {
    photo: Photo;
    update: (patch: Partial<Edit>, all?: boolean) => void;
    dpi: number;
}) {
    const [preset, setPreset] = useState(
            () =>
                presets.find(
                    (p) =>
                        p.id !== 'custom' &&
                        p.width === photo.edit.width &&
                        p.height === photo.edit.height,
                )?.id || 'custom',
        ),
        [unit, setUnit] = useState('mm'),
        [lock, setLock] = useState(true);
    const e = photo.edit,
        ratio = e.width / e.height;
    const factor = unit === 'in' ? 25.4 : unit === 'px' ? 25.4 / dpi : 1;
    const ratios = [
        { value: '1', label: 'Square · 1:1' },
        { value: '1.3333333333333333', label: 'Landscape · 4:3' },
        { value: '1.5', label: 'Landscape · 3:2' },
        { value: '0.6666666666666666', label: 'Portrait · 2:3' },
        { value: '1.7777777777777777', label: 'Wide · 16:9' },
    ];
    const guidance = presets.find((p) => p.id === preset)?.guidance;
    return (
        <aside className="edit-controls">
            <div className="section-heading">
                <h3>
                    <SlidersHorizontal size={17} /> Photo settings
                </h3>
                <Button
                    variant="ghost"
                    title="Reset edits"
                    onClick={() =>
                        update({
                            ...defaultEdit,
                            width: e.width,
                            height: e.height,
                            copies: e.copies,
                        })
                    }
                >
                    <RotateCcw size={16} />
                </Button>
            </div>
            <section>
                <label className="studio-field">
                    <span>Photo preset</span>
                    <select
                        value={preset}
                        aria-label="Photo preset"
                        onChange={(event) => {
                            setPreset(event.target.value);
                            const p = presets.find(
                                (item) => item.id === event.target.value,
                            );
                            if (p && p.id !== 'custom')
                                update({
                                    width: p.width,
                                    height: p.height,
                                    background: p.background,
                                    zoom: 1,
                                    x: 0,
                                    y: 0,
                                });
                        }}
                    >
                        {presets.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="studio-field">
                    <span>Crop aspect ratio</span>
                    <select
                        aria-label="Crop aspect ratio"
                        value={
                            !lock
                                ? 'free'
                                : ratios.find(
                                      (r) =>
                                          Math.abs(Number(r.value) - ratio) <
                                          0.001,
                                  )?.value || 'custom'
                        }
                        onChange={(event) => {
                            if (event.target.value === 'free') setLock(false);
                            else {
                                setLock(true);
                                if (event.target.value !== 'custom') {
                                    setPreset('custom');
                                    update({
                                        height:
                                            e.width /
                                            Number(event.target.value),
                                        zoom: 1,
                                        x: 0,
                                        y: 0,
                                    });
                                }
                            }
                        }}
                    >
                        <option value="custom">Current / custom ratio</option>
                        <option value="free">
                            Free crop · unlock dimensions
                        </option>
                        {ratios.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="field-row">
                    <NumberField
                        label="Width"
                        value={e.width / factor}
                        min={1 / factor}
                        max={400 / factor}
                        step={0.1}
                        suffix={unit}
                        onChange={(value) =>
                            update({
                                width: value * factor,
                                ...(lock
                                    ? {
                                          height: Math.min(
                                              500,
                                              (value * factor) / ratio,
                                          ),
                                      }
                                    : {}),
                            })
                        }
                    />
                    <NumberField
                        label="Height"
                        value={e.height / factor}
                        min={1 / factor}
                        max={500 / factor}
                        step={0.1}
                        suffix={unit}
                        onChange={(value) =>
                            update({
                                height: value * factor,
                                ...(lock
                                    ? {
                                          width: Math.min(
                                              400,
                                              value * factor * ratio,
                                          ),
                                      }
                                    : {}),
                            })
                        }
                    />
                </div>
                <div className="inline-options">
                    <label>
                        <input
                            type="checkbox"
                            checked={lock}
                            onChange={(event) => setLock(event.target.checked)}
                        />{' '}
                        Lock ratio
                    </label>
                    <select
                        aria-label="Dimension units"
                        value={unit}
                        onChange={(event) => setUnit(event.target.value)}
                    >
                        <option value="mm">Millimeters</option>
                        <option value="in">Inches</option>
                        <option value="px">Pixels at {dpi} DPI</option>
                    </select>
                </div>
                <NumberField
                    label="Number of copies"
                    value={e.copies}
                    min={1}
                    max={200}
                    onChange={(value) => update({ copies: Math.round(value) })}
                />
                <p className="field-help">
                    {guidance} Presets are print dimensions, not acceptance
                    guarantees.
                </p>
            </section>
            <section>
                <h4>Crop & transform</h4>
                <Slider
                    label="Zoom"
                    value={e.zoom}
                    min={1}
                    max={4}
                    step={0.01}
                    display={`${e.zoom.toFixed(2)}×`}
                    onChange={(zoom) => update({ zoom })}
                />
                <Slider
                    label="Straighten / rotation"
                    value={e.rotation}
                    min={-180}
                    max={180}
                    step={0.1}
                    display={`${e.rotation.toFixed(1)}°`}
                    onChange={(rotation) => update({ rotation })}
                />
                <div className="field-row">
                    <NumberField
                        label="Crop X"
                        value={e.x * 100}
                        min={-100}
                        max={100}
                        suffix="%"
                        onChange={(x) => update({ x: x / 100 })}
                    />
                    <NumberField
                        label="Crop Y"
                        value={e.y * 100}
                        min={-100}
                        max={100}
                        suffix="%"
                        onChange={(y) => update({ y: y / 100 })}
                    />
                </div>
            </section>
            <section>
                <h4>Background canvas</h4>
                <div className="color-options">
                    {['#ffffff', '#dbeafe', '#dc2626'].map((color) => (
                        <button
                            key={color}
                            title={
                                color === '#ffffff'
                                    ? 'White'
                                    : color === '#dbeafe'
                                      ? 'Light blue'
                                      : 'Red'
                            }
                            className={e.background === color ? 'active' : ''}
                            style={{ background: color }}
                            onClick={() => update({ background: color })}
                        />
                    ))}
                    <input
                        type="color"
                        aria-label="Custom background canvas color"
                        value={e.background}
                        onChange={(event) =>
                            update({ background: event.target.value })
                        }
                    />
                </div>
                <p className="field-help">
                    Canvas color fills transparent or uncovered areas.
                    Background removal is unavailable: no local segmentation
                    engine is configured.
                </p>
            </section>
            <section>
                <h4>Natural enhancement</h4>
                {(
                    [
                        {
                            key: 'brightness',
                            label: 'Brightness',
                            min: 50,
                            max: 150,
                        },
                        {
                            key: 'contrast',
                            label: 'Contrast',
                            min: 50,
                            max: 150,
                        },
                        {
                            key: 'saturation',
                            label: 'Saturation',
                            min: 0,
                            max: 150,
                        },
                        {
                            key: 'exposure',
                            label: 'Exposure',
                            min: -1,
                            max: 1,
                            step: 0.05,
                        },
                        {
                            key: 'highlights',
                            label: 'Highlights',
                            min: -50,
                            max: 50,
                        },
                        { key: 'shadows', label: 'Shadows', min: -50, max: 50 },
                        {
                            key: 'sharpness',
                            label: 'Sharpness',
                            min: 0,
                            max: 50,
                        },
                        {
                            key: 'noise',
                            label: 'Noise reduction',
                            min: 0,
                            max: 50,
                        },
                    ] as const
                ).map((control) => (
                    <Slider
                        key={control.key}
                        label={control.label}
                        value={e[control.key]}
                        min={control.min}
                        max={control.max}
                        step={'step' in control ? control.step : 1}
                        onChange={(value) => update({ [control.key]: value })}
                    />
                ))}
                <Button
                    onClick={() =>
                        update({
                            brightness: 104,
                            contrast: 105,
                            saturation: 102,
                            sharpness: 8,
                            shadows: 8,
                        })
                    }
                >
                    Conservative enhancement
                </Button>
                <Button
                    className="full-width"
                    onClick={() =>
                        update(
                            {
                                brightness: e.brightness,
                                contrast: e.contrast,
                                saturation: e.saturation,
                                exposure: e.exposure,
                                highlights: e.highlights,
                                shadows: e.shadows,
                                sharpness: e.sharpness,
                                noise: e.noise,
                            },
                            true,
                        )
                    }
                >
                    <CopyCheck size={16} /> Apply enhancement to batch
                </Button>
            </section>
        </aside>
    );
}
