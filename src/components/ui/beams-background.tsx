"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
    className?: string;
    children?: React.ReactNode;
    intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    pulse: number;
    pulseSpeed: number;
}

// Convert CrewFlow orange (#FF6A3D) to HSL: hue=16, saturation=100%, lightness=62%
const CREWFLOW_ORANGE_HUE = 16;

function createBeam(width: number, height: number): Beam {
    const angle = -35 + Math.random() * 8; // Reduced randomness for consistency
    return {
        x: Math.random() * width,
        y: Math.random() * height + height,
        width: 15 + Math.random() * 25, // Reduced width range
        length: height * 1.2, // Reduced length
        angle: angle,
        speed: 0.2 + Math.random() * 0.4, // Slower speed
        opacity: 0.5 + Math.random() * 0.3, // TEMPORARY: Much higher opacity for debugging
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.012, // Slower pulse
    };
}

export function BeamsBackground({
    className,
    children,
    intensity = "strong",
}: AnimatedGradientBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const beamsRef = useRef<Beam[]>([]);
    const animationFrameRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const MINIMUM_BEAMS = 8; // Reduced from 20 to 8 for better performance

    const opacityMap = {
        subtle: 1.0, // TEMPORARY: Max opacity for debugging
        medium: 1.0,
        strong: 1.0,
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('🔴 BeamsBackground: Canvas ref not found');
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.log('🔴 BeamsBackground: Canvas context not found');
            return;
        }

        console.log('🟢 BeamsBackground: Canvas initialized', {
            width: canvas.width,
            height: canvas.height,
            intensity
        });

        const updateCanvasSize = () => {
            // Use lower DPR for better performance on high-DPI displays
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);

            // Reduced beam count for better performance
            const totalBeams = MINIMUM_BEAMS;
            beamsRef.current = Array.from({ length: totalBeams }, () =>
                createBeam(canvas.width, canvas.height)
            );

            console.log('🟡 BeamsBackground: Created beams', {
                totalBeams,
                beamCount: beamsRef.current.length,
                firstBeam: beamsRef.current[0]
            });
        };

        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        function resetBeam(beam: Beam, index: number, totalBeams: number) {
            if (!canvas) return beam;

            const column = index % 3;
            const spacing = window.innerWidth / 3;

            beam.y = window.innerHeight + 50;
            beam.x = Math.max(0, Math.min(window.innerWidth,
                column * spacing +
                spacing / 2 +
                (Math.random() - 0.5) * spacing * 0.3
            ));
            beam.width = 15 + Math.random() * 25; // Reduced width
            beam.speed = 0.2 + Math.random() * 0.4; // Slower speed
            beam.opacity = 0.5 + Math.random() * 0.3; // TEMPORARY: Much higher opacity for debugging
            return beam;
        }

        function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
            ctx.save();
            ctx.translate(beam.x, beam.y);
            ctx.rotate((beam.angle * Math.PI) / 180);

            // Subtle pulsing opacity for background effect
            const pulsingOpacity =
                beam.opacity *
                (0.8 + Math.sin(beam.pulse) * 0.2) *
                0.15; // Subtle background opacity

            // Simplified gradient with fewer color stops for better performance
            const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

            // Use CrewFlow orange color theme
            gradient.addColorStop(0, `hsla(${CREWFLOW_ORANGE_HUE}, 100%, 62%, 0)`);
            gradient.addColorStop(0.3, `hsla(${CREWFLOW_ORANGE_HUE}, 100%, 62%, ${pulsingOpacity})`);
            gradient.addColorStop(0.7, `hsla(${CREWFLOW_ORANGE_HUE}, 100%, 62%, ${pulsingOpacity})`);
            gradient.addColorStop(1, `hsla(${CREWFLOW_ORANGE_HUE}, 100%, 62%, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
            ctx.restore();

            // Debug logging removed
        }

        function animate(currentTime: number) {
            if (!canvas || !ctx) return;

            // Throttle animation to ~30fps for better performance
            if (currentTime - lastFrameTimeRef.current < 33) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }
            lastFrameTimeRef.current = currentTime;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // TEMPORARY: Remove blur for debugging
            ctx.filter = "none";

            // Test rectangle removed - canvas confirmed working

            const totalBeams = beamsRef.current.length;
            beamsRef.current.forEach((beam, index) => {
                beam.y -= beam.speed;
                beam.pulse += beam.pulseSpeed;

                // Reset beam when it goes off screen
                if (beam.y + beam.length < -50 || beam.x < -100 || beam.x > window.innerWidth + 100) {
                    resetBeam(beam, index, totalBeams);
                }

                // Only draw beams that are within reasonable bounds
                if (beam.x > -200 && beam.x < window.innerWidth + 200) {
                    drawBeam(ctx, beam);
                }
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        }

        animate(0);

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [intensity]);

    return (
        <div
            className={cn(
                "absolute inset-0 w-full h-full overflow-hidden",
                className
            )}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{
                    filter: "blur(0.5px)" // Subtle blur for polished effect
                }}
            />

            {/* Simplified overlay with CrewFlow theme colors */}
            <motion.div
                className="absolute inset-0 bg-black/5"
                animate={{
                    opacity: [0.01, 0.03, 0.01],
                }}
                transition={{
                    duration: 15, // Slower animation
                    ease: "easeInOut",
                    repeat: Number.POSITIVE_INFINITY,
                }}
                style={{
                    backdropFilter: "blur(10px)", // Reduced blur
                }}
            />

            {children}
        </div>
    );
}
