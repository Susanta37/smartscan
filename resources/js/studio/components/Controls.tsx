import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
export function Button({
    children,
    variant = 'secondary',
    className = '',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            className={`studio-button ${variant} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
export function NumberField({
    label,
    value,
    onChange,
    min = 0,
    max = 1000,
    step = 1,
    suffix = '',
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
}) {
    return (
        <label className="studio-field">
            <span>{label}</span>
            <div className="number-wrap">
                <input
                    type="number"
                    aria-label={label}
                    min={min}
                    max={max}
                    step={step}
                    value={Number(value.toFixed(3))}
                    onChange={(e) => {
                        if (
                            e.target.value !== '' &&
                            Number.isFinite(e.target.valueAsNumber)
                        )
                            onChange(
                                Math.min(
                                    max,
                                    Math.max(min, e.target.valueAsNumber),
                                ),
                            );
                    }}
                />
                <small>{suffix}</small>
            </div>
        </label>
    );
}
export function Slider({
    label,
    value,
    onChange,
    min,
    max,
    step = 1,
    display,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    display?: string;
}) {
    const id = useId();
    return (
        <label className="studio-slider" htmlFor={id}>
            <span>
                {label}
                <output>{display ?? value}</output>
            </span>
            <input
                id={id}
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </label>
    );
}
