import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableSliderValueProps {
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (newValue: number) => void;
    className?: string;
}

export function EditableSliderValue({
    value,
    min,
    max,
    step,
    onChange,
    className,
}: EditableSliderValueProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);
    const isInt = step === 1;
    const displayFormat = isInt ? '0' : '2'; // Number of decimal places

    useEffect(() => {
        // Update internal state if the external value changes while not editing
        if (!isEditing) {
            setInputValue(value.toFixed(displayFormat));
        }
    }, [value, isEditing, displayFormat]);

    useEffect(() => {
        // Focus the input when entering edit mode
        if (isEditing && inputRef.current) {
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        let numericValue = parseFloat(inputValue);
        if (isNaN(numericValue)) {
            numericValue = value; // Revert if input is not a number
        }

        // Clamp value within min/max
        numericValue = Math.max(min, Math.min(max, numericValue));

        // Adjust to step if necessary (optional, might be complex for floats)
        // For simplicity, we'll just clamp and format

        onChange(numericValue);
        setIsEditing(false);
        // Update inputValue state to reflect the potentially clamped/formatted value
        setInputValue(numericValue.toFixed(displayFormat));
    };

    const handleCancel = () => {
        setInputValue(value.toFixed(displayFormat)); // Revert to original value
        setIsEditing(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSave();
        } else if (event.key === 'Escape') {
            handleCancel();
        }
    };

    const handleSpanClick = () => {
        setInputValue(value.toFixed(displayFormat)); // Ensure input starts with current formatted value
        setIsEditing(true);
    };

    return (
        <div className={cn("relative", className)}>
            {isEditing ? (
                <Input
                    ref={inputRef}
                    type="number" // Use number input for better mobile experience potentially
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleSave} // Save on blur
                    onKeyDown={handleKeyDown}
                    className="h-6 px-1 text-xs text-right tabular-nums w-full" // Match span style
                    step={step} // Set step for number input controls
                    min={min}
                    max={max}
                />
            ) : (
                <span
                    onClick={handleSpanClick}
                    className="text-xs text-right tabular-nums cursor-pointer block w-full px-1 py-0.5 rounded hover:bg-muted" // Make it look clickable
                >
                    {value.toFixed(displayFormat)}
                </span>
            )}
        </div>
    );
}
