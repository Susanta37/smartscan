import {
    ArrowUpRight,
    ArrowRight,
    ShieldCheck,
    Upload,
    Printer,
    Camera,
    Crop,
    LayoutGrid,
    Clock3,
    CheckCircle2,
    FolderOpen,
    Plus,
    Monitor,
    Sparkles,
} from 'lucide-react';
import type { Job, Workspace } from '../types';
import { tools } from '../config';
import { Button } from './Controls';
export function ToolIllustration({ tool }: { tool: string }) {
    return (
        <div className={`tool-illustration ${tool}`} aria-hidden="true">
            {tool === 'passport' ? (
                <>
                    <div className="illustration-photo">
                        <div className="portrait-head" />
                        <div className="portrait-body" />
                        <i />
                        <i />
                        <i />
                        <i />
                    </div>
                    <div className="size-tag">
                        35 × 45 mm <CheckCircle2 size={12} />
                    </div>
                    <div className="illustration-squares">
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                </>
            ) : tool === 'editor' ? (
                <>
                    <div className="editor-art">
                        <div className="landscape-sun" />
                        <div className="landscape-mountain" />
                        <div className="landscape-front" />
                        <div className="art-crop" />
                    </div>
                    <div className="enhance-tag">
                        <Sparkles size={13} /> Natural enhancement
                    </div>
                    <div className="art-sliders">
                        <i />
                        <i />
                        <i />
                    </div>
                </>
            ) : (
                <>
                    <div className="mini-sheet">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div key={i}>
                                <div className="portrait-head" />
                                <div className="portrait-body" />
                            </div>
                        ))}
                    </div>
                    <div className="dpi-tag">
                        <Printer size={13} /> 300 DPI
                    </div>
                    <span className="ruler-art">4 × 6 inch</span>
                </>
            )}
        </div>
    );
}
export function RecentJobs({
    jobs,
    full = false,
}: {
    jobs: Job[];
    full?: boolean;
}) {
    return (
        <section className="recent-panel">
            <div className="section-heading">
                <div>
                    <h3>Recent jobs</h3>
                    <p>
                        Only job summaries. Your customers’ photos are never
                        saved.
                    </p>
                </div>
                <span className="metadata-tag">
                    <ShieldCheck size={13} /> Metadata only
                </span>
            </div>
            {jobs.length ? (
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>JOB</th>
                                <th>WORKSPACE</th>
                                <th>PHOTOS</th>
                                <th>PAPER</th>
                                <th>ACTIVITY</th>
                                <th>TIME</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.slice(0, full ? 100 : 5).map((job) => (
                                <tr key={job.id}>
                                    <td>
                                        <span className="job-icon">
                                            <Printer size={15} />
                                        </span>{' '}
                                        {job.id.slice(0, 8).toUpperCase()}
                                    </td>
                                    <td>{job.tool}</td>
                                    <td>{job.count}</td>
                                    <td>
                                        {job.paper} · {job.pages} pages
                                    </td>
                                    <td>
                                        <span className="job-status">
                                            {job.action}
                                        </span>
                                    </td>
                                    <td>{job.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="recent-empty">
                    <div>
                        <FolderOpen size={26} strokeWidth={1.4} />
                    </div>
                    <b>Your first job starts here</b>
                    <p>
                        Completed exports and print-dialog requests will appear
                        here.
                    </p>
                </div>
            )}
        </section>
    );
}
export default function Dashboard({
    navigate,
    photos,
    copies,
    jobs,
    dpi,
    newJob,
}: {
    navigate: (workspace: Workspace) => void;
    photos: number;
    copies: number;
    jobs: Job[];
    dpi: number;
    newJob: () => void;
}) {
    return (
        <>
            <div className="dashboard-title">
                <div>
                    <div className="eyebrow">YOUR EVERYDAY PHOTO WORKSPACE</div>
                    <h1>
                        Good work starts here<span>.</span>
                    </h1>
                    <p>
                        From a customer’s photo to a perfect print. All in one
                        place.
                    </p>
                </div>
                <Button variant="primary" onClick={newJob}>
                    <Plus size={17} /> New photo job
                </Button>
            </div>
            <section className="welcome-banner">
                <div className="welcome-banner-content">
                    <span className="local-badge">
                        <span /> BUILT FOR YOUR CSC
                    </span>
                    <h2>
                        Small details.
                        <br />
                        Professional results.
                    </h2>
                    <p>
                        Passport photos, everyday edits, and print-ready sheets.
                        <br />
                        The tools you need. The privacy your customers deserve.
                    </p>
                    <Button onClick={() => navigate('passport')}>
                        Create passport photos <ArrowRight size={16} />
                    </Button>
                </div>
                <div className="banner-art" aria-hidden="true">
                    <div className="banner-sheet">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div key={i}>
                                <div className="portrait-head" />
                                <div className="portrait-body" />
                            </div>
                        ))}
                    </div>
                    <div className="banner-photo">
                        <div className="portrait-head" />
                        <div className="portrait-body" />
                        <div className="passport-guideline" />
                        <span>35 × 45 mm</span>
                    </div>
                    <div className="banner-check">
                        <CheckCircle2 size={16} /> Ready for a great impression
                    </div>
                    <div className="banner-deco one" />
                    <div className="banner-deco two" />
                </div>
            </section>
            <div className="dashboard-stats">
                <div>
                    <span className="stat-icon blue">
                        <Camera size={19} />
                    </span>
                    <div>
                        <small>Photos in session</small>
                        <b>
                            {String(photos).padStart(2, '0')}
                            <em>Ready to work</em>
                        </b>
                    </div>
                </div>
                <div>
                    <span className="stat-icon violet">
                        <LayoutGrid size={19} />
                    </span>
                    <div>
                        <small>Total print copies</small>
                        <b>
                            {String(copies).padStart(2, '0')}
                            <em>Current batch</em>
                        </b>
                    </div>
                </div>
                <div>
                    <span className="stat-icon teal">
                        <Printer size={19} />
                    </span>
                    <div>
                        <small>Print resolution</small>
                        <b>
                            {dpi}
                            <em>DPI · Photo quality</em>
                        </b>
                    </div>
                </div>
                <div>
                    <span className="stat-icon amber">
                        <ShieldCheck size={19} />
                    </span>
                    <div>
                        <small>Processing mode</small>
                        <b className="stat-word">
                            100% local<em>On this device</em>
                        </b>
                    </div>
                </div>
            </div>
            <div className="section-heading workspace-heading">
                <div>
                    <h2>Choose your workspace</h2>
                    <p>Three focused tools. One seamless workflow.</p>
                </div>
                <span className="section-caption">
                    <Monitor size={14} /> Designed for the way you work
                </span>
            </div>
            <div className="tool-cards">
                {tools.map((tool) => (
                    <article
                        className={`tool-card ${tool.color}`}
                        key={tool.id}
                    >
                        <ToolIllustration tool={tool.id} />
                        <div className="tool-card-content">
                            <span className="tool-tag">{tool.tag}</span>
                            <h3>
                                <tool.icon size={20} />
                                {tool.title}
                            </h3>
                            <p>{tool.description}</p>
                            <ul>
                                {tool.features.map((feature) => (
                                    <li key={feature}>
                                        <CheckCircle2 size={14} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Button onClick={() => navigate(tool.id)}>
                                Open workspace <ArrowUpRight size={17} />
                            </Button>
                        </div>
                    </article>
                ))}
            </div>
            <div className="workflow-strip">
                <div className="workflow-title">
                    <b>A smoother counter workflow</b>
                    <span>Less clicking. More serving.</span>
                </div>
                <div>
                    <span>01</span>
                    <Upload size={16} />
                    <b>Import photos</b>
                </div>
                <ArrowRight size={14} />
                <div>
                    <span>02</span>
                    <Crop size={16} />
                    <b>Edit & arrange</b>
                </div>
                <ArrowRight size={14} />
                <div>
                    <span>03</span>
                    <Printer size={16} />
                    <b>Print & clear</b>
                </div>
            </div>
            <RecentJobs jobs={jobs} />
            <div className="dashboard-footer">
                <span>
                    <ShieldCheck size={14} /> Customer privacy is part of every
                    job.
                </span>
                <span>
                    <Clock3 size={14} /> Faster at the counter. Better on paper.
                </span>
            </div>
        </>
    );
}
