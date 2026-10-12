import { ImagePlus, Upload, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './Controls';
export default function ImageUploader({
    onFiles,
    compact = false,
    disabled = false,
}: {
    onFiles: (files: FileList) => void;
    compact?: boolean;
    disabled?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null),
        [drag, setDrag] = useState(false);
    return (
        <div
            className={`studio-upload ${compact ? 'compact' : ''} ${drag ? 'dragging' : ''}`}
            onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (!disabled && e.dataTransfer.files.length)
                    onFiles(e.dataTransfer.files);
            }}
        >
            <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(e) => {
                    if (e.target.files) onFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            <div className="upload-icon">
                <ImagePlus size={compact ? 22 : 32} strokeWidth={1.5} />
            </div>
            <div>
                <h3>
                    {compact
                        ? 'Add customer photos'
                        : 'A new photo. A new possibility.'}
                </h3>
                <p>Drop photos here, or choose files from your computer</p>
            </div>
            <Button
                variant="primary"
                disabled={disabled}
                onClick={() => input.current?.click()}
            >
                <Upload size={16} /> Upload photos
            </Button>
            <small>JPG, PNG or WebP · Up to 25 MB per photo</small>
            {!compact && (
                <span className="upload-private">
                    <ShieldCheck size={14} /> Processed on this device. Never
                    uploaded.
                </span>
            )}
        </div>
    );
}
