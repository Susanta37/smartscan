import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultEdit } from '../config';
import type { Edit, Photo } from '../types';
import { releaseTemporaryResources } from '../services/privacy';
import { suggestFace } from '../services/image';
export function usePhotoSession() {
    const [photos, setPhotos] = useState<Photo[]>([]),
        [selected, setSelected] = useState(''),
        [busy, setBusy] = useState(''),
        [message, setMessage] = useState('');
    const urls = useRef(new Set<string>()),
        generation = useRef(0),
        mounted = useRef(true);
    const release = useCallback(() => {
        generation.current++;
        for (const url of urls.current) URL.revokeObjectURL(url);
        urls.current.clear();
        releaseTemporaryResources();
    }, []);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            release();
        };
    }, [release]);
    const clear = useCallback(() => {
        release();
        setPhotos([]);
        setSelected('');
        setBusy('');
        setMessage(
            'Session cleared. All application-held photo URLs have been released.',
        );
    }, [release]);
    const cancel = () => {
        generation.current++;
        setBusy('');
        setMessage(
            'Import cancelled. Photos already imported remain available.',
        );
    };
    async function upload(
        files: FileList | File[],
        mode = 'passport',
        replaceId?: string,
    ) {
        if (busy) return;
        const batch = Array.from(files);
        if (photos.length + batch.length > 40) {
            setMessage(
                'Limit each session to 40 photos. Clear or remove photos before importing more.',
            );
            return;
        }
        const ticket = ++generation.current;
        const errors: string[] = [];
        for (let index = 0; index < batch.length; index++) {
            if (ticket !== generation.current || !mounted.current) break;
            const file = batch[index];
            setBusy(`Importing ${index + 1} of ${batch.length}`);
            if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
            ) {
                errors.push(`${file.name}: use JPG, PNG, or WebP.`);
                continue;
            }
            if (file.size > 25 * 1024 * 1024) {
                errors.push(`${file.name}: maximum file size is 25 MB.`);
                continue;
            }
            const url = URL.createObjectURL(file);
            urls.current.add(url);
            try {
                const image = new Image();
                image.src = url;
                await image.decode();
                if (ticket !== generation.current || !mounted.current) {
                    URL.revokeObjectURL(url);
                    urls.current.delete(url);
                    break;
                }
                if (image.naturalWidth * image.naturalHeight > 40_000_000)
                    throw new Error('maximum image size is 40 megapixels');
                const photo: Photo = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    url,
                    image,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                    edit: {
                        ...defaultEdit,
                        ...(mode === 'editor'
                            ? { width: 101.6, height: 152.4, copies: 1 }
                            : {}),
                    },
                    past: [],
                    future: [],
                };
                if (mode === 'passport') {
                    try {
                        const suggested = await suggestFace(photo);
                        if (suggested)
                            photo.edit = { ...photo.edit, ...suggested };
                    } catch {
                        /* Manual crop remains available. */
                    }
                }
                if (ticket !== generation.current || !mounted.current) {
                    URL.revokeObjectURL(url);
                    urls.current.delete(url);
                    break;
                }
                setPhotos((current) =>
                    replaceId
                        ? current.map((p) => (p.id === replaceId ? photo : p))
                        : [...current, photo],
                );
                setSelected(photo.id);
            } catch (error) {
                URL.revokeObjectURL(url);
                urls.current.delete(url);
                errors.push(
                    `${file.name}: ${error instanceof Error ? error.message : 'could not decode image'}.`,
                );
            }
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (ticket === generation.current && mounted.current) {
            setBusy('');
            setMessage(
                errors.length
                    ? errors.join(' ')
                    : `${batch.length} photo${batch.length === 1 ? '' : 's'} imported locally. EXIF orientation is handled by the browser decoder.`,
            );
        }
    }
    function update(patch: Partial<Edit>, all = false) {
        setPhotos((current) =>
            current.map((p) =>
                all ||
                p.id ===
                    (current.find((item) => item.id === selected)?.id ||
                        current[0]?.id)
                    ? {
                          ...p,
                          edit: { ...p.edit, ...patch },
                          past: [...p.past.slice(-49), p.edit],
                          future: [],
                      }
                    : p,
            ),
        );
    }
    function history(redo = false) {
        setPhotos((current) =>
            current.map((p) => {
                if (
                    p.id !==
                    (current.find((item) => item.id === selected)?.id ||
                        current[0]?.id)
                )
                    return p;
                const stack = redo ? p.future : p.past;
                if (!stack.length) return p;
                const edit = stack[stack.length - 1];
                return {
                    ...p,
                    edit,
                    past: redo ? [...p.past, p.edit] : p.past.slice(0, -1),
                    future: redo
                        ? p.future.slice(0, -1)
                        : [...p.future, p.edit],
                };
            }),
        );
    }
    function remove(id: string) {
        setPhotos((current) => current.filter((p) => p.id !== id));
        if (selected === id) setSelected('');
    }
    // A duplicated photo can share its original URL. All originals are released together on clear/end/unmount.
    function duplicate(id: string) {
        if (photos.length >= 40) {
            setMessage('The session limit is 40 photos.');
            return;
        }
        setPhotos((current) => {
            const p = current.find((item) => item.id === id);
            return p
                ? [
                      ...current,
                      {
                          ...p,
                          id: crypto.randomUUID(),
                          edit: { ...p.edit },
                          past: [],
                          future: [],
                      },
                  ]
                : current;
        });
    }
    function reorder(id: string, direction: number) {
        setPhotos((current) => {
            const next = [...current],
                index = next.findIndex((p) => p.id === id),
                target = index + direction;
            if (target < 0 || target >= next.length) return current;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }
    // Release URLs no longer referenced by an active photo, including removed/replaced originals.
    useEffect(() => {
        if (busy) return;
        const active = new Set(photos.map((p) => p.url));
        for (const url of urls.current)
            if (!active.has(url)) {
                URL.revokeObjectURL(url);
                urls.current.delete(url);
            }
    }, [photos, busy]);
    return {
        photos,
        selected,
        setSelected,
        active: photos.find((p) => p.id === selected) || photos[0],
        busy,
        message,
        setMessage,
        upload,
        cancel,
        clear,
        update,
        history,
        remove,
        duplicate,
        reorder,
        generation,
    };
}
