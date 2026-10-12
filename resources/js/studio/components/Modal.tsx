import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Controls';
export default function Modal({
    title,
    children,
    close,
    wide = false,
}: {
    title: string;
    children: ReactNode;
    close: () => void;
    wide?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        ref.current?.showModal();
        return () => ref.current?.close();
    }, []);
    return (
        <dialog
            ref={ref}
            className={`studio-modal ${wide ? 'wide' : ''}`}
            onCancel={(e) => {
                e.preventDefault();
                close();
            }}
        >
            <div className="modal-heading">
                <h2>{title}</h2>
                <Button variant="ghost" title="Close dialog" onClick={close}>
                    <X size={19} />
                </Button>
            </div>
            {children}
        </dialog>
    );
}
