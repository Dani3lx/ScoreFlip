"use client";
import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

const MODEL_URL = "/face_landmarker.task";
const THRESHOLD_RATIO = 0.75; // blink = eye less than 75% of resting EAR
const COOLDOWN = 1200;
const DOUBLE_BLINK_WINDOW = 600;
const BASELINE_DURATION = 1500; // ms to collect resting EAR samples

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function calcEAR(landmarks: { x: number; y: number }[], indices: number[]) {
    const p = indices.map((i) => landmarks[i]);
    const v1 = dist(p[1], p[5]);
    const v2 = dist(p[2], p[4]);
    const h = dist(p[0], p[3]);
    if (h === 0) return 0;
    return (v1 + v2) / (2.0 * h);
}

let cachedLandmarker: FaceLandmarker | null = null;
let loadingPromise: Promise<FaceLandmarker | undefined> | null = null;

async function preloadLandmarker() {
    if (cachedLandmarker) return cachedLandmarker;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks("/wasm");
            cachedLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: MODEL_URL,
                    delegate: "CPU",
                },
                runningMode: "VIDEO",
                numFaces: 1,
            });
            return cachedLandmarker;
        } catch (err) {
            loadingPromise = null;
            throw err;
        }
    })();

    return loadingPromise;
}

export default function BlinkDetector({ onDoubleBlink }: { onDoubleBlink: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onDoubleBlinkRef = useRef(onDoubleBlink);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<"idle" | "preloading" | "starting" | "calibrating" | "ready" | "error">("idle");

    useEffect(() => {
        onDoubleBlinkRef.current = onDoubleBlink;
    }, [onDoubleBlink]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setStatus("preloading");
                await preloadLandmarker();
                if (mounted) setStatus("idle");
            } catch (e) {
                console.error("Preload error:", e);
                if (mounted) setStatus("error");
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        return () => {
            if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
            streamRef.current?.getTracks().forEach((track) => track.stop());
            video?.pause();
            if (video) video.srcObject = null;
        };
    }, []);

    async function enableCamera() {
        setStatus("starting");

        let lastVideoTime = -1;
        let eyeClosed = false;
        let blinkStart = 0;
        let lastBlinkTime = 0;
        let lastTurn = 0;

        // Baseline calibration state
        let baselineEAR: number | null = null;
        const baselineSamples: number[] = [];
        let calibrationStart: number | null = null;

        function processFrame() {
            const video = videoRef.current;
            if (!video || !cachedLandmarker || video.paused || video.ended || video.readyState < 2) {
                animationFrameRef.current = requestAnimationFrame(processFrame);
                return;
            }

            if (video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime;

                const now = performance.now();
                const results = cachedLandmarker.detectForVideo(video, now);

                if (results.faceLandmarks?.length) {
                    const lm = results.faceLandmarks[0];
                    const ear = (calcEAR(lm, LEFT_EYE) + calcEAR(lm, RIGHT_EYE)) / 2;

                    // --- Baseline calibration phase ---
                    if (baselineEAR === null) {
                        if (calibrationStart === null) {
                            calibrationStart = now;
                            setStatus("calibrating");
                        }

                        if (now - calibrationStart < BASELINE_DURATION) {
                            // Only collect samples where eyes look open (ear > 0.15)
                            // to avoid closed-eye frames skewing the baseline
                            if (ear > 0.15) baselineSamples.push(ear);
                        } else {
                            if (baselineSamples.length > 5) {
                                // Trim top/bottom 10% to remove outliers
                                baselineSamples.sort((a, b) => a - b);
                                const trim = Math.floor(baselineSamples.length * 0.1);
                                const trimmed = baselineSamples.slice(trim, baselineSamples.length - trim);
                                baselineEAR = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
                                console.log(
                                    `Baseline EAR: ${baselineEAR.toFixed(3)}, threshold: ${(baselineEAR * THRESHOLD_RATIO).toFixed(3)}`,
                                );
                            } else {
                                // Not enough samples (face not detected) — fall back to fixed threshold
                                baselineEAR = 0.28;
                                console.warn("Insufficient baseline samples, using fallback EAR threshold");
                            }
                            setStatus("ready");
                        }

                        animationFrameRef.current = requestAnimationFrame(processFrame);
                        return;
                    }

                    // --- Blink detection phase ---
                    const dynamicThreshold = baselineEAR * THRESHOLD_RATIO;

                    if (ear < dynamicThreshold) {
                        if (!eyeClosed) {
                            eyeClosed = true;
                            blinkStart = now;
                        }
                    } else {
                        if (eyeClosed) {
                            eyeClosed = false;
                            const duration = now - blinkStart;

                            if (duration > 40 && duration < 450) {
                                const timeSinceLast = now - lastBlinkTime;

                                if (lastBlinkTime > 0 && timeSinceLast < DOUBLE_BLINK_WINDOW) {
                                    lastBlinkTime = 0;
                                    if (now - lastTurn > COOLDOWN) {
                                        lastTurn = now;
                                        onDoubleBlinkRef.current();
                                    }
                                } else {
                                    lastBlinkTime = now;
                                }
                            }
                            // Out-of-range blinks (squints, long holds) don't reset lastBlinkTime
                        }
                    }
                }
            }

            animationFrameRef.current = requestAnimationFrame(processFrame);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
            });

            streamRef.current = stream;
            if (!videoRef.current) return;
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = async () => {
                try {
                    await videoRef.current?.play();
                    if (!cachedLandmarker) await preloadLandmarker();
                    animationFrameRef.current = requestAnimationFrame(processFrame);
                } catch (e) {
                    console.error("Playback failed:", e);
                    setStatus("error");
                }
            };
        } catch (e) {
            console.error("Camera failed:", e);
            setStatus("error");
        }
    }

    return (
        <>
            {status === "idle" && <button onClick={enableCamera}>Enable blink control</button>}
            {status === "preloading" && <button disabled>Preparing...</button>}
            {status === "starting" && <button disabled>Starting camera...</button>}
            {status === "calibrating" && <button disabled>Calibrating... keep eyes open</button>}
            {status === "ready" && <p>Blink control active</p>}
            {status === "error" && <p>Camera error — check permissions</p>}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
            />
        </>
    );
}
