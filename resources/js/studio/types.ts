export type Workspace =
    | 'dashboard'
    | 'passport'
    | 'editor'
    | 'sheet'
    | 'recent'
    | 'settings'
    | 'future';
export interface Edit {
    width: number;
    height: number;
    copies: number;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
    zoom: number;
    x: number;
    y: number;
    brightness: number;
    contrast: number;
    saturation: number;
    exposure: number;
    highlights: number;
    shadows: number;
    sharpness: number;
    noise: number;
    background: string;
}
export interface Photo {
    id: string;
    name: string;
    url: string;
    image: HTMLImageElement;
    width: number;
    height: number;
    edit: Edit;
    past: Edit[];
    future: Edit[];
}
export interface SheetSettings {
    paper: string;
    width: number;
    height: number;
    landscape: boolean;
    dpi: number;
    gapX: number;
    gapY: number;
    top: number;
    bottom: number;
    left: number;
    right: number;
    marks: boolean;
    border: boolean;
    background: string;
    columns: number;
    rows: number;
    offsets: Record<string, { x: number; y: number }>;
}
export interface Placement {
    key: string;
    photo: Photo;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Layout {
    pages: Placement[][];
    width: number;
    height: number;
    columns: number;
    rows: number;
    utilization: number;
    error: string;
}
export interface Job {
    id: string;
    time: string;
    tool: string;
    count: number;
    pages: number;
    paper: string;
    action: string;
}
