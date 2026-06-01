"use client";
import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

const IS_IOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
const MODEL_URL = IS_IOS
    ? "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float32/1/face_landmarker.task"
    : "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const EAR_THRESHOLD = IS_IOS ? 0.25 : 0.22;

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

// preload starts immediately when component mounts
async function preloadLandmarker() {
    if (cachedLandmarker) return cachedLandmarker;
    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");

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
    const [status, setStatus] = useState<"idle" | "preloading" | "starting" | "ready" | "error">("idle");

    useEffect(() => {
        onDoubleBlinkRef.current = onDoubleBlink;
    }, [onDoubleBlink]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                setStatus("preloading");
                console.log("Starting preload...");
                await preloadLandmarker();
                console.log("Preload complete");
                if (mounted) {
                    setStatus("idle");
                }
            } catch (e) {
                console.error("Preload error:", e);
                if (mounted) {
                    setStatus("error");
                }
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, []);

    // Clean up animation and stream
    useEffect(() => {
        const video = videoRef.current;

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            streamRef.current?.getTracks().forEach((track) => {
                track.stop();
            });

            video?.pause();

            if (video) {
                video.srcObject = null;
            }
        };
    }, []);

    async function enableCamera() {
        setStatus("starting");

        let lastVideoTime = -1;
        let eyeClosed = false;
        let blinkStart = 0;
        let lastBlinkTime = 0;
        const COOLDOWN = 1200;
        const DOUBLE_BLINK_WINDOW = 600;
        let lastTurn = 0;

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

                    if (ear < EAR_THRESHOLD) {
                        if (!eyeClosed) {
                            eyeClosed = true;
                            blinkStart = now;
                        }
                    } else {
                        if (eyeClosed) {
                            eyeClosed = false;
                            const duration = now - blinkStart;
                            if (duration > 60 && duration < 400) {
                                if (now - lastBlinkTime < DOUBLE_BLINK_WINDOW) {
                                    lastBlinkTime = 0;
                                    if (now - lastTurn > COOLDOWN) {
                                        lastTurn = now;
                                        onDoubleBlinkRef.current();
                                    }
                                } else {
                                    lastBlinkTime = now;
                                }
                            }
                        }
                    }
                }
            }

            animationFrameRef.current = requestAnimationFrame(processFrame);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                },
            });

            streamRef.current = stream;

            if (!videoRef.current) return;
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = async () => {
                try {
                    await videoRef.current?.play();
                    if (!cachedLandmarker) await preloadLandmarker();

                    setStatus("ready");
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
