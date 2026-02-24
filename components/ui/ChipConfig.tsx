"use client"

import React, {useState} from "react";

type ChipDenomination = {
    color: string;
    value: number;
}

interface ChipConfigProps {
    onChange: (denominations: ChipDenomination[]) => void;
}

export default function ChipConfig({ onChange }: ChipConfigProps) {
    const [denominations, setDenominations] = useState<ChipDenomination[]>([
        { color: "", value: 0 },
    ]);

    const updateRow = (index: number, field: keyof ChipDenomination, rawValue: string) => {
        const updated = denominations.map((d, i) => {
            if (i !== index) return d;
            if (field === "value") return { ...d, value: parseFloat(rawValue) || 0 };
            return { ...d, [field]: rawValue };
        });
        setDenominations(updated);
        onChange(updated);
    };

    const addRow = () => {
        const updated = [...denominations, { color: "", value: 0 }];
        setDenominations(updated);
        onChange(updated);
    };

    const removeRow = (index: number) => {
        const updated = denominations.filter((_, i) => i !== index);
        setDenominations(updated);
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Chip Denominations</h3>

            {denominations.map((denom, index) => (
                <div key={index} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={denom.color}
                        onChange={(e) => updateRow(index, "color", e.target.value)}
                        placeholder="Color (e.g. Red)"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                    />
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            $
                        </span>
                        <input
                            type="number"
                            value={denom.value || ""}
                            onChange={(e) => updateRow(index, "value", e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 outline-none"
                        />
                    </div>
                    {denominations.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-red-500 hover:text-red-700 text-lg px-2"
                        >
                            &times;
                        </button>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={addRow}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
                + Add denomination
            </button>
        </div>
    );
}
