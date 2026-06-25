'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnimalTypeId, AnimalStatus } from '@/lib/garden-utils'
import { ANIMAL_STAGES } from '@/lib/garden-utils'

type AnimalStage = typeof ANIMAL_STAGES[number]

/* ── 말풍선 메시지 ──────────────────────────────────────────── */

const MESSAGES: Record<string, string[]> = {
  egg:        ['뭔가 꿈틀거리는 소리가 나요...', '부화 중이에요... 💫', '얼른 부화하고 싶어요!'],
  hungry:     ['배고파요... 😢 오늘 분석 해줘요!', '밥 줘요! 빨리요!', '배꼽시계가 울려요...'],
  pet_cat:    ['냐냥~ 행복해요! ❤️', '그르릉... 좋아요!', '또 쓰다듬어줘요! 😺'],
  pet_dog:    ['왈왈! 기분 최고예요! 🐾', '꼬리 흔들흔들~', '또 해줘요! 😄'],
  pet_rabbit: ['폴짝폴짝~ 행복해요! 🐇', '귀가 간질간질해요! ✨', '냠냠~ 고마워요!'],
  idle_cat:   ['지금 낮잠 자고 싶은데...', '나 정시도 가만있지 않아!', '그루밍 할 시간이에요~'],
  idle_dog:   ['오늘 산책 안 가나요?', '놀아줘요! 🎾', '꼬리 흔들흔들!'],
  idle_rabbit:['당근 먹고 싶어요! 🥕', '귀가 두근두근해요...', '폴짝폴짝 뛰고 싶어요!'],
}

function pickMessage(pool: string[]) {
  return pool[Math.floor(Math.random() * pool.length)]
}

/* ── 스탯 바 ────────────────────────────────────────────────── */

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold w-16 shrink-0" style={{ color: '#555' }}>{label}</span>
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

/* ── 파티클 ─────────────────────────────────────────────────── */

interface Particle { id: number; emoji: string; x: number; y: number }

const PARTICLE_SETS: Record<string, string[]> = {
  egg:      ['💫', '✨', '💤', '❓'],
  baby:     ['❤️', '🍼', '💛', '😊'],
  growing:  ['❤️', '💚', '✨', '⭐'],
  adult:    ['❤️', '💚', '💛', '🎵'],
  enhanced: ['❤️', '💜', '✨', '🌟'],
  legend:   ['👑', '🌟', '💫', '✨'],
}

/* ── 말풍선 ─────────────────────────────────────────────────── */

function SpeechBubble({ message }: { message: string }) {
  return (
    <motion.div
      className="absolute text-xs font-bold px-3 py-2 rounded-2xl z-20"
      style={{
        background: 'white',
        color: '#444',
        top: '-46px',
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        border: '2px solid rgba(0,0,0,0.06)',
      }}
      initial={{ opacity: 0, scale: 0.6, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -4 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      {message}
      <div style={{
        position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: '8px solid white',
      }} />
    </motion.div>
  )
}

/* ── 알 SVG ─────────────────────────────────────────────────── */

function EggSVG({ wobble }: { wobble: boolean }) {
  return (
    <motion.svg
      width="110" height="130" viewBox="0 0 110 130"
      animate={wobble ? { rotate: [-6, 6, -4, 4, 0] } : { rotate: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ellipse cx="55" cy="128" rx="38" ry="7" fill="rgba(0,0,0,0.10)" />
      <ellipse cx="55" cy="70" rx="40" ry="52" fill="#FFF8E1" stroke="#F5E6C0" strokeWidth="2" />
      <ellipse cx="55" cy="70" rx="40" ry="52" fill="url(#eggGrad)" />
      <defs>
        <radialGradient id="eggGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* crack */}
      <path d="M52 46 L56 55 L50 60 L58 68" stroke="#DDD0A0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M56 55 L62 51" stroke="#DDD0A0" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* ? */}
      <text x="55" y="88" textAnchor="middle" fontSize="22" fill="#CDB870" opacity="0.7">?</text>
      {/* highlight */}
      <ellipse cx="40" cy="42" rx="9" ry="14" fill="white" opacity="0.28" transform="rotate(-20 40 42)" />
    </motion.svg>
  )
}

/* ── 고양이 SVG ─────────────────────────────────────────────── */

function CatSVG({ blink, stage }: { blink: boolean; stage: AnimalStatus }) {
  const isLegend = stage === 'legend'
  const body = isLegend ? '#FFD700' : stage === 'enhanced' ? '#FF7A5A' : '#FFA07A'
  const accent = isLegend ? '#FFB800' : '#FF7F50'
  const earInner = '#FFB3C0'

  return (
    <svg width="150" height="160" viewBox="0 0 150 160">
      {/* Shadow */}
      <ellipse cx="75" cy="157" rx="50" ry="8" fill="rgba(0,0,0,0.10)" />
      {/* Tail */}
      <path d="M118 128 Q140 115 136 92 Q132 76 122 82" stroke={accent} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M118 128 Q140 115 136 92 Q132 76 122 82" stroke={body} strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="75" cy="120" rx="46" ry="38" fill={body} stroke={accent} strokeWidth="1.5" />
      <ellipse cx="75" cy="120" rx="30" ry="24" fill="white" opacity="0.38" />
      {/* Left ear */}
      <polygon points="38,42 24,8 54,38" fill={body} stroke={accent} strokeWidth="1.5" />
      <polygon points="40,39 29,15 51,36" fill={earInner} />
      {/* Right ear */}
      <polygon points="112,42 126,8 96,38" fill={body} stroke={accent} strokeWidth="1.5" />
      <polygon points="110,39 121,15 99,36" fill={earInner} />
      {/* Head */}
      <circle cx="75" cy="67" r="40" fill={body} stroke={accent} strokeWidth="1.5" />
      {/* Cheeks */}
      <ellipse cx="47" cy="75" rx="12" ry="8" fill="#FFB3A0" opacity="0.45" />
      <ellipse cx="103" cy="75" rx="12" ry="8" fill="#FFB3A0" opacity="0.45" />
      {/* Eyes */}
      {blink ? (
        <>
          <path d="M55 62 Q64 57 73 62" stroke="#333" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M77 62 Q86 57 95 62" stroke="#333" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="64" cy="63" r="11" fill="#1A1A2E" />
          <circle cx="86" cy="63" r="11" fill="#1A1A2E" />
          <circle cx="67.5" cy="59" r="4" fill="white" />
          <circle cx="89.5" cy="59" r="4" fill="white" />
          <circle cx="61.5" cy="66" r="2" fill="white" opacity="0.4" />
          <circle cx="83.5" cy="66" r="2" fill="white" opacity="0.4" />
          {isLegend && <circle cx="64" cy="63" r="5" fill="#9B59B6" opacity="0.5" />}
          {isLegend && <circle cx="86" cy="63" r="5" fill="#9B59B6" opacity="0.5" />}
        </>
      )}
      {/* Nose */}
      <path d="M69 77 L75 73 L81 77 L75 80 Z" fill="#FF8BAE" />
      {/* Mouth */}
      <path d="M69 80 Q75 86 81 80" stroke="#FF8BAE" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Whiskers */}
      <line x1="22" y1="73" x2="60" y2="73" stroke="#C8A080" strokeWidth="1.1" opacity="0.6" />
      <line x1="22" y1="79" x2="60" y2="77" stroke="#C8A080" strokeWidth="1.1" opacity="0.6" />
      <line x1="90" y1="73" x2="128" y2="73" stroke="#C8A080" strokeWidth="1.1" opacity="0.6" />
      <line x1="90" y1="77" x2="128" y2="79" stroke="#C8A080" strokeWidth="1.1" opacity="0.6" />
      {/* Front paws */}
      <ellipse cx="52" cy="146" rx="20" ry="11" fill={body} stroke={accent} strokeWidth="1.2" />
      <ellipse cx="98" cy="146" rx="20" ry="11" fill={body} stroke={accent} strokeWidth="1.2" />
      {[44, 52, 60].map((x, i) => (
        <line key={i} x1={x} y1="141" x2={x} y2="151" stroke={accent} strokeWidth="1" opacity="0.45" />
      ))}
      {[90, 98, 106].map((x, i) => (
        <line key={i} x1={x} y1="141" x2={x} y2="151" stroke={accent} strokeWidth="1" opacity="0.45" />
      ))}
      {isLegend && (
        <text x="75" y="22" textAnchor="middle" fontSize="20">👑</text>
      )}
    </svg>
  )
}

/* ── 강아지 SVG ─────────────────────────────────────────────── */

function DogSVG({ blink, stage }: { blink: boolean; stage: AnimalStatus }) {
  const isLegend = stage === 'legend'
  const body = isLegend ? '#FFD700' : '#F5F5F0'
  const border = isLegend ? '#CCAA00' : '#DCDCD0'
  const belly = isLegend ? '#FFECB0' : 'white'

  return (
    <svg width="150" height="160" viewBox="0 0 150 160">
      {/* Shadow */}
      <ellipse cx="75" cy="157" rx="50" ry="8" fill="rgba(0,0,0,0.10)" />
      {/* Ears (behind head) */}
      <ellipse cx="38" cy="58" rx="18" ry="26" fill={border} transform="rotate(-12 38 58)" />
      <ellipse cx="112" cy="58" rx="18" ry="26" fill={border} transform="rotate(12 112 58)" />
      <ellipse cx="38" cy="58" rx="13" ry="20" fill={body} opacity="0.7" transform="rotate(-12 38 58)" />
      <ellipse cx="112" cy="58" rx="13" ry="20" fill={body} opacity="0.7" transform="rotate(12 112 58)" />
      {/* Body */}
      <ellipse cx="75" cy="118" rx="46" ry="38" fill={body} stroke={border} strokeWidth="1.5" />
      <ellipse cx="75" cy="118" rx="30" ry="24" fill={belly} opacity="0.55" />
      {/* Fluffy texture */}
      <circle cx="55" cy="105" r="14" fill="white" opacity="0.28" />
      <circle cx="95" cy="108" r="14" fill="white" opacity="0.28" />
      <circle cx="75" cy="98" r="12" fill="white" opacity="0.28" />
      {/* Head */}
      <circle cx="75" cy="65" r="42" fill={body} stroke={border} strokeWidth="1.5" />
      {/* Fluffy head texture */}
      <circle cx="55" cy="52" r="12" fill="white" opacity="0.25" />
      <circle cx="95" cy="52" r="12" fill="white" opacity="0.25" />
      <circle cx="75" cy="44" r="10" fill="white" opacity="0.25" />
      {/* Cheeks */}
      <ellipse cx="44" cy="72" rx="13" ry="9" fill="#FFB3A0" opacity="0.4" />
      <ellipse cx="106" cy="72" rx="13" ry="9" fill="#FFB3A0" opacity="0.4" />
      {/* Snout */}
      <ellipse cx="75" cy="78" rx="18" ry="12" fill={belly} opacity="0.7" />
      {/* Nose */}
      <ellipse cx="75" cy="73" rx="8" ry="5.5" fill="#333" />
      <ellipse cx="73" cy="71" rx="2.5" ry="1.8" fill="white" opacity="0.5" />
      {/* Eyes */}
      {blink ? (
        <>
          <path d="M56 58 Q64 52 72 58" stroke="#333" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M78 58 Q86 52 94 58" stroke="#333" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="64" cy="59" r="11" fill="#1A1A0E" />
          <circle cx="86" cy="59" r="11" fill="#1A1A0E" />
          <circle cx="67.5" cy="55" r="4" fill="white" />
          <circle cx="89.5" cy="55" r="4" fill="white" />
          <circle cx="61.5" cy="62" r="2" fill="white" opacity="0.4" />
          <circle cx="83.5" cy="62" r="2" fill="white" opacity="0.4" />
          {isLegend && <circle cx="64" cy="59" r="5" fill="#27AE60" opacity="0.5" />}
          {isLegend && <circle cx="86" cy="59" r="5" fill="#27AE60" opacity="0.5" />}
        </>
      )}
      {/* Mouth */}
      <path d="M68 82 Q75 88 82 82" stroke="#666" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Front paws */}
      <ellipse cx="52" cy="146" rx="22" ry="12" fill={body} stroke={border} strokeWidth="1.2" />
      <ellipse cx="98" cy="146" rx="22" ry="12" fill={body} stroke={border} strokeWidth="1.2" />
      {/* Tail */}
      <path d="M120 130 Q138 118 130 104" stroke={border} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M120 130 Q138 118 130 104" stroke={body} strokeWidth="7" fill="none" strokeLinecap="round" />
      {isLegend && (
        <text x="75" y="20" textAnchor="middle" fontSize="20">👑</text>
      )}
    </svg>
  )
}

/* ── 토끼 SVG ────────────────────────────────────────────────── */

function RabbitSVG({ blink, stage }: { blink: boolean; stage: AnimalStatus }) {
  const isLegend = stage === 'legend'
  const body = isLegend ? '#FFD700' : '#F0EEFF'
  const border = isLegend ? '#CCAA00' : '#D8D0F0'
  const earInner = '#FFB3CE'
  const eyeColor = isLegend ? '#E74C3C' : '#2C1A1A'

  return (
    <svg width="150" height="175" viewBox="0 0 150 175">
      {/* Shadow */}
      <ellipse cx="75" cy="172" rx="50" ry="7" fill="rgba(0,0,0,0.10)" />
      {/* Ears */}
      <ellipse cx="52" cy="30" rx="16" ry="36" fill={border} />
      <ellipse cx="98" cy="30" rx="16" ry="36" fill={border} />
      <ellipse cx="52" cy="30" rx="9" ry="28" fill={earInner} />
      <ellipse cx="98" cy="30" rx="9" ry="28" fill={earInner} />
      {/* Body */}
      <ellipse cx="75" cy="128" rx="46" ry="40" fill={body} stroke={border} strokeWidth="1.5" />
      <ellipse cx="75" cy="128" rx="30" ry="26" fill="white" opacity="0.5" />
      {/* Cotton tail */}
      <circle cx="120" cy="140" r="12" fill="white" stroke={border} strokeWidth="1" />
      <circle cx="120" cy="140" r="8" fill="white" />
      {/* Head */}
      <circle cx="75" cy="74" r="40" fill={body} stroke={border} strokeWidth="1.5" />
      {/* Cheeks */}
      <ellipse cx="46" cy="82" rx="13" ry="9" fill="#FFB3CE" opacity="0.42" />
      <ellipse cx="104" cy="82" rx="13" ry="9" fill="#FFB3CE" opacity="0.42" />
      {/* Eyes */}
      {blink ? (
        <>
          <path d="M55 68 Q64 62 73 68" stroke="#333" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M77 68 Q86 62 95 68" stroke="#333" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="64" cy="69" r="11" fill={eyeColor} />
          <circle cx="86" cy="69" r="11" fill={eyeColor} />
          <circle cx="67.5" cy="65" r="4" fill="white" />
          <circle cx="89.5" cy="65" r="4" fill="white" />
          <circle cx="61.5" cy="72" r="2" fill="white" opacity="0.4" />
          <circle cx="83.5" cy="72" r="2" fill="white" opacity="0.4" />
        </>
      )}
      {/* Nose */}
      <ellipse cx="75" cy="82" rx="4" ry="3" fill="#FF8BAE" />
      {/* Mouth */}
      <path d="M70 85 Q75 90 80 85" stroke="#CC7799" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Front paws */}
      <ellipse cx="52" cy="158" rx="20" ry="11" fill={body} stroke={border} strokeWidth="1.2" />
      <ellipse cx="98" cy="158" rx="20" ry="11" fill={body} stroke={border} strokeWidth="1.2" />
      {isLegend && (
        <text x="75" y="18" textAnchor="middle" fontSize="20">👑</text>
      )}
    </svg>
  )
}

/* ── 쿠션 ────────────────────────────────────────────────────── */

function Cushion({ color = '#FFB3D9' }: { color?: string }) {
  return (
    <div style={{ position: 'relative', width: 170, height: 54, flexShrink: 0 }}>
      {/* 쿠션 shadow */}
      <div style={{
        position: 'absolute', bottom: -6, left: 10, right: 10, height: 14,
        borderRadius: '50%', background: 'rgba(0,0,0,0.18)', filter: 'blur(5px)',
      }} />
      {/* 쿠션 body */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 38% 38%, ${color}EE 0%, ${color} 55%, ${color}CC 100%)`,
        borderRadius: '50%',
        boxShadow: `0 6px 18px rgba(0,0,0,0.22), inset 0 -5px 10px rgba(0,0,0,0.14), inset 0 4px 8px rgba(255,255,255,0.35)`,
      }} />
      {/* 쿠션 highlight */}
      <div style={{
        position: 'absolute', top: 8, left: 28, width: 56, height: 18,
        borderRadius: '50%', background: 'rgba(255,255,255,0.36)', filter: 'blur(3px)',
      }} />
      {/* 쿠션 버튼 장식 */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 10, height: 10, borderRadius: '50%',
        background: `${color}CC`,
        boxShadow: `0 0 0 2px rgba(255,255,255,0.5)`,
      }} />
    </div>
  )
}

/* ── Pet Room 배경 ──────────────────────────────────────────── */

function PetRoomBackground({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', height: '290px' }}>
      {/* 방 벽 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #C8A070 0%, #C09060 40%, #A87848 100%)',
      }} />
      {/* 나무 판자 패턴 */}
      {[40, 95, 150, 205].map(y => (
        <div key={y} style={{
          position: 'absolute', left: 0, right: 0, top: y, height: '1px',
          background: 'rgba(0,0,0,0.12)',
        }} />
      ))}
      {/* 바닥 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '90px',
        background: 'linear-gradient(180deg, #D4A870 0%, #C09050 100%)',
        borderTop: '2px solid rgba(0,0,0,0.15)',
      }} />
      {/* 바닥 광택 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '90px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 100%)',
      }} />
      {/* 왼쪽 선반 장식 */}
      <div style={{
        position: 'absolute', left: 16, top: 22, width: 40, height: 40,
        fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
      }}>🪴</div>
      {/* 오른쪽 선인장 */}
      <div style={{
        position: 'absolute', right: 16, top: 18, width: 40, height: 48,
        fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
      }}>🌵</div>
      {/* 창문 */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 60, height: 48, borderRadius: '8px 8px 50% 50%',
        background: 'linear-gradient(180deg, #87CEEB 0%, #B0E0FF 100%)',
        border: '3px solid rgba(255,255,255,0.6)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 0 10px rgba(255,255,255,0.3)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.15)', borderRadius: 'inherit' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.5)' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.5)' }} />
      </div>
      {children}
    </div>
  )
}

/* ── 처마 (awning) ──────────────────────────────────────────── */

function Awning() {
  return (
    <div style={{ position: 'relative', overflow: 'visible', height: 44 }}>
      {/* 줄무늬 */}
      <div style={{
        height: 44,
        background: 'repeating-linear-gradient(90deg, #E53935 0px, #E53935 24px, #FFFFFF 24px, #FFFFFF 48px)',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
      }} />
      {/* 부채꼴 밑단 */}
      <div style={{
        position: 'absolute', bottom: -14, left: 0, right: 0,
        height: 16, display: 'flex', overflow: 'hidden',
      }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{
            flex: 1,
            background: '#E53935',
            borderRadius: '0 0 50% 50%',
            margin: '0 1px',
          }} />
        ))}
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────── */

export default function Animal3D({ typeId, stage, isHungry, effectiveStreak }: {
  typeId: AnimalTypeId | null
  stage: AnimalStage
  isHungry: boolean
  effectiveStreak?: number
}) {
  const [blink, setBlink] = useState(false)
  const [petCount, setPetCount] = useState(0)
  const [particles, setParticles] = useState<Particle[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isPetted, setIsPetted] = useState(false)
  const [wobble, setWobble] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const particleId = useRef(0)
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* 깜빡임 */
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 130)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  /* 쓰다듬기 횟수 불러오기 */
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    setPetCount(parseInt(localStorage.getItem(`offlo_pet_${today}`) ?? '0', 10))
  }, [])

  /* 파티클 생성 */
  const spawnParticles = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = ((e.clientX - rect.left) / rect.width) * 100
    const cy = ((e.clientY - rect.top) / rect.height) * 100
    const pool = PARTICLE_SETS[stage.status] ?? PARTICLE_SETS.growing
    const newP: Particle[] = Array.from({ length: 5 + Math.floor(Math.random() * 3) }, () => ({
      id: ++particleId.current,
      emoji: pool[Math.floor(Math.random() * pool.length)],
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 30,
    }))
    setParticles(prev => [...prev, ...newP])
    const ids = new Set(newP.map(p => p.id))
    setTimeout(() => setParticles(prev => prev.filter(p => !ids.has(p.id))), 1100)
  }, [stage.status])

  /* 쓰다듬기 핸들러 */
  const handlePet = useCallback((e: React.MouseEvent) => {
    if (!typeId && stage.status !== 'egg') return

    if (stage.status === 'egg') {
      setWobble(true)
      setTimeout(() => setWobble(false), 600)
      spawnParticles(e)
      return
    }

    setIsPetted(true)
    setTimeout(() => setIsPetted(false), 600)
    spawnParticles(e)

    /* 말풍선 */
    if (messageTimer.current) clearTimeout(messageTimer.current)
    const pool = isHungry
      ? MESSAGES.hungry
      : MESSAGES[`pet_${typeId}`] ?? MESSAGES.idle_cat
    setMessage(pickMessage(pool))
    messageTimer.current = setTimeout(() => setMessage(null), 2200)

    /* 쓰다듬기 횟수 */
    setPetCount(c => {
      const next = c + 1
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(`offlo_pet_${today}`, String(next))
      return next
    })
  }, [typeId, stage.status, isHungry, spawnParticles])

  /* 쿠션 색상 */
  const cushionColor = stage.status === 'legend' ? '#FFD000'
    : typeId === 'cat' ? '#FFB3D9'
    : typeId === 'dog' ? '#B3D9FF'
    : '#C8B3FF'

  /* 스탯 값 */
  const affection = Math.min(petCount * 12, 100)
  const mood = isHungry ? 18 : isPetted ? 100 : 70
  const health = Math.min((effectiveStreak ?? 0) / 120 * 100, 100)

  /* 동물 이름 */
  const animalName = typeId === 'cat' ? '고양이' : typeId === 'dog' ? '강아지' : typeId === 'rabbit' ? '토끼' : '알'

  /* 기본 말풍선 메시지 */
  const idleMsg = stage.status === 'egg'
    ? '알에서 깨어날 준비 중이에요...'
    : isHungry
    ? '배고파요... 오늘 AI 분석 해줘요!'
    : `${animalName}이(가) 당신을 기다리고 있어요! 탭해서 쓰다듬어 보세요`

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-card)', userSelect: 'none' }}>
      {/* 처마 */}
      <Awning />

      {/* 방 내부 */}
      <div
        ref={containerRef}
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={handlePet}
      >
        <PetRoomBackground>
          {/* 동물 + 쿠션 영역 */}
          <div style={{
            position: 'absolute', bottom: 12, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            {/* 동물 (클릭 반응 + 필터) */}
            <div style={{ position: 'relative' }}>
              {/* 말풍선 */}
              <AnimatePresence>
                {message && <SpeechBubble message={message} />}
              </AnimatePresence>

              <motion.div
                style={{
                  filter: isHungry ? 'saturate(0.35) brightness(0.75)' : 'none',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                }}
                animate={isPetted
                  ? { y: [-2, -22, -16, -20, 0], scale: [1, 1.12, 0.95, 1.06, 1] }
                  : { y: [0, -7, 0] }
                }
                transition={isPetted
                  ? { duration: 0.55, ease: 'easeOut' }
                  : { repeat: Infinity, duration: 2.6, ease: 'easeInOut' }
                }
              >
                {stage.status === 'egg' ? (
                  <EggSVG wobble={wobble} />
                ) : typeId === 'cat' ? (
                  <CatSVG blink={blink} stage={stage.status} />
                ) : typeId === 'dog' ? (
                  <DogSVG blink={blink} stage={stage.status} />
                ) : typeId === 'rabbit' ? (
                  <RabbitSVG blink={blink} stage={stage.status} />
                ) : null}
              </motion.div>
            </div>

            {/* 쿠션 */}
            {typeId && <div style={{ marginTop: -16 }}><Cushion color={cushionColor} /></div>}
          </div>

          {/* 파티클 */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <AnimatePresence>
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  style={{ position: 'absolute', fontSize: 20, left: `${p.x}%`, top: `${p.y}%` }}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -65, scale: [0.5, 1.3, 1.1, 0.9] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.0, ease: 'easeOut' }}
                >
                  {p.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </PetRoomBackground>
      </div>

      {/* 하단 정보 패널 */}
      <div style={{
        background: '#FFF9F0',
        borderTop: '2px solid rgba(0,0,0,0.08)',
        padding: '14px 20px 16px',
      }}>
        {/* 동물 이름 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold" style={{ color: '#3A2A1A' }}>
              {stage.name !== '알' ? `${animalName} · ` : ''}{stage.name}
            </span>
            {petCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(61,219,135,0.15)', color: '#2BA86A' }}>
                오늘 {petCount}번 ❤️
              </span>
            )}
          </div>
          <span className="text-xs font-bold" style={{ color: '#888' }}>
            🔥 {effectiveStreak ?? 0}일
          </span>
        </div>

        {/* 상태 메시지 */}
        <p className="text-xs mb-3 leading-relaxed" style={{ color: '#7A6050' }}>
          {idleMsg}
        </p>

        {/* 스탯 바 */}
        <div className="space-y-1.5">
          <StatBar label="친밀해요" value={affection} color="linear-gradient(90deg, #FFD700, #FFAA00)" />
          <StatBar label="기분 좋아요" value={mood} color="linear-gradient(90deg, #FF8C42, #FF5722)" />
          <StatBar label="건강해요" value={health} color="linear-gradient(90deg, #26C6DA, #0097A7)" />
        </div>
      </div>
    </div>
  )
}
