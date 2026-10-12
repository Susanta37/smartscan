import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    Camera,
    LayoutDashboard,
    Crop,
    LayoutGrid,
    Clock3,
    Settings2,
    Shapes,
    ShieldCheck,
    ChevronRight,
    Trash2,
    Printer,
    Download,
    ArrowRight,
    ArrowLeft,
    FileImage,
    FileDown,
    X,
    Menu,
    Keyboard,
    CircleHelp,
    CheckCircle2,
    AlertTriangle,
    LogOut,
    Monitor,
} from 'lucide-react';
import { defaultSheet, papers, futureTools } from './config';
import type { Job, SheetSettings, Workspace } from './types';
import { usePhotoSession } from './hooks/usePhotoSession';
import { arrange, mmToPx } from './services/layout';
import { exportSheet, printSheet, exportPhoto } from './services/export';
import { resolutionWarning } from './services/image';
import Dashboard, { RecentJobs } from './components/Dashboard';
import { Button } from './components/Controls';
import ImageUploader from './components/ImageUploader';
import CropEditor from './components/CropEditor';
import EnhancementPanel from './components/EnhancementPanel';
import PhotoGallery from './components/PhotoGallery';
import SheetCanvas from './components/SheetCanvas';
import SheetControls from './components/SheetSettings';
import Modal from './components/Modal';
import { releaseTemporaryResources } from './services/privacy';
import '../../css/studio.css';
const navigation = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
    { id: 'passport', title: 'Passport Photo Maker', icon: Camera },
    { id: 'editor', title: 'Smart Photo Editor', icon: Crop },
    { id: 'sheet', title: 'Print Sheet Designer', icon: LayoutGrid },
] as const;
const secondary = [
    { id: 'recent', title: 'Recent Jobs', icon: Clock3 },
    { id: 'settings', title: 'Settings', icon: Settings2 },
    { id: 'future', title: 'Future Tools', icon: Shapes },
] as const;
const titles: Record<Workspace, string> = {
    dashboard: 'Dashboard',
    passport: 'Passport Photo Maker',
    editor: 'Smart Photo Editor',
    sheet: 'Print Sheet Designer',
    recent: 'Recent Jobs',
    settings: 'Studio Settings',
    future: 'Future Tools',
};
function loadPreferences(): { dpi: number; idle: number; paper: string } {
    try {
        const parsed = JSON.parse(
            localStorage.getItem('smartscan-preferences') || '{}',
        );
        return {
            dpi: [150, 300, 600].includes(parsed.dpi) ? parsed.dpi : 300,
            idle: [5, 10, 15, 30, 60].includes(parsed.idle) ? parsed.idle : 15,
            paper: papers.some(
                (p) => p.id === parsed.paper && p.id !== 'custom',
            )
                ? parsed.paper
                : '4x6',
        };
    } catch {
        return { dpi: 300, idle: 15, paper: '4x6' };
    }
}
export default function Studio() {
    const [workspace, setWorkspace] = useState<Workspace>('dashboard'),
        [settings, setSettings] = useState<SheetSettings>(defaultSheet),
        [preferences, setPreferences] = useState(loadPreferences);
    const [jobs, setJobs] = useState<Job[]>([]),
        [dialog, setDialog] = useState<
            'clear' | 'print' | 'help' | 'idle' | null
        >(null),
        [menu, setMenu] = useState(false),
        [progress, setProgress] = useState('');
    const session = usePhotoSession(),
        layout = arrange(session.photos, settings),
        copies = session.photos.reduce((sum, p) => sum + p.edit.copies, 0);
    const run = useRef(0),
        activity = useRef(Date.now()),
        idleDeadline = useRef(0),
        [idleSeconds, setIdleSeconds] = useState(60),
        nextWorkspace = useRef<Workspace>('dashboard'),
        [printCurrent, setPrintCurrent] = useState(false);
    const currentLayout =
        printCurrent && session.active
            ? arrange(
                  [
                      {
                          ...session.active,
                          edit: { ...session.active.edit, copies: 1 },
                      },
                  ],
                  {
                      ...settings,
                      gapX: 0,
                      gapY: 0,
                      columns: 0,
                      rows: 0,
                      offsets: {},
                      marks: false,
                  },
              )
            : layout;
    useEffect(() => {
        const paper = papers.find((p) => p.id === preferences.paper)!;
        setSettings((s) => ({
            ...s,
            dpi: preferences.dpi,
            paper: paper.id,
            width: paper.width,
            height: paper.height,
        }));
    }, [preferences.dpi, preferences.paper]);
    useEffect(() => {
        const recordActivity = () => {
            activity.current = Date.now();
        };
        window.addEventListener('pointerdown', recordActivity);
        window.addEventListener('keydown', recordActivity);
        const interval = setInterval(() => {
            if (
                session.photos.length &&
                dialog !== 'idle' &&
                Date.now() - activity.current > preferences.idle * 60_000
            ) {
                idleDeadline.current = Date.now() + 60_000;
                setDialog('idle');
            }
            if (dialog === 'idle') {
                const seconds = Math.ceil(
                    (idleDeadline.current - Date.now()) / 1000,
                );
                setIdleSeconds(seconds);
                if (seconds <= 0) {
                    run.current++;
                    session.clear();
                    setProgress('');
                    setDialog(null);
                }
            }
        }, 1000);
        return () => {
            window.removeEventListener('pointerdown', recordActivity);
            window.removeEventListener('keydown', recordActivity);
            clearInterval(interval);
        };
    }, [session.photos.length, preferences.idle, dialog, session.clear]);
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.closest('input,select,textarea') || dialog) return;
            const command = event.ctrlKey || event.metaKey;
            if (command && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                session.history(event.shiftKey);
            } else if (command && event.key.toLowerCase() === 'y') {
                event.preventDefault();
                session.history(true);
            } else if (command && event.key.toLowerCase() === 'p') {
                event.preventDefault();
                if (session.photos.length) {
                    setPrintCurrent(false);
                    setDialog('print');
                }
            } else if (event.key.toLowerCase() === 'r' && session.active)
                session.update({
                    rotation:
                        ((session.active.edit.rotation + 90 + 540) % 360) - 180,
                });
            else if (event.key === 'Delete' && session.active)
                session.remove(session.active.id);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });
    function navigate(to: Workspace) {
        if (
            !session.photos.length &&
            to === 'editor' &&
            settings.paper === '4x6'
        )
            setSettings((s) => ({
                ...s,
                landscape: false,
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                offsets: {},
            }));
        setWorkspace(to);
        setMenu(false);
    }
    function clearRequest(to: Workspace = workspace) {
        nextWorkspace.current = to;
        if (session.photos.length || session.busy || progress)
            setDialog('clear');
        else {
            session.clear();
            navigate(to);
        }
    }
    function clearConfirmed() {
        run.current++;
        session.clear();
        setProgress('');
        setSettings((s) => ({ ...s, offsets: {} }));
        setDialog(null);
        navigate(nextWorkspace.current);
    }
    function updateSettings(patch: Partial<SheetSettings>) {
        setSettings((s) => ({ ...s, ...patch }));
    }
    function record(action: string, target = layout) {
        setJobs((current) =>
            [
                {
                    id: crypto.randomUUID(),
                    time: new Date().toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    tool: printCurrent ? 'Current Photo' : titles[workspace],
                    count: target.pages.flat().length,
                    pages: target.pages.length,
                    paper: printCurrent
                        ? `${target.width} × ${target.height} mm`
                        : papers.find((p) => p.id === settings.paper)?.name ||
                          'Custom',
                    action,
                },
                ...current,
            ].slice(0, 100),
        );
    }
    async function output(format: 'pdf' | 'png' | 'jpeg') {
        const ticket = ++run.current,
            generation = session.generation.current;
        const cancelled = () =>
            ticket !== run.current || generation !== session.generation.current;
        setProgress('Preparing export…');
        try {
            await exportSheet(layout, settings, format, setProgress, cancelled);
            if (!cancelled()) {
                record(`${format.toUpperCase()} exported`);
                session.setMessage(
                    `Print sheet exported as ${format.toUpperCase()}. Exported files remain on your device after clearing.`,
                );
            }
        } catch (error) {
            if (!cancelled())
                session.setMessage(
                    error instanceof Error ? error.message : 'Export failed.',
                );
        } finally {
            if (ticket === run.current) setProgress('');
        }
    }
    async function print() {
        setDialog(null);
        const ticket = ++run.current,
            generation = session.generation.current;
        setProgress('Preparing print view…');
        try {
            await printSheet(
                currentLayout,
                printCurrent
                    ? { ...settings, marks: false, border: false }
                    : settings,
                () =>
                    ticket !== run.current ||
                    generation !== session.generation.current,
            );
            if (
                ticket === run.current &&
                generation === session.generation.current
            ) {
                record('Print dialog opened', currentLayout);
                session.setMessage(
                    'Print dialog requested. The browser cannot confirm that paper was printed.',
                );
            }
        } catch (error) {
            if (
                ticket === run.current &&
                generation === session.generation.current
            )
                session.setMessage(
                    error instanceof Error
                        ? error.message
                        : 'Print view failed.',
                );
        } finally {
            if (ticket === run.current) setProgress('');
        }
    }
    async function downloadCurrent() {
        if (!session.active || progress) return;
        const ticket = ++run.current,
            generation = session.generation.current;
        const cancelled = () =>
            ticket !== run.current || generation !== session.generation.current;
        setProgress('Preparing photo export…');
        try {
            await exportPhoto(session.active, settings.dpi, cancelled);
            if (!cancelled())
                session.setMessage(
                    'Photo exported as PNG with the selected dimensions and DPI.',
                );
        } catch (error) {
            if (!cancelled())
                session.setMessage(
                    error instanceof Error
                        ? error.message
                        : 'Photo export failed.',
                );
        } finally {
            if (ticket === run.current) setProgress('');
        }
    }
    function savePreferences(patch: Partial<typeof preferences>) {
        const next = { ...preferences, ...patch };
        setPreferences(next);
        try {
            localStorage.setItem('smartscan-preferences', JSON.stringify(next));
            session.setMessage(
                'Application preferences saved. No photos or customer information are stored.',
            );
        } catch {
            session.setMessage(
                'Persistent settings are unavailable; preferences apply to this session.',
            );
        }
    }
    const operational = ['passport', 'editor', 'sheet'].includes(workspace),
        disabled =
            !session.photos.length ||
            !!layout.error ||
            !!progress ||
            !!session.busy;
    return (
        <div className="studio">
            <Head title="SmartScan Photo Studio" />
            <aside className={`studio-sidebar ${menu ? 'open' : ''}`}>
                <button
                    className="studio-brand"
                    onClick={() => navigate('dashboard')}
                >
                    <span>
                        <Camera size={23} strokeWidth={1.8} />
                    </span>
                    <div>
                        smart<span>scan</span>
                        <small>PHOTO & PRINT STUDIO</small>
                    </div>
                </button>
                <div className="sidebar-caption">WORKSPACE</div>
                <nav>
                    {navigation.map((item) => (
                        <button
                            key={item.id}
                            className={workspace === item.id ? 'active' : ''}
                            onClick={() => navigate(item.id)}
                        >
                            <item.icon size={18} />
                            <span>{item.title}</span>
                            {workspace === item.id && (
                                <span className="nav-dot" />
                            )}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-divider" />
                <div className="sidebar-caption">STUDIO</div>
                <nav>
                    {secondary.map((item) => (
                        <button
                            key={item.id}
                            className={workspace === item.id ? 'active' : ''}
                            onClick={() => navigate(item.id)}
                        >
                            <item.icon size={18} />
                            {item.title}
                            {item.id === 'future' && <small>SOON</small>}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="sidebar-privacy">
                        <span>
                            <ShieldCheck size={21} />
                        </span>
                        <b>Your photos stay yours.</b>
                        <p>
                            Local processing.
                            <br />
                            Nothing uploaded. Nothing saved.
                        </p>
                        <button onClick={() => setDialog('help')}>
                            Our privacy promise <ArrowUpRightIcon />
                        </button>
                    </div>
                    <button
                        className="sidebar-help"
                        onClick={() => setDialog('help')}
                    >
                        <CircleHelp size={17} /> Help & keyboard shortcuts
                    </button>
                    <div className="studio-operator">
                        <div>CSC</div>
                        <span>
                            <b>CSC workstation</b>
                            <small>
                                <i /> Local session active
                            </small>
                        </span>
                        <Monitor size={17} />
                    </div>
                </div>
            </aside>
            {menu && (
                <button
                    className="sidebar-backdrop"
                    aria-label="Close navigation"
                    onClick={() => setMenu(false)}
                />
            )}
            <div className="studio-main">
                <header className="studio-topbar">
                    <div>
                        <Button
                            variant="ghost"
                            className="mobile-menu"
                            title="Open navigation"
                            onClick={() => setMenu(!menu)}
                        >
                            <Menu size={20} />
                        </Button>
                        <span className="breadcrumb-brand">Studio</span>
                        <ChevronRight size={14} />
                        <b>{titles[workspace]}</b>
                    </div>
                    <div>
                        <span className="privacy-pill">
                            <i /> Temporary Processing — Photos Are Not Saved
                        </span>
                        <Button
                            variant="ghost"
                            title="Help"
                            onClick={() => setDialog('help')}
                        >
                            <CircleHelp size={19} />
                        </Button>
                    </div>
                </header>
                <div className="studio-jobbar">
                    <span>
                        <span className="status-dot" />
                        Ready when you are
                        <span className="jobbar-divider" />
                        <Printer size={14} />
                        {papers.find((p) => p.id === settings.paper)?.name}{' '}
                        <span className="jobbar-divider" />
                        {settings.dpi} DPI
                        <span className="jobbar-divider" />
                        {session.photos.length} photos
                        <span className="printer-label">
                            {' '}
                            · Printer: System dialog
                        </span>
                    </span>
                    <div>
                        <Button
                            variant="ghost"
                            disabled={!session.photos.length && !session.busy}
                            onClick={() => clearRequest()}
                        >
                            <Trash2 size={14} /> Clear all photos
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => clearRequest('dashboard')}
                        >
                            <LogOut size={14} /> End session
                        </Button>
                    </div>
                </div>
                <main className="studio-content">
                    {workspace === 'dashboard' && (
                        <Dashboard
                            navigate={navigate}
                            photos={session.photos.length}
                            copies={copies}
                            jobs={jobs}
                            dpi={settings.dpi}
                            newJob={() => clearRequest('passport')}
                        />
                    )}
                    {operational && (
                        <>
                            <div className="workspace-title">
                                <div>
                                    <div className="eyebrow">
                                        {workspace === 'passport'
                                            ? 'SIZE IT RIGHT. PRINT IT BEAUTIFULLY.'
                                            : workspace === 'editor'
                                              ? 'NATURAL EDITS. BETTER PHOTOGRAPHS.'
                                              : 'PRECISION ON EVERY PAGE.'}
                                    </div>
                                    <h1>{titles[workspace]}</h1>
                                    <p>
                                        {workspace === 'sheet'
                                            ? 'Arrange your photos with real dimensions and a print-ready finish.'
                                            : 'Import a photo, refine the details, and make it ready for print.'}
                                    </p>
                                </div>
                                <div className="workspace-title-actions">
                                    {workspace === 'sheet' ? (
                                        <Button
                                            onClick={() => navigate('passport')}
                                        >
                                            <ArrowLeft size={15} /> Return to
                                            editing
                                        </Button>
                                    ) : (
                                        <Button
                                            disabled={!session.photos.length}
                                            onClick={() => navigate('sheet')}
                                        >
                                            Arrange on sheet{' '}
                                            <ArrowRight size={15} />
                                        </Button>
                                    )}
                                    <Button
                                        variant="primary"
                                        disabled={disabled}
                                        onClick={() => {
                                            setPrintCurrent(false);
                                            setDialog('print');
                                        }}
                                    >
                                        <Printer size={16} /> Print preview
                                    </Button>
                                </div>
                            </div>
                            <div className="workflow-tabs">
                                <button
                                    className={
                                        workspace !== 'sheet' ? 'active' : ''
                                    }
                                    onClick={() =>
                                        navigate(
                                            workspace === 'editor'
                                                ? 'editor'
                                                : 'passport',
                                        )
                                    }
                                >
                                    <span>1</span> Import & edit{' '}
                                    <CheckCircle2 size={14} />
                                </button>
                                <ChevronRight size={16} />
                                <button
                                    className={
                                        workspace === 'sheet' ? 'active' : ''
                                    }
                                    disabled={!session.photos.length}
                                    onClick={() => navigate('sheet')}
                                >
                                    <span>2</span> Arrange sheet
                                </button>
                                <ChevronRight size={16} />
                                <button
                                    disabled={disabled}
                                    onClick={() => {
                                        setPrintCurrent(false);
                                        setDialog('print');
                                    }}
                                >
                                    <span>3</span> Preview & print
                                </button>
                                <span className="workflow-local">
                                    <ShieldCheck size={14} /> All processing
                                    stays local
                                </span>
                            </div>
                            {!session.photos.length ? (
                                <ImageUploader
                                    disabled={!!session.busy}
                                    onFiles={(files) =>
                                        void session.upload(files, workspace)
                                    }
                                />
                            ) : workspace === 'sheet' ? (
                                <>
                                    <div className="editor-layout">
                                        <SheetCanvas
                                            layout={layout}
                                            settings={settings}
                                            update={updateSettings}
                                        />
                                        <SheetControls
                                            settings={settings}
                                            layout={layout}
                                            update={updateSettings}
                                            photo={session.active}
                                            updatePhoto={(patch) => {
                                                session.update(patch);
                                                updateSettings({ offsets: {} });
                                            }}
                                        />
                                    </div>
                                    <div className="sheet-actions">
                                        <span>
                                            {copies} copies ·{' '}
                                            {layout.pages.length} sheets ·{' '}
                                            {Math.round(layout.utilization)}%
                                            utilization
                                        </span>
                                        <div>
                                            <Button
                                                disabled={disabled}
                                                onClick={() =>
                                                    void output('png')
                                                }
                                            >
                                                <FileImage size={16} /> PNG
                                            </Button>
                                            <Button
                                                disabled={disabled}
                                                onClick={() =>
                                                    void output('jpeg')
                                                }
                                            >
                                                JPEG
                                            </Button>
                                            <Button
                                                disabled={disabled}
                                                onClick={() =>
                                                    void output('pdf')
                                                }
                                            >
                                                <FileDown size={16} /> Export
                                                PDF
                                            </Button>
                                            <Button
                                                variant="primary"
                                                disabled={disabled}
                                                onClick={() => {
                                                    setPrintCurrent(false);
                                                    setDialog('print');
                                                }}
                                            >
                                                <Printer size={16} /> Print
                                                sheet
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                session.active && (
                                    <>
                                        <div className="editor-layout">
                                            <CropEditor
                                                photo={session.active}
                                                update={session.update}
                                                history={session.history}
                                                dpi={settings.dpi}
                                                notify={session.setMessage}
                                            />
                                            <EnhancementPanel
                                                key={`${session.active.id}-${workspace}`}
                                                photo={session.active}
                                                update={session.update}
                                                dpi={settings.dpi}
                                            />
                                        </div>
                                        <div className="sheet-actions">
                                            <span>
                                                <ShieldCheck size={15} />{' '}
                                                Original photo preserved in
                                                memory
                                            </span>
                                            <div>
                                                <Button
                                                    disabled={!!progress}
                                                    onClick={() =>
                                                        void downloadCurrent()
                                                    }
                                                >
                                                    <Download size={15} />{' '}
                                                    Download photo
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setPrintCurrent(true);
                                                        setDialog('print');
                                                    }}
                                                >
                                                    <Printer size={15} /> Print
                                                    current photo
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    onClick={() =>
                                                        navigate('sheet')
                                                    }
                                                >
                                                    Arrange sheet{' '}
                                                    <ArrowRight size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )
                            )}
                            {session.photos.length > 0 && (
                                <PhotoGallery
                                    photos={session.photos}
                                    selected={session.active?.id || ''}
                                    select={session.setSelected}
                                    remove={session.remove}
                                    duplicate={session.duplicate}
                                    reorder={session.reorder}
                                    upload={(files, replace) =>
                                        void session.upload(
                                            files,
                                            workspace,
                                            replace,
                                        )
                                    }
                                    busy={!!session.busy}
                                />
                            )}
                        </>
                    )}
                    {workspace === 'recent' && (
                        <>
                            <div className="workspace-title">
                                <div>
                                    <div className="eyebrow">
                                        SESSION ACTIVITY
                                    </div>
                                    <h1>Recent jobs</h1>
                                    <p>
                                        Anonymous summaries from this browser
                                        session. No image data or filenames.
                                    </p>
                                </div>
                                <Button
                                    disabled={!jobs.length}
                                    onClick={() => setJobs([])}
                                >
                                    Clear summaries
                                </Button>
                            </div>
                            <RecentJobs jobs={jobs} full />
                        </>
                    )}
                    {workspace === 'settings' && (
                        <>
                            <div className="workspace-title">
                                <div>
                                    <div className="eyebrow">
                                        MAKE IT YOUR WORKSTATION
                                    </div>
                                    <h1>Studio settings</h1>
                                    <p>
                                        Set your everyday defaults. Only these
                                        non-sensitive preferences are saved.
                                    </p>
                                </div>
                            </div>
                            <div className="settings-grid">
                                <section className="settings-card">
                                    <h3>
                                        <Printer size={20} /> Print defaults
                                    </h3>
                                    <label className="studio-field">
                                        <span>Default paper</span>
                                        <select
                                            value={preferences.paper}
                                            onChange={(e) =>
                                                savePreferences({
                                                    paper: e.target.value,
                                                })
                                            }
                                        >
                                            {papers
                                                .filter(
                                                    (p) => p.id !== 'custom',
                                                )
                                                .map((p) => (
                                                    <option
                                                        key={p.id}
                                                        value={p.id}
                                                    >
                                                        {p.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                    <label className="studio-field">
                                        <span>Default resolution</span>
                                        <select
                                            value={preferences.dpi}
                                            onChange={(e) =>
                                                savePreferences({
                                                    dpi: Number(e.target.value),
                                                })
                                            }
                                        >
                                            {[150, 300, 600].map((dpi) => (
                                                <option key={dpi} value={dpi}>
                                                    {dpi} DPI
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <p>
                                        The printer is selected in the system
                                        print dialog. The browser does not
                                        expose a printer list.
                                    </p>
                                </section>
                                <section className="settings-card">
                                    <h3>
                                        <ShieldCheck size={20} /> Session
                                        privacy
                                    </h3>
                                    <label className="studio-field">
                                        <span>Inactivity warning after</span>
                                        <select
                                            value={preferences.idle}
                                            onChange={(e) =>
                                                savePreferences({
                                                    idle: Number(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                        >
                                            {[5, 10, 15, 30, 60].map(
                                                (minutes) => (
                                                    <option
                                                        key={minutes}
                                                        value={minutes}
                                                    >
                                                        {minutes} minutes
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                    <p>
                                        A warning appears before automatic
                                        cleanup, with 60 seconds to continue.
                                        Ending a session releases photos,
                                        thumbnails, history, and object URLs.
                                    </p>
                                    <p>
                                        Browser memory cleanup cannot guarantee
                                        forensic erasure. Downloaded files and
                                        print jobs remain outside the
                                        application’s control.
                                    </p>
                                </section>
                                <section className="settings-card">
                                    <h3>
                                        <Camera size={20} /> Presets &
                                        processing
                                    </h3>
                                    <p>
                                        Photo dimensions, backgrounds, head
                                        guidance, and DPI are defined centrally
                                        in the tool configuration. You can
                                        choose custom dimensions in the editor.
                                    </p>
                                    <p>
                                        Face detection uses the browser’s local
                                        detector where available. Background
                                        removal is unavailable until a local
                                        engine is configured. No
                                        image-processing server is enabled.
                                    </p>
                                </section>
                                <section className="settings-card">
                                    <h3>
                                        <Keyboard size={20} /> Keyboard
                                        shortcuts
                                    </h3>
                                    <ShortcutList />
                                </section>
                            </div>
                        </>
                    )}
                    {workspace === 'future' && (
                        <>
                            <div className="workspace-title">
                                <div>
                                    <div className="eyebrow">ROOM TO GROW</div>
                                    <h1>More tools, same simplicity.</h1>
                                    <p>
                                        Planned additions for your CSC counter.
                                        These tools are not yet available.
                                    </p>
                                </div>
                            </div>
                            <div className="future-grid">
                                {futureTools.map((tool) => (
                                    <article
                                        className="settings-card"
                                        key={tool.title}
                                    >
                                        <tool.icon size={28} />
                                        <span className="metadata-tag">
                                            Planned
                                        </span>
                                        <h3>{tool.title}</h3>
                                        <p>
                                            Designed to fit the same local,
                                            privacy-first workflow.
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </main>
                <footer className="studio-bottom-bar">
                    <span>
                        <ShieldCheck size={13} /> LOCAL PROCESSING · CUSTOMER
                        PRIVACY FIRST
                    </span>
                    <span>
                        SmartScan Studio <i /> v1.0
                    </span>
                </footer>
            </div>
            {(session.message || session.busy || progress) && (
                <div
                    className={`studio-notice ${session.busy || progress ? 'working' : ''}`}
                    role="status"
                >
                    <ShieldCheck size={18} />
                    <span>{progress || session.busy || session.message}</span>
                    {session.busy || progress ? (
                        <Button
                            onClick={() => {
                                run.current++;
                                releaseTemporaryResources();
                                if (session.busy) session.cancel();
                                else
                                    session.setMessage(
                                        'Processing cancelled. Existing photos remain available.',
                                    );
                                setProgress('');
                            }}
                        >
                            Cancel
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            title="Dismiss message"
                            onClick={() => session.setMessage('')}
                        >
                            <X size={16} />
                        </Button>
                    )}
                </div>
            )}
            {dialog === 'clear' && (
                <Modal
                    title="Clear this photo session?"
                    close={() => setDialog(null)}
                >
                    <div className="modal-copy">
                        <div className="modal-icon">
                            <Trash2 size={28} />
                        </div>
                        <p>
                            All {session.photos.length} photos, edits,
                            thumbnails, and temporary resources will be
                            released. This cannot be undone.
                        </p>
                        <p>Downloaded files and print jobs are unaffected.</p>
                    </div>
                    <div className="modal-actions">
                        <Button onClick={() => setDialog(null)}>
                            Keep editing
                        </Button>
                        <Button variant="danger" onClick={clearConfirmed}>
                            Clear all photos
                        </Button>
                    </div>
                </Modal>
            )}
            {dialog === 'idle' && (
                <Modal
                    title="Still working on this job?"
                    close={() => {
                        activity.current = Date.now();
                        setDialog(null);
                    }}
                >
                    <div className="modal-copy">
                        <Clock3 size={32} />
                        <p>
                            For customer privacy, this session will clear in{' '}
                            <b>{idleSeconds} seconds</b>.
                        </p>
                    </div>
                    <div className="modal-actions">
                        <Button
                            onClick={() => {
                                nextWorkspace.current = 'dashboard';
                                clearConfirmed();
                            }}
                        >
                            End session now
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                activity.current = Date.now();
                                setDialog(null);
                            }}
                        >
                            Continue working
                        </Button>
                    </div>
                </Modal>
            )}
            {dialog === 'help' && (
                <Modal
                    title="Your local photo workstation"
                    close={() => setDialog(null)}
                >
                    <div className="modal-copy">
                        <h3>
                            <ShieldCheck size={20} /> Privacy by default
                        </h3>
                        <p>
                            Photos are decoded and processed on this device. No
                            customer image data is uploaded or persisted in
                            browser storage. Clear or end the session to release
                            application-held resources.
                        </p>
                        <p>
                            Browser memory cannot guarantee forensic erasure.
                            Downloads and printer spool files remain outside our
                            control. Anonymous job summaries last only for this
                            page session.
                        </p>
                        <h3>
                            <Keyboard size={20} /> Work a little faster
                        </h3>
                        <ShortcutList />
                        <h3>Printing accurately</h3>
                        <p>
                            Select matching paper in your printer driver, Actual
                            size / 100% scale, and disable fit-to-page.
                            Printable margins and borderless support vary by
                            printer. Check a test print with a ruler.
                        </p>
                    </div>
                </Modal>
            )}
            {dialog === 'print' && (
                <Modal
                    title={
                        printCurrent ? 'Print current photo' : 'Preview & print'
                    }
                    close={() => setDialog(null)}
                    wide
                >
                    <div className="print-modal-grid">
                        <SheetCanvas
                            layout={currentLayout}
                            settings={
                                printCurrent
                                    ? {
                                          ...settings,
                                          marks: false,
                                      }
                                    : settings
                            }
                            update={updateSettings}
                            manual={false}
                        />
                        <div className="print-confirmation">
                            <span className="local-badge">
                                <CheckCircle2 size={14} /> PRINT-READY REVIEW
                            </span>
                            <h3>
                                {currentLayout.width} × {currentLayout.height}{' '}
                                mm
                            </h3>
                            <p>
                                {currentLayout.width > currentLayout.height
                                    ? 'Landscape'
                                    : 'Portrait'}{' '}
                                · {settings.dpi} DPI
                            </p>
                            <div className="layout-summary">
                                <p>
                                    <span>Photos</span>
                                    <b>{currentLayout.pages.flat().length}</b>
                                </p>
                                <p>
                                    <span>Pages</span>
                                    <b>{currentLayout.pages.length}</b>
                                </p>
                                <p>
                                    <span>Output</span>
                                    <b>
                                        {mmToPx(
                                            currentLayout.width,
                                            settings.dpi,
                                        )}{' '}
                                        ×{' '}
                                        {mmToPx(
                                            currentLayout.height,
                                            settings.dpi,
                                        )}{' '}
                                        px
                                    </b>
                                </p>
                                <p>
                                    <span>Printer</span>
                                    <b>Select in system dialog</b>
                                </p>
                            </div>
                            {session.photos.some((p) =>
                                resolutionWarning(p, settings.dpi),
                            ) && (
                                <p className="studio-warning">
                                    <AlertTriangle size={16} /> Some source
                                    photos have insufficient resolution. Review
                                    them before printing.
                                </p>
                            )}
                            <div className="print-instructions">
                                <b>Actual size / 100%</b>
                                <p>
                                    Select the matching paper, turn off
                                    fit-to-page, and verify printer margins or
                                    borderless support. Browser CSS requests
                                    physical size; driver settings can still
                                    change it.
                                </p>
                            </div>
                            <Button
                                variant="primary"
                                disabled={
                                    !currentLayout.pages.length ||
                                    !!currentLayout.error
                                }
                                onClick={() => void print()}
                            >
                                <Printer size={16} /> Open print dialog
                            </Button>
                            {!printCurrent && (
                                <>
                                    <div className="export-buttons">
                                        <Button
                                            disabled={disabled}
                                            onClick={() => {
                                                setDialog(null);
                                                void output('pdf');
                                            }}
                                        >
                                            <FileDown size={16} /> PDF
                                        </Button>
                                        <Button
                                            disabled={disabled}
                                            onClick={() => {
                                                setDialog(null);
                                                void output('png');
                                            }}
                                        >
                                            <Download size={16} /> PNG
                                        </Button>
                                        <Button
                                            disabled={disabled}
                                            onClick={() => {
                                                setDialog(null);
                                                void output('jpeg');
                                            }}
                                        >
                                            JPEG
                                        </Button>
                                    </div>
                                </>
                            )}
                            <Button
                                variant="ghost"
                                onClick={() => setDialog(null)}
                            >
                                Return to editing
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
function ArrowUpRightIcon() {
    return <ArrowRight size={13} style={{ transform: 'rotate(-35deg)' }} />;
}
function ShortcutList() {
    return (
        <div className="shortcut-list">
            <p>
                <span>Undo / redo</span>
                <kbd>Ctrl Z / Ctrl Shift Z</kbd>
            </p>
            <p>
                <span>Rotate photo</span>
                <kbd>R</kbd>
            </p>
            <p>
                <span>Delete selected photo</span>
                <kbd>Delete</kbd>
            </p>
            <p>
                <span>Print preview</span>
                <kbd>Ctrl P</kbd>
            </p>
        </div>
    );
}
