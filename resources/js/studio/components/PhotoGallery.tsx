import { useRef, useState } from 'react';
import {
    Copy,
    Trash2,
    ArrowLeft,
    ArrowRight,
    Replace,
    Plus,
} from 'lucide-react';
import type { Photo } from '../types';
import { Button } from './Controls';
import { PhotoCanvas } from './CropEditor';
export default function PhotoGallery({
    photos,
    selected,
    select,
    remove,
    duplicate,
    reorder,
    upload,
    busy,
}: {
    photos: Photo[];
    selected: string;
    select: (id: string) => void;
    remove: (id: string) => void;
    duplicate: (id: string) => void;
    reorder: (id: string, direction: number) => void;
    upload: (files: FileList, replaceId?: string) => void;
    busy: boolean;
}) {
    const input = useRef<HTMLInputElement>(null),
        [replace, setReplace] = useState<string>();
    function choose(id?: string) {
        setReplace(id);
        input.current?.click();
    }
    return (
        <section className="photo-gallery">
            <div className="section-heading">
                <h3>
                    Current batch <span>{photos.length}</span>
                </h3>
                <Button disabled={busy} onClick={() => choose()}>
                    <Plus size={15} /> Add photos
                </Button>
            </div>
            <input
                ref={input}
                hidden
                type="file"
                multiple={!replace}
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                    if (e.target.files) upload(e.target.files, replace);
                    e.target.value = '';
                }}
            />
            <div className="gallery-grid">
                {photos.map((photo, index) => (
                    <article
                        key={photo.id}
                        className={selected === photo.id ? 'selected' : ''}
                    >
                        <button
                            className="gallery-photo"
                            onClick={() => select(photo.id)}
                        >
                            <PhotoCanvas photo={photo} width={100} />
                            <span>{index + 1}</span>
                        </button>
                        <div className="gallery-name" title={photo.name}>
                            {photo.name}
                        </div>
                        <small>
                            {photo.edit.copies} copies · {photo.edit.width} ×{' '}
                            {photo.edit.height} mm
                        </small>
                        <div className="gallery-actions">
                            <Button
                                title="Move earlier"
                                disabled={index === 0}
                                onClick={() => reorder(photo.id, -1)}
                            >
                                <ArrowLeft size={13} />
                            </Button>
                            <Button
                                title="Move later"
                                disabled={index === photos.length - 1}
                                onClick={() => reorder(photo.id, 1)}
                            >
                                <ArrowRight size={13} />
                            </Button>
                            <Button
                                title="Duplicate photo"
                                onClick={() => duplicate(photo.id)}
                            >
                                <Copy size={13} />
                            </Button>
                            <Button
                                title="Replace photo"
                                disabled={busy}
                                onClick={() => choose(photo.id)}
                            >
                                <Replace size={13} />
                            </Button>
                            <Button
                                title="Delete photo"
                                onClick={() => remove(photo.id)}
                            >
                                <Trash2 size={13} />
                            </Button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
