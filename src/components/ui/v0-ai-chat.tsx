"use client";

import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    FileUp,
    Package,
    ShoppingCart,
    Users,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    BarChart3,
    Store,
} from "lucide-react";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            // Temporarily shrink to get the right scrollHeight
            textarea.style.height = `${minHeight}px`;

            // Calculate new height
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        // Set initial height
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    // Adjust height on window resize
    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface ShopifyAIChatProps {
    className?: string;
    onSendMessage?: (message: string) => void;
}

export function ShopifyAIChat({ className, onSendMessage }: ShopifyAIChatProps) {
    const [value, setValue] = useState("");
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                onSendMessage?.(value.trim());
                setValue("");
                adjustHeight(true);
            }
        }
    };

    const handleSend = () => {
        if (value.trim()) {
            onSendMessage?.(value.trim());
            setValue("");
            adjustHeight(true);
        }
    };

    return (
        <div className={cn("flex flex-col items-center w-full max-w-4xl mx-auto p-4 space-y-8", className)}>
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-white">
                    How can I help manage your store?
                </h1>
                <p className="text-white/70 text-lg">
                    AI-powered Shopify management at your fingertips
                </p>
            </div>

            <div className="w-full">
                <div className="relative bg-black/40 backdrop-blur-sm rounded-xl border border-white/20">
                    <div className="overflow-y-auto">
                        <Textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                adjustHeight();
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me to create products, manage inventory, analyze sales, or help with any store task..."
                            className={cn(
                                "w-full px-4 py-3",
                                "resize-none",
                                "bg-transparent",
                                "border-none",
                                "text-white text-sm",
                                "focus:outline-none",
                                "focus-visible:ring-0 focus-visible:ring-offset-0",
                                "placeholder:text-white/50 placeholder:text-sm",
                                "min-h-[60px]"
                            )}
                            style={{
                                overflow: "hidden",
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="group p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Paperclip className="w-4 h-4 text-white" />
                                <span className="text-xs text-white/60 hidden group-hover:inline transition-opacity">
                                    Attach
                                </span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="px-2 py-1 rounded-lg text-sm text-white/60 transition-colors border border-dashed border-white/30 hover:border-white/50 hover:bg-white/10 flex items-center justify-between gap-1"
                            >
                                <Store className="w-4 h-4" />
                                Store Context
                            </button>
                            <button
                                type="button"
                                onClick={handleSend}
                                className={cn(
                                    "px-1.5 py-1.5 rounded-lg text-sm transition-colors border border-white/30 hover:border-white/50 hover:bg-white/10 flex items-center justify-between gap-1",
                                    value.trim()
                                        ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                                        : "text-white/60"
                                )}
                            >
                                <ArrowUpIcon
                                    className={cn(
                                        "w-4 h-4",
                                        value.trim()
                                            ? "text-white"
                                            : "text-white/60"
                                    )}
                                />
                                <span className="sr-only">Send</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                    <ActionButton
                        icon={<Package className="w-4 h-4" />}
                        label="Create Product"
                    />
                    <ActionButton
                        icon={<ShoppingCart className="w-4 h-4" />}
                        label="Manage Orders"
                    />
                    <ActionButton
                        icon={<BarChart3 className="w-4 h-4" />}
                        label="View Analytics"
                    />
                    <ActionButton
                        icon={<Users className="w-4 h-4" />}
                        label="Customer Insights"
                    />
                    <ActionButton
                        icon={<ImageIcon className="w-4 h-4" />}
                        label="Upload Images"
                    />
                </div>
            </div>
        </div>
    );
}

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
        >
            {icon}
            <span className="text-xs">{label}</span>
        </button>
    );
}
