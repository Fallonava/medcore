"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check, X, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface Option {
    value: string | number;
    label: string;
    sublabel?: string;
    image?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number | undefined;
    onChange: (value: any) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    noResultsText?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Pilih...",
    searchPlaceholder = "Cari...",
    noResultsText = "Hasil tidak ditemukan",
    label,
    className,
    disabled = false
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 300);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Filtered options based on debounced search
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );

    const isSearching = searchTerm !== debouncedSearch;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {label && (
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 ml-1">
                    {label}
                </label>
            )}
            
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between gap-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3 text-sm transition-all duration-200 shadow-sm outline-none",
                    isOpen && "ring-2 ring-blue-500/10 border-blue-500/50 bg-white",
                    disabled && "opacity-50 cursor-not-allowed bg-slate-50"
                )}
            >
                <div className="flex items-center gap-3 truncate">
                    {selectedOption?.image ? (
                        <img src={selectedOption.image} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={14} />
                        </div>
                    )}
                    <div className="text-left truncate">
                        <div className={cn("font-semibold truncate", !selectedOption && "text-slate-400 font-normal")}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </div>
                        {selectedOption?.sublabel && (
                            <div className="text-[10px] text-slate-400 font-medium truncate -mt-0.5">
                                {selectedOption.sublabel}
                            </div>
                        )}
                    </div>
                </div>
                <ChevronDown 
                    size={16} 
                    className={cn("text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} 
                />
            </button>

            {/* Dropdown Menu */}
            <div className={cn(
                "absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 origin-top z-[100]",
                isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            )}>
                {/* Search Header */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/30">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={searchPlaceholder}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isSearching ? (
                                <Loader2 size={14} className="text-blue-500 animate-spin" />
                            ) : searchTerm ? (
                                <button 
                                    onClick={() => setSearchTerm("")}
                                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Options List */}
                <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={cn(
                                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all duration-200 mb-1 last:mb-0 group/opt",
                                    value === opt.value
                                        ? "bg-blue-50 text-blue-700 font-bold"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {opt.image ? (
                                        <img src={opt.image} alt="" className="w-7 h-7 rounded-lg object-cover group-hover/opt:scale-110 transition-transform" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                            <User size={14} />
                                        </div>
                                    )}
                                    <div className="text-left truncate">
                                        <div className="truncate font-semibold">{opt.label}</div>
                                        {opt.sublabel && (
                                            <div className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">
                                                {opt.sublabel}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {value === opt.value ? (
                                    <Check size={16} className="text-blue-600 flex-shrink-0 animate-in zoom-in-50 duration-300" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0 group-hover/opt:border-blue-300 transition-colors" />
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="py-10 px-4 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 mb-3 border border-slate-100">
                                <Search size={20} />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{noResultsText}</p>
                            <p className="text-[10px] text-slate-300 mt-1">Coba kata kunci lain</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
