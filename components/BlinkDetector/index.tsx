"use client";
import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function calcEAR(landmarks: { x: number; y: number }[], indices: number[]) {
    const p = indices.map((i) => landmarks[i]);
    const v1 = dist(p[1], p[5]);
    const v2 = dist(p[2], p[4]);
    const h = dist(p[0], p[3]);
    return (v1 + v2) / (2.0 * h);
}

let cachedLandmarker: FaceLandmarker | null = null;

export default function BlinkDetector({ onDoubleBlink }: { onDoubleBlink: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onDoubleBlinkRef = useRef(onDoubleBlink);

    useEffect(() => {
        onDoubleBlinkRef.current = onDoubleBlink;
    }, [onDoubleBlink]);

    useEffect(() => {
        let animFrame: number;
        let landmarker: FaceLandmarker;
        let lastFrameTime = 0;

        let eyeClosed = false;
        let blinkStart = 0;
        let lastBlinkTime = 0;
        const THRESHOLD = 0.22;
        const COOLDOWN = 1200;
        const DOUBLE_BLINK_WINDOW = 600;
        let lastTurn = 0;

        function processFrame(timestamp: number) {
            if (timestamp - lastFrameTime < 33) {
                animFrame = requestAnimationFrame(processFrame);
                return;
            }
            lastFrameTime = timestamp;

            const video = videoRef.current;
            if (!video || !landmarker || video.videoWidth === 0 || video.videoHeight === 0) {
                animFrame = requestAnimationFrame(processFrame);
                return;
            }

            const now = Date.now();
            const results = landmarker.detectForVideo(video, now);

            if (results.faceLandmarks?.length) {
                const lm = results.faceLandmarks[0];
                const ear = (calcEAR(lm, LEFT_EYE) + calcEAR(lm, RIGHT_EYE)) / 2;

                if (ear < THRESHOLD) {
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

            animFrame = requestAnimationFrame(processFrame);
        }

        async function start() {
            try {
                if (!cachedLandmarker) {
                    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
                    cachedLandmarker = await FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                            delegate: "GPU",
                        },
                        runningMode: "VIDEO",
                        numFaces: 1,
                    });
                }

                landmarker = cachedLandmarker;

                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (!videoRef.current) return;
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current!.play();
                    videoRef.current!.oncanplay = () => requestAnimationFrame(processFrame);
                };
            } catch (e) {
                console.error("BlinkDetector failed to start:", e);
            }
        }

        start();

        return () => {
            cancelAnimationFrame(animFrame);
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    return <video ref={videoRef} autoPlay muted playsInline hidden />;
}
