/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState, useRef } from 'react';
import { em } from '@lib/engine/engine_manager';
import { screenManager } from '@lib/screen/screen_manager';
import { inputManager } from '@lib/input/input_manager';
import { motion, AnimatePresence } from 'framer-motion';

// --- SCREEN ---

import { GameScreen } from './game/GameScreen';

// --- STYLES & TOKENS ---

const TOKENS = {
    Surface: {
        HUD: 'rgba(5, 5, 5, 0.4)',
        Loader: '#000000',
        Glass: 'rgba(255, 255, 255, 0.03)',
        Border: 'rgba(255, 255, 255, 0.08)'
    },
    Content: {
        Value: '#FFFFFF',
        Label: 'rgba(255, 255, 255, 0.4)',
        Accent: '#FF3E3E',
        Secondary: '#888888'
    },
    Font: {
        Hero: "'Bebas Neue', sans-serif",
        Mono: "'JetBrains Mono', monospace",
        Body: "'Inter', sans-serif"
    }
};

const styles = {
    loaderOverlay: {
        position: 'fixed' as const,
        inset: 0,
        backgroundColor: TOKENS.Surface.Loader,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'auto' as const,
    },
    loaderText: {
        fontFamily: TOKENS.Font.Mono,
        fontSize: '11px',
        letterSpacing: '0.4em',
        color: TOKENS.Content.Value,
        marginBottom: '24px',
        opacity: 0.8
    },
    loaderBarContainer: {
        width: '120px',
        height: '1px',
        backgroundColor: TOKENS.Surface.Border,
        position: 'relative' as const,
        overflow: 'hidden'
    },
    loaderBar: {
        width: '40px',
        height: '100%',
        backgroundColor: TOKENS.Content.Accent,
    },
    hudContainer: {
        position: 'fixed' as const,
        inset: 0,
        pointerEvents: 'none' as const,
        padding: '32px',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'space-between',
        zIndex: 50
    },
    dataBlock: {
        backgroundColor: TOKENS.Surface.HUD,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${TOKENS.Surface.Border}`,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px'
    },
    label: {
        fontFamily: TOKENS.Font.Body,
        fontSize: '9px',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.15em',
        color: TOKENS.Content.Label
    },
    value: {
        fontFamily: TOKENS.Font.Mono,
        fontSize: '18px',
        color: TOKENS.Content.Value,
        lineHeight: 1
    },
    joystickContainer: {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        border: `1px solid ${TOKENS.Surface.Border}`,
        backgroundColor: TOKENS.Surface.Glass,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative' as const,
        touchAction: 'none' as const
    },
    joystickKnob: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: TOKENS.Content.Value,
        boxShadow: '0 0 20px rgba(255,255,255,0.2)'
    }
};

// --- UI COMPONENTS ---

const Joystick = ({ onChange }: { onChange: (dir: { x: number, y: number }) => void }) => {
    const [dragging, setDragging] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        setDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = rect.width / 2;
        
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        
        setPos({ x: dx, y: dy });
        onChange({ x: dx / maxDist, y: dy / maxDist });
    };

    const handlePointerUp = () => {
        setDragging(false);
        setPos({ x: 0, y: 0 });
        onChange({ x: 0, y: 0 });
    };

    return (
        <div 
            ref={containerRef}
            style={styles.joystickContainer}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <motion.div 
                style={styles.joystickKnob}
                animate={{ x: pos.x, y: pos.y }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            />
        </div>
    );
};

const ScoreDisplay = ({ gameRef }: { gameRef: React.MutableRefObject<GameScreen | null> }) => {
    const [score, setScore] = useState(0);
    
    useEffect(() => {
        const interval = setInterval(() => {
            if (gameRef.current && gameRef.current.enemyManager) {
                setScore(gameRef.current.enemyManager.score);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [gameRef]);
    
    return (
        <div style={styles.dataBlock}>
            <span style={styles.label}>Combat Points</span>
            <span style={styles.value}>{score.toString().padStart(6, '0')}</span>
        </div>
    );
};

const HealthBar = ({ gameRef }: { gameRef: React.MutableRefObject<GameScreen | null> }) => {
    const [health, setHealth] = useState(100);
    
    useEffect(() => {
        const interval = setInterval(() => {
            if (gameRef.current && gameRef.current.plane) {
                setHealth(gameRef.current.plane.health);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [gameRef]);
    
    return (
        <div style={{ ...styles.dataBlock, width: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={styles.label}>Integrity</span>
                <span style={{ ...styles.label, fontFamily: TOKENS.Font.Mono, color: TOKENS.Content.Value }}>{Math.round(health)}%</span>
            </div>
            <div style={{ height: '2px', width: '100%', background: TOKENS.Surface.Border, marginTop: '4px' }}>
                <motion.div 
                    style={{ height: '100%', backgroundColor: health < 30 ? TOKENS.Content.Accent : '#FFFFFF' }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${health}%` }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                />
            </div>
        </div>
    );
};

const VirtualJoystickDisplay = ({ gameRef }: { gameRef: React.MutableRefObject<GameScreen | null> }) => {
    const [vx, setVx] = useState(0);
    const [vy, setVy] = useState(0);
    
    useEffect(() => {
        let frame: number;
        const loop = () => {
            if (gameRef.current) {
                setVx(gameRef.current.virtualMouseX);
                setVy(gameRef.current.virtualMouseY);
            }
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [gameRef]);
    
    return (
        <div 
            style={{
                position: 'absolute',
                width: '12px',
                height: '12px',
                border: `1px solid ${TOKENS.Content.Value}`,
                borderRadius: '50%',
                pointerEvents: 'none',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${vx * 150}px), calc(-50% + ${vy * 150}px))`,
                mixDifference: 'difference'
            } as any}
        />
    );
};

// --- APP COMPONENT ---

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const gameScreenRef = useRef<GameScreen | null>(null);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);

        const init = async () => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const screen = new GameScreen();
            gameScreenRef.current = screen;
            screenManager.requestSetScreen(screen);
            
            await screen.onEnter();
            
            em.startup(false);
            setIsReady(true);
        };

        init();

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            em.pause();
        };
    }, []);

    const handleJoystickChange = (dir: { x: number, y: number }) => {
        if (gameScreenRef.current) {
            if (inputManager.isPointerLockCaptured()) return;
            gameScreenRef.current.moveDir = dir;
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
            <AnimatePresence>
                {!isReady && (
                    <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.loaderOverlay}
                    >
                        <motion.div
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            style={styles.loaderText}
                        >
                            SYSTEM COLD START
                        </motion.div>
                        
                        <div style={styles.loaderBarContainer}>
                            <motion.div 
                                animate={{ x: [-120, 120] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                style={styles.loaderBar}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HUD */}
            {isReady && (
                <div style={styles.hudContainer}>
                    {/* TOP BAR */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ 
                                fontFamily: TOKENS.Font.Hero, 
                                color: TOKENS.Content.Value, 
                                fontSize: '28px', 
                                letterSpacing: '0.1em', 
                                margin: 0 
                            }}>
                                ARCADE.FLIGHT
                            </h1>
                            <div style={{ ...styles.label, marginTop: '2px', fontSize: '8px' }}>Alpha Build 0.4.0</div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <ScoreDisplay gameRef={gameScreenRef} />
                            <HealthBar gameRef={gameScreenRef} />
                        </div>
                    </div>

                    {/* CROSSHAIR AREA */}
                    <div style={{ 
                        position: 'fixed' as const, 
                        inset: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        pointerEvents: 'none' 
                    }}>
                        {/* Static Crosshair */}
                        <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                            <div style={{ position: 'absolute', left: '50%', width: '1px', height: '100%', backgroundColor: TOKENS.Content.Value, opacity: 0.2 }} />
                            <div style={{ position: 'absolute', top: '50%', width: '100%', height: '1px', backgroundColor: TOKENS.Content.Value, opacity: 0.2 }} />
                        </div>
                        <VirtualJoystickDisplay gameRef={gameScreenRef} />
                    </div>

                    {/* BOTTOM BAR */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Joystick onChange={handleJoystickChange} />
                        
                        <div style={{ ...styles.dataBlock, opacity: 0.8 }}>
                            <span style={styles.label}>Control Link</span>
                            <span style={{ ...styles.value, fontSize: '10px' }}>ESTABLISHED // SECURE</span>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                canvas {
                    image-rendering: auto;
                    cursor: crosshair;
                }
                body {
                    background: #000;
                    margin: 0;
                    overflow: hidden;
                    user-select: none;
                }
            `}</style>
        </div>
    );
};

export default App;
