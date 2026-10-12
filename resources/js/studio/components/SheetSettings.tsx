import { Settings2 } from 'lucide-react';
import type { SheetSettings as Settings, Layout, Photo, Edit } from '../types';
import { papers } from '../config';
import { mmToPx } from '../services/layout';
import { NumberField } from './Controls';
export default function SheetSettings({
    settings,
    layout,
    update,
    photo,
    updatePhoto,
}: {
    settings: Settings;
    layout: Layout;
    update: (patch: Partial<Settings>) => void;
    photo?: Photo;
    updatePhoto?: (patch: Partial<Edit>) => void;
}) {
    return (
        <aside className="edit-controls">
            <div className="section-heading">
                <h3>
                    <Settings2 size={17} /> Sheet settings
                </h3>
                <span className="local-badge">Live</span>
            </div>
            {photo && updatePhoto && (
                <section>
                    <h4>Selected photo</h4>
                    <p className="field-help selected-photo-name">
                        {photo.name}
                    </p>
                    <div className="field-row">
                        <NumberField
                            label="Photo width"
                            value={photo.edit.width}
                            min={1}
                            max={400}
                            step={0.1}
                            suffix="mm"
                            onChange={(width) => updatePhoto({ width })}
                        />
                        <NumberField
                            label="Photo height"
                            value={photo.edit.height}
                            min={1}
                            max={500}
                            step={0.1}
                            suffix="mm"
                            onChange={(height) => updatePhoto({ height })}
                        />
                    </div>
                    <NumberField
                        label="Photo copies"
                        value={photo.edit.copies}
                        min={1}
                        max={200}
                        onChange={(copies) =>
                            updatePhoto({ copies: Math.round(copies) })
                        }
                    />
                </section>
            )}
            <section>
                <label className="studio-field">
                    <span>Paper size</span>
                    <select
                        value={settings.paper}
                        aria-label="Paper size"
                        onChange={(e) => {
                            const paper = papers.find(
                                (p) => p.id === e.target.value,
                            );
                            if (paper)
                                update({
                                    paper: paper.id,
                                    width: paper.width,
                                    height: paper.height,
                                    offsets: {},
                                });
                        }}
                    >
                        {papers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </label>
                {settings.paper === 'custom' && (
                    <div className="field-row">
                        <NumberField
                            label="Paper width"
                            value={settings.width}
                            min={25}
                            max={400}
                            suffix="mm"
                            onChange={(width) => update({ width, offsets: {} })}
                        />
                        <NumberField
                            label="Paper height"
                            value={settings.height}
                            min={25}
                            max={500}
                            suffix="mm"
                            onChange={(height) =>
                                update({ height, offsets: {} })
                            }
                        />
                    </div>
                )}
                <div className="segmented">
                    <button
                        className={!settings.landscape ? 'active' : ''}
                        onClick={() =>
                            update({ landscape: false, offsets: {} })
                        }
                    >
                        Portrait
                    </button>
                    <button
                        className={settings.landscape ? 'active' : ''}
                        onClick={() => update({ landscape: true, offsets: {} })}
                    >
                        Landscape
                    </button>
                </div>
                <label className="studio-field">
                    <span>Print resolution</span>
                    <select
                        value={settings.dpi}
                        aria-label="Print resolution"
                        onChange={(e) =>
                            update({ dpi: Number(e.target.value) })
                        }
                    >
                        <option value={150}>150 DPI · Draft</option>
                        <option value={300}>300 DPI · Photo quality</option>
                        <option value={600}>600 DPI · High detail</option>
                    </select>
                </label>
            </section>
            <section>
                <h4>Arrangement</h4>
                <div className="field-row">
                    <NumberField
                        label="Columns (0 = auto)"
                        value={settings.columns}
                        max={30}
                        onChange={(columns) =>
                            update({
                                columns: Math.round(columns),
                                offsets: {},
                            })
                        }
                    />
                    <NumberField
                        label="Rows (0 = auto)"
                        value={settings.rows}
                        max={30}
                        onChange={(rows) =>
                            update({ rows: Math.round(rows), offsets: {} })
                        }
                    />
                </div>
                <div className="field-row">
                    <NumberField
                        label="Horizontal gap"
                        value={settings.gapX}
                        max={30}
                        step={0.5}
                        suffix="mm"
                        onChange={(gapX) => update({ gapX, offsets: {} })}
                    />
                    <NumberField
                        label="Vertical gap"
                        value={settings.gapY}
                        max={30}
                        step={0.5}
                        suffix="mm"
                        onChange={(gapY) => update({ gapY, offsets: {} })}
                    />
                </div>
            </section>
            <section>
                <h4>Paper margins</h4>
                <div className="field-row">
                    <NumberField
                        label="Top"
                        value={settings.top}
                        max={50}
                        suffix="mm"
                        onChange={(top) => update({ top, offsets: {} })}
                    />
                    <NumberField
                        label="Bottom"
                        value={settings.bottom}
                        max={50}
                        suffix="mm"
                        onChange={(bottom) => update({ bottom, offsets: {} })}
                    />
                </div>
                <div className="field-row">
                    <NumberField
                        label="Left"
                        value={settings.left}
                        max={50}
                        suffix="mm"
                        onChange={(left) => update({ left, offsets: {} })}
                    />
                    <NumberField
                        label="Right"
                        value={settings.right}
                        max={50}
                        suffix="mm"
                        onChange={(right) => update({ right, offsets: {} })}
                    />
                </div>
            </section>
            <section>
                <h4>Finishing</h4>
                <label className="check-row">
                    <input
                        type="checkbox"
                        checked={settings.marks}
                        onChange={(e) => update({ marks: e.target.checked })}
                    />{' '}
                    Crop marks
                </label>
                <label className="check-row">
                    <input
                        type="checkbox"
                        checked={settings.border}
                        onChange={(e) => update({ border: e.target.checked })}
                    />{' '}
                    Photo borders
                </label>
                <label className="studio-field">
                    <span>Page background</span>
                    <input
                        type="color"
                        value={settings.background}
                        onChange={(e) => update({ background: e.target.value })}
                    />
                </label>
            </section>
            <section className="layout-summary">
                <h4>Sheet summary</h4>
                <p>
                    <span>Grid</span>
                    <b>
                        {layout.columns} columns × {layout.rows} rows
                    </b>
                </p>
                <p>
                    <span>Pages</span>
                    <b>{layout.pages.length}</b>
                </p>
                <p>
                    <span>Utilization</span>
                    <b>{Math.round(layout.utilization)}%</b>
                </p>
                <p>
                    <span>Unused paper</span>
                    <b>{Math.round(100 - layout.utilization)}%</b>
                </p>
                <p>
                    <span>Output pixels</span>
                    <b>
                        {mmToPx(layout.width, settings.dpi)} ×{' '}
                        {mmToPx(layout.height, settings.dpi)}
                    </b>
                </p>
                <p>
                    <span>Printer</span>
                    <b>System dialog</b>
                </p>
            </section>
        </aside>
    );
}
