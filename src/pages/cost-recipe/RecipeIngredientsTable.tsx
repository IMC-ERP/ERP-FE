import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

import { formatCurrency, formatUnitCost, getIngredientCost, getIngredientUnitCost } from './helpers';
import type { RawMaterial, RecipeIngredient } from './types';

interface IngredientComboboxProps {
    value: string;
    materials: RawMaterial[];
    onChange: (materialId: string) => void;
    missingLabel: string;
}

interface DropdownCoords {
    left: number;
    top: number;
    width: number;
}

function IngredientCombobox({ value, materials, onChange, missingLabel }: IngredientComboboxProps) {
    const selected = materials.find((candidate) => candidate.id === value);
    const selectedDisplay = selected
        ? `${selected.name} (${selected.category})`
        : value
            ? `${missingLabel} (${value})`
            : '';

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [coords, setCoords] = useState<DropdownCoords | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                inputRef.current && inputRef.current.contains(target)
            ) {
                return;
            }
            if (
                dropdownRef.current && dropdownRef.current.contains(target)
            ) {
                return;
            }
            setOpen(false);
            setQuery('');
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    useLayoutEffect(() => {
        if (!open) {
            setCoords(null);
            return;
        }
        const updateCoords = () => {
            if (!inputRef.current) return;
            const rect = inputRef.current.getBoundingClientRect();
            setCoords({
                left: rect.left,
                top: rect.bottom + 4,
                width: rect.width,
            });
        };
        updateCoords();
        window.addEventListener('scroll', updateCoords, true);
        window.addEventListener('resize', updateCoords);
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [open]);

    const filteredMaterials = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return materials;
        return materials.filter(
            (item) =>
                item.name.toLowerCase().includes(normalized) ||
                item.category.toLowerCase().includes(normalized)
        );
    }, [query, materials]);

    return (
        <>
            <input
                ref={inputRef}
                type="text"
                value={open ? query : selectedDisplay}
                placeholder="원재료 검색..."
                onFocus={() => {
                    setOpen(true);
                    setQuery('');
                }}
                onChange={(event) => {
                    setOpen(true);
                    setQuery(event.target.value);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        setOpen(false);
                        setQuery('');
                        (event.target as HTMLInputElement).blur();
                    }
                }}
                className="w-full p-1 border border-slate-300 rounded text-sm bg-white"
            />
            {open && coords && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        left: coords.left,
                        top: coords.top,
                        width: coords.width,
                        zIndex: 1000,
                    }}
                    className="max-h-60 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg"
                >
                    {filteredMaterials.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">검색 결과가 없습니다.</div>
                    ) : (
                        filteredMaterials.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    onChange(item.id);
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 ${
                                    item.id === value
                                        ? 'bg-indigo-50 font-semibold text-indigo-700'
                                        : 'text-slate-700'
                                }`}
                            >
                                {item.name}{' '}
                                <span className="text-xs text-slate-400">({item.category})</span>
                            </button>
                        ))
                    )}
                </div>,
                document.body
            )}
        </>
    );
}

interface RecipeIngredientsTableProps {
    ingredients: RecipeIngredient[];
    materials: RawMaterial[];
    onUpdateIngredient: (ingredientId: string, field: keyof RecipeIngredient, value: string | number) => void;
    onRemoveIngredient: (ingredientId: string) => void;
    emptyMessage: string;
    missingIngredientLabel?: string;
}

export function RecipeIngredientsTable({
    ingredients,
    materials,
    onUpdateIngredient,
    onRemoveIngredient,
    emptyMessage,
    missingIngredientLabel = '삭제된 재료',
}: RecipeIngredientsTableProps) {
    const totalCost = ingredients.reduce((sum, ingredient) => sum + getIngredientCost(ingredient, materials), 0);

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="responsive-table-shell">
                <table className="w-full min-w-[720px] text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                        <tr>
                            <th className="px-4 py-2">원재료 선택</th>
                            <th className="px-4 py-2 text-right">사용 용량</th>
                            <th className="px-4 py-2 text-right">단위</th>
                            <th className="px-4 py-2 text-right">단위당 원가</th>
                            <th className="px-4 py-2 text-right">재료비</th>
                            <th className="px-4 py-2 text-center">삭제</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {ingredients.map((ingredient) => {
                            const material = materials.find((candidate) => candidate.id === ingredient.materialId);
                            const unitPrice = getIngredientUnitCost(ingredient, materials);
                            const cost = getIngredientCost(ingredient, materials);

                            return (
                                <tr key={ingredient.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2">
                                        <IngredientCombobox
                                            value={ingredient.materialId}
                                            materials={materials}
                                            onChange={(materialId) => onUpdateIngredient(ingredient.id, 'materialId', materialId)}
                                            missingLabel={missingIngredientLabel}
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <input
                                            type="number"
                                            value={ingredient.qty}
                                            onChange={(e) => onUpdateIngredient(ingredient.id, 'qty', parseFloat(e.target.value) || 0)}
                                            step="any"
                                            className="w-24 p-1 border border-slate-300 rounded text-right text-sm inline-block"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-500">{material?.unit ?? '-'}</td>
                                    <td className="px-4 py-2 text-right text-slate-400 font-mono">{formatUnitCost(unitPrice)}</td>
                                    <td className="px-4 py-2 text-right font-bold text-slate-700 font-mono">{formatCurrency(cost)}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => onRemoveIngredient(ingredient.id)}
                                            className="text-slate-400 hover:text-red-500"
                                            aria-label={`${material?.name ?? '재료'} 재료 행 삭제`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {ingredients.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-4 text-center text-slate-400">{emptyMessage}</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                        <tr>
                            <td colSpan={4} className="px-4 py-3 text-right">총 원가 합계</td>
                            <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(totalCost)}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
